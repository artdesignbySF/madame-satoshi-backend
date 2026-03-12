require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const { drawCards, calculateFortune, generateBlockSeed } = require('../../core/fortuneLogic');
const { loadDb, saveDb, dbGet, dbSet, dbDelete, getUserBalance, updateUserBalance, getJackpot, updateJackpot, hasReceivedBonus, markBonusReceived } = require('../../core/db');
const { getLatestBlockHash, getCachedBlockInfo } = require('../../core/blockSeed');
const { createInvoice, checkInvoicePaid, transferToProfitWallet, topUpPayoutWalletReserve } = require('../../core/lnbits');
const createWithdrawalRouter = require('./withdrawalRoutes');

const app = express();
const PROFIT_AMOUNT = 4;
const MIN_JACKPOT_SEED = 500;
const PAYMENT_AMOUNT_SATS = parseInt(process.env.PAYMENT_AMOUNT_SATS || '21');
const FIRST_PLAY_BONUS_SATS = parseInt(process.env.FIRST_PLAY_BONUS_SATS || '11');
const JACKPOT_CONTRIBUTION = Math.floor(PAYMENT_AMOUNT_SATS * 0.8);

// Async DB adapter for withdrawalRoutes (which expects async db interface)
const dbAdapter = {
  get: async (key) => dbGet(key),
  set: async (key, value) => dbSet(key, value),
  delete: async (key) => dbDelete(key)
};

const config = {
  lnbitsUrl: process.env.LNBITS_URL,
  lnbitsMainInvoiceKey: process.env.LNBITS_MAIN_INVOICE_KEY,
  lnbitsMainAdminKey: process.env.LNBITS_MAIN_ADMIN_KEY,
  lnbitsPayoutAdminKey: process.env.LNBITS_PAYOUT_ADMIN_KEY,
  lnbitsProfitAdminKey: process.env.LNBITS_PROFIT_ADMIN_KEY,
  PAYMENT_AMOUNT_SATS,
  JACKPOT_CONTRIBUTION,
  MIN_JACKPOT_SEED,
  INVOICE_MEMO: 'Madame Satoshi Reading',
  LNURL_WITHDRAW_TITLE: 'Madame Satoshi Winnings',
  JACKPOT_DB_KEY: 'currentJackpotPool_v1',
  defaultPort: 3001
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// --- WebSocket ---
let clients = new Set();
function broadcastJackpotUpdate() {
  if (clients.size === 0) return;
  const message = JSON.stringify({ type: 'jackpotUpdate', amount: getJackpot() });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, err => { if (err) console.error('WS send error:', err); });
    }
  });
}

// --- Session ---
app.get('/api/session', (req, res) => {
  const id = uuidv4();
  res.json({ sessionId: id });
});

// --- Balance ---
app.get('/api/balance/:sessionId', (req, res) => {
  const id = req.params.sessionId;
  if (!id) return res.status(400).json({ error: 'ID required.' });
  res.json({ balance: getUserBalance(id) });
});

// --- Draw (Invoice Flow) ---
app.post('/api/draw', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID required.' });

  try {
    const isFirstPlay = !hasReceivedBonus(sessionId);

    if (isFirstPlay) {
      // Real random draw with 11 sat bonus
      const blockHash = await getLatestBlockHash();
      const timestamp = Date.now();
      const seed = generateBlockSeed(blockHash, sessionId, timestamp);
      const cards = drawCards(seed);

      updateJackpot(JACKPOT_CONTRIBUTION);
      updateJackpot(-FIRST_PLAY_BONUS_SATS);
      broadcastJackpotUpdate();
      const newBalance = updateUserBalance(sessionId, FIRST_PLAY_BONUS_SATS);
      markBonusReceived(sessionId);

      // Store verification data
      const db = loadDb();
      db[`draw_verify_${sessionId}`] = {
        blockHeight: getCachedBlockInfo().height,
        blockHash,
        cards: cards.map(c => c.number),
        timestamp
      };
      saveDb(db);

      const { fortune } = calculateFortune(cards, getJackpot(), MIN_JACKPOT_SEED, true);

      return res.json({
        cards,
        fortune,
        sats_won_this_round: FIRST_PLAY_BONUS_SATS,
        user_balance: newBalance,
        current_jackpot: getJackpot(),
        verify: {
          blockHeight: getCachedBlockInfo().height,
          blockHash,
          seed: generateBlockSeed(blockHash, sessionId, timestamp),
          timestamp
        }
      });
    }

    // Regular play
    updateJackpot(JACKPOT_CONTRIBUTION);
    broadcastJackpotUpdate();

    try {
      await transferToProfitWallet(PROFIT_AMOUNT, `Profit session ${sessionId.substring(0, 6)}`);
    } catch (e) {
      console.error('Profit transfer failed (non-fatal):', e.message);
    }

    const blockHash = await getLatestBlockHash();
    const timestamp = Date.now();
    const seed = generateBlockSeed(blockHash, sessionId, timestamp);
    const cards = drawCards(seed);
    const pool = getJackpot();
    let { fortune, sats_won } = calculateFortune(cards, pool, MIN_JACKPOT_SEED);

    if (sats_won > 0) {
      const actual = Math.min(sats_won, pool);
      if (actual < sats_won) fortune += ' (Pool limit reached)';
      sats_won = actual;
      updateJackpot(-sats_won);
      broadcastJackpotUpdate();
      updateUserBalance(sessionId, sats_won);
    }

    // Store verification data
    const db = loadDb();
    db[`draw_verify_${sessionId}`] = {
      blockHeight: getCachedBlockInfo().height,
      blockHash,
      cards: cards.map(c => c.number),
      timestamp
    };
    saveDb(db);

    res.json({
      cards,
      fortune,
      sats_won_this_round: sats_won,
      user_balance: getUserBalance(sessionId),
      current_jackpot: getJackpot(),
      verify: {
        blockHeight: getCachedBlockInfo().height,
        blockHash,
        seed,
        timestamp
      }
    });
  } catch (e) {
    console.error('Error in /api/draw:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error during draw.' });
  }
});

// --- Draw from Balance ---
app.post('/api/draw-from-balance', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID required.' });

  try {
    const balance = getUserBalance(sessionId);
    if (balance < PAYMENT_AMOUNT_SATS) {
      return res.status(400).json({ error: `Insufficient balance. Requires ${PAYMENT_AMOUNT_SATS} sats.` });
    }

    updateUserBalance(sessionId, -PAYMENT_AMOUNT_SATS);
    updateJackpot(JACKPOT_CONTRIBUTION);
    broadcastJackpotUpdate();

    const blockHash = await getLatestBlockHash();
    const timestamp = Date.now();
    const seed = generateBlockSeed(blockHash, sessionId, timestamp);
    const cards = drawCards(seed);
    const pool = getJackpot();
    let { fortune, sats_won } = calculateFortune(cards, pool, MIN_JACKPOT_SEED);

    if (sats_won > 0) {
      const actual = Math.min(sats_won, pool);
      if (actual < sats_won) fortune += ' (Pool limit reached)';
      sats_won = actual;
      updateJackpot(-sats_won);
      broadcastJackpotUpdate();
      updateUserBalance(sessionId, sats_won);
    }

    const db = loadDb();
    db[`draw_verify_${sessionId}`] = {
      blockHeight: getCachedBlockInfo().height,
      blockHash,
      cards: cards.map(c => c.number),
      timestamp
    };
    saveDb(db);

    res.json({
      cards,
      fortune,
      sats_won_this_round: sats_won,
      user_balance: getUserBalance(sessionId),
      current_jackpot: getJackpot(),
      verify: {
        blockHeight: getCachedBlockInfo().height,
        blockHash,
        seed,
        timestamp
      }
    });
  } catch (e) {
    console.error('Error in /api/draw-from-balance:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error during draw from balance.' });
  }
});

// --- Create Invoice (Play) ---
app.post('/api/create-invoice', async (req, res) => {
  try {
    const { hash, bolt11 } = await createInvoice(PAYMENT_AMOUNT_SATS, config.INVOICE_MEMO);
    res.json({ payment_hash: hash, payment_request: bolt11 });
  } catch (e) {
    console.error('Error creating invoice:', e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create invoice.' });
  }
});

// --- Check Invoice (Play) ---
app.get('/api/check-invoice/:payment_hash', async (req, res) => {
  try {
    const paid = await checkInvoicePaid(req.params.payment_hash);
    res.json({ paid });
  } catch (e) {
    console.error('Error checking invoice:', e.message);
    res.status(503).json({ paid: false, error: 'Failed to check invoice.' });
  }
});

// --- Create Deposit Invoice (Custom Amount) ---
app.post('/api/create-deposit-invoice', async (req, res) => {
  const { amount, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID required.' });
  const depositSats = parseInt(amount);
  if (isNaN(depositSats) || depositSats <= 0) return res.status(400).json({ error: 'Invalid deposit amount.' });

  try {
    const memo = `Deposit ${depositSats} sats (Session: ${sessionId.substring(0, 6)})`;
    const { hash, bolt11 } = await createInvoice(depositSats, memo);
    res.json({ payment_hash: hash, payment_request: bolt11, amount: depositSats });
  } catch (e) {
    console.error('Error creating deposit invoice:', e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create deposit invoice.' });
  }
});

// --- Check Deposit Invoice ---
app.get('/api/check-deposit-invoice/:payment_hash', async (req, res) => {
  try {
    const paid = await checkInvoicePaid(req.params.payment_hash);
    res.json({ paid });
  } catch (e) {
    console.error('Error checking deposit invoice:', e.message);
    res.status(503).json({ paid: false, error: 'Failed to check deposit invoice.' });
  }
});

// --- Confirm Deposit Payment ---
app.post('/api/confirm-deposit-payment', async (req, res) => {
  const { sessionId, paymentHash, amount } = req.body;
  if (!sessionId || !paymentHash || !amount) return res.status(400).json({ error: 'Missing required fields.' });

  const clientSats = parseInt(amount);
  if (isNaN(clientSats) || clientSats <= 0) return res.status(400).json({ error: 'Invalid amount.' });

  try {
    const paid = await checkInvoicePaid(paymentHash);
    if (!paid) throw new Error('Payment not confirmed by LNbits.');

    const newBalance = updateUserBalance(sessionId, clientSats);
    res.json({ success: true, newBalance, paid_sats: clientSats });
  } catch (e) {
    console.error('Error confirming deposit:', e.message);
    res.status(500).json({ error: e.message || 'Failed to confirm deposit.' });
  }
});

// --- Verify Draw ---
app.get('/api/verify/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const draw = dbGet(`draw_verify_${sessionId}`);
  if (!draw) return res.status(404).json({ error: 'No draws found for this session.' });

  const seed = generateBlockSeed(draw.blockHash, sessionId, draw.timestamp);
  res.json({
    blockHeight: draw.blockHeight,
    blockHash: draw.blockHash,
    seed,
    cards: draw.cards,
    timestamp: draw.timestamp,
    mempoolUrl: `https://mempool.space/block/${draw.blockHash}`
  });
});

// --- Jackpot ---
app.get('/api/jackpot', (req, res) => {
  res.json({ jackpot: getJackpot() });
});

// --- Ping ---
app.get('/ping', (req, res) => res.send('pong'));

// --- Withdrawal Routes ---
app.use('/api', createWithdrawalRouter(dbAdapter, config));

// --- Catch-all ---
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) return next();
  res.sendFile(path.resolve(__dirname, 'frontend', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Madame Satoshi Web Server listening on port ${PORT}`);
  if (getJackpot() <= 0) {
    updateJackpot(MIN_JACKPOT_SEED);
    console.log(`Jackpot seeded: ${MIN_JACKPOT_SEED} sats`);
  }
});

// --- WebSocket Server ---
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`WS Client connected. Total: ${clients.size}`);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'jackpotUpdate', amount: getJackpot() }));
  }
  ws.on('close', () => { clients.delete(ws); });
  ws.on('error', () => { clients.delete(ws); });
});

process.on('SIGINT', () => {
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});

module.exports = { app, broadcastJackpotUpdate };