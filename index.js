require('dotenv').config();
const { getLatestBlockHash } = require('./core/blockSeed');
const { getJackpot, updateJackpot } = require('./core/db');
const { topUpPayoutWalletReserve, drainExcessPayoutWallet } = require('./core/lnbits');

const MIN_JACKPOT_SEED = 500;

async function startup() {
  console.log('🔮 Madame Satoshi Backend starting...');

  // STEP 4: Validate environment variables
  const required = [
    'LNBITS_MAIN_ADMIN_KEY',
    'LNBITS_MAIN_INVOICE_KEY',
    'LNBITS_PAYOUT_ADMIN_KEY',
    'TELEGRAM_BOT_TOKEN',
    'MEMPOOL_API_URL'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  // Seed jackpot if empty
  if (getJackpot() <= 0) {
    updateJackpot(MIN_JACKPOT_SEED);
    console.log(`Jackpot seeded: ${MIN_JACKPOT_SEED} sats`);
  }

  // Check payout wallet reserve
  console.log('Checking payout wallet reserve...');
  await topUpPayoutWalletReserve();

  // STEP 5: Drain excess from payout wallet
  console.log('Checking for excess in payout wallet...');
  await drainExcessPayoutWallet();

  // Fetch latest block hash
  console.log('Fetching latest block hash...');
  await getLatestBlockHash();

  // Start Telegram bot
  console.log('Starting Telegram bot...');
  require('./interfaces/telegram/bot');

  // Start web server
  console.log('Starting web server...');
  require('./interfaces/web/server');

  // STEP 6: Periodic payout wallet check every 30 minutes
  setInterval(async () => {
    console.log('📊 Running periodic payout wallet check...');
    await topUpPayoutWalletReserve();
    await drainExcessPayoutWallet();
  }, 30 * 60 * 1000);

  console.log('✅ Madame Satoshi Backend ready!');
}

startup().catch(e => {
  console.error('Startup failed:', e);
  process.exit(1);
});