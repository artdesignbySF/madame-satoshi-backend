require('dotenv').config();
const { getLatestBlockHash } = require('./core/blockSeed');
const { getJackpot, updateJackpot } = require('./core/db');
const { topUpPayoutWalletReserve } = require('./core/lnbits');

const MIN_JACKPOT_SEED = 500;

async function startup() {
  console.log('🔮 Madame Satoshi Backend starting...');

  // Seed jackpot if empty
  if (getJackpot() <= 0) {
    updateJackpot(MIN_JACKPOT_SEED);
    console.log(`Jackpot seeded: ${MIN_JACKPOT_SEED} sats`);
  }

  // Check payout wallet reserve
  console.log('Checking payout wallet reserve...');
  await topUpPayoutWalletReserve();

  // Fetch latest block hash
  console.log('Fetching latest block hash...');
  await getLatestBlockHash();

  // Start Telegram bot
  console.log('Starting Telegram bot...');
  require('./interfaces/telegram/bot');

  // Start web server
  console.log('Starting web server...');
  require('./interfaces/web/server');
}

startup().catch(e => {
  console.error('Startup failed:', e);
  process.exit(1);
});