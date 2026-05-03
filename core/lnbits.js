const axios = require('axios');

const LNBITS_URL = process.env.LNBITS_INTERNAL_URL || process.env.LNBITS_URL;
const LNBITS_MAIN_INVOICE_KEY = process.env.LNBITS_MAIN_INVOICE_KEY;
const LNBITS_MAIN_ADMIN_KEY = process.env.LNBITS_MAIN_ADMIN_KEY;
const LNBITS_PAYOUT_ADMIN_KEY = process.env.LNBITS_PAYOUT_ADMIN_KEY;
const LNBITS_PROFIT_ADMIN_KEY = process.env.LNBITS_PROFIT_ADMIN_KEY;

const PAYOUT_RESERVE_SATS = 100;

let payoutWalletBusy = false;

async function createInvoice(amountSats, memo) {
  const res = await axios.post(`${LNBITS_URL}/api/v1/payments`,
    { out: false, amount: amountSats, memo },
    { headers: { 'X-Api-Key': LNBITS_MAIN_ADMIN_KEY }, timeout: 15000 });
  if (!res.data?.payment_hash || !res.data?.payment_request)
    throw new Error('Bad LNbits invoice response');
  return { hash: res.data.payment_hash, bolt11: res.data.payment_request };
}

async function checkInvoicePaid(hash) {
  const res = await axios.get(`${LNBITS_URL}/api/v1/payments/${hash}`,
    { headers: { 'X-Api-Key': LNBITS_MAIN_INVOICE_KEY }, timeout: 10000 });
  return res.data?.paid === true;
}

async function transferToProfitWallet(amount, memo) {
  if (!LNBITS_PROFIT_ADMIN_KEY || amount <= 0) return;
  try {
    const inv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: false, amount, memo },
      { headers: { 'X-Api-Key': LNBITS_PROFIT_ADMIN_KEY }, timeout: 15000 });
    await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: true, bolt11: inv.data.payment_request },
      { headers: { 'X-Api-Key': LNBITS_MAIN_ADMIN_KEY }, timeout: 45000 });
  } catch (e) {
    console.error('Profit transfer failed (non-fatal):', e.message);
  }
}

async function getPayoutWalletBalance() {
  try {
    const res = await axios.get(`${LNBITS_URL}/api/v1/wallet`,
      { headers: { 'X-Api-Key': LNBITS_PAYOUT_ADMIN_KEY }, timeout: 10000 });
    return Math.max(0, Math.floor(res.data?.balance || 0) / 1000);
  } catch (e) {
    console.error('Failed to check payout wallet balance:', e.message);
    return null;
  }
}

async function topUpPayoutWalletReserve() {
  if (payoutWalletBusy) { console.log('Payout wallet operation already in progress, skipping.'); return; }
  payoutWalletBusy = true;
  try {
    const balance = await getPayoutWalletBalance();
    if (balance === null) {
      console.warn('Could not check payout wallet balance, skipping reserve top-up');
      return;
    }
    console.log(`Payout wallet balance: ${balance.toFixed(3)} sats`);
    if (balance < PAYOUT_RESERVE_SATS) {
      const shortfall = Math.ceil(PAYOUT_RESERVE_SATS - balance);
      if (shortfall >= 1) {
        console.log(`Topping up payout wallet: ${shortfall} sats`);
        const inv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
          { out: false, amount: shortfall, memo: 'Reserve top-up' },
          { headers: { 'X-Api-Key': LNBITS_PAYOUT_ADMIN_KEY }, timeout: 15000 });
        await axios.post(`${LNBITS_URL}/api/v1/payments`,
          { out: true, bolt11: inv.data.payment_request },
          { headers: { 'X-Api-Key': LNBITS_MAIN_ADMIN_KEY }, timeout: 45000 });
        console.log('Payout wallet reserve top-up successful');
      }
    }
  } catch (e) {
    console.warn(`Payout wallet reserve top-up failed (non-fatal): ${e.message}`);
  } finally {
    payoutWalletBusy = false;
  }
}

async function drainExcessPayoutWallet() {
    if (payoutWalletBusy) { console.log('Payout wallet operation already in progress, skipping.'); return; }
    payoutWalletBusy = true;
    try {
        const balance = await getPayoutWalletBalance();
        if (balance === null) return;
        const excess = Math.floor(balance - PAYOUT_RESERVE_SATS);
        if (excess < 10) return; // Only drain if meaningful excess
        console.log(`Draining excess payout wallet: ${excess} sats back to main`);
        const inv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
            { out: false, amount: excess, memo: 'Drain excess payout to main' },
            { headers: { 'X-Api-Key': LNBITS_MAIN_ADMIN_KEY }, timeout: 15000 });
        await axios.post(`${LNBITS_URL}/api/v1/payments`,
            { out: true, bolt11: inv.data.payment_request },
            { headers: { 'X-Api-Key': LNBITS_PAYOUT_ADMIN_KEY }, timeout: 45000 });
        console.log(`Drained ${excess} sats from payout wallet to main.`);
    } catch (e) {
        console.warn(`Payout wallet drain failed (non-fatal): ${e.message}`);
    } finally {
        payoutWalletBusy = false;
    }
}

module.exports = {
  createInvoice,
  checkInvoicePaid,
  transferToProfitWallet,
  getPayoutWalletBalance,
  topUpPayoutWalletReserve,
  drainExcessPayoutWallet,
  PAYOUT_RESERVE_SATS
};