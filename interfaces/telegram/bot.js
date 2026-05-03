require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const QRCode = require("qrcode");
const sharp = require("sharp");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { drawCards, calculateFortune, generateBlockSeed } = require("../../core/fortuneLogic.js");

// Setup FFmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// --- Config ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const LNBITS_URL = process.env.LNBITS_URL;
const LNBITS_MAIN_INVOICE_KEY = process.env.LNBITS_MAIN_INVOICE_KEY;
const LNBITS_MAIN_ADMIN_KEY = process.env.LNBITS_MAIN_ADMIN_KEY;
const LNBITS_PAYOUT_ADMIN_KEY = process.env.LNBITS_PAYOUT_ADMIN_KEY;
const LNBITS_PAYOUT_WALLET_ID = process.env.LNBITS_PAYOUT_WALLET_ID;
const LNBITS_PROFIT_ADMIN_KEY = process.env.LNBITS_PROFIT_ADMIN_KEY;
const PAYMENT_AMOUNT_SATS = parseInt(process.env.PAYMENT_AMOUNT_SATS || "21");
const JACKPOT_CONTRIBUTION = Math.floor(PAYMENT_AMOUNT_SATS * 0.8);
const MIN_JACKPOT_SEED = 500;
const PROFIT_AMOUNT = 4;
const JACKPOT_DB_KEY = "currentJackpotPool_v1";
const STICKER_SET_NAME = "BitcoinTarot";
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const MEMPOOL_URL = process.env.MEMPOOL_API_URL || "http://localhost:8081";

// Map card number (from fortuneLogic.js) → Telegram sticker file_ids.
const STICKER_MAP = {
  "00":   "CAACAgQAAxUAAWmpuDoOP5TtKg_oUKJq1_QqAt0SAALNGgAClqxpU4mBShvbc2lmOgQ",
  "I":    "CAACAgQAAxUAAWmpuDr1EIZKvmVd7VaDVyZEVrPpAALoFgACETFpU3wCaBr8oBP2OgQ",
  "II":   "CAACAgQAAxUAAWmpuDqa48j1xD-SRic3H6nxoPqDAAISHAACGuloU4uabgMUnqr0OgQ",
  "III":  "CAACAgQAAxUAAWmpuDp5B3jLWVK5n8fKyF7BctfwAAJ5FgACZwpoU0NJrKFAIAixOgQ",
  "IV":   "CAACAgQAAxUAAWmpuDoWsPAkGqixY7L80eiyIH25AAI3GwACZ5doU14K9bavHxNROgQ",
  "V":    "CAACAgQAAxUAAWmpuDp45uNvwS--bGziKYYcRpe_AAJIGAACIK5oU0DfDjmI-qM_OgQ",
  "VI":   "CAACAgQAAxUAAWmpuDrDxfaxESXefwn29sW3vmGbAALnGQACBvdpUyzP57nXW6yBOgQ",
  "VII":  "CAACAgQAAxUAAWmpuDohBUdKZBfBHz8hL6Kz1MgrAAKuFgACzIZoUyhA9cdSijkwOgQ",
  "VIII": "CAACAgQAAxUAAWmpuDpiM8-Dhy0BvgwtwcQrtbJTAAJcFgACMQdpU9om-5uyH5LJOgQ",
  "IX":   "CAACAgQAAxUAAWmpuDrTsTG2Ti2xwJD0HRWS6OgZAAKCFgAC2UloU6ti7mGF0yZaOgQ",
  "X":    "CAACAgQAAxUAAWmpuDpsSzrNrxyhDxo-TTz4R5xSAALyFQAC_YVoUz-U0DDxZypzOgQ",
  "XI":   "CAACAgQAAxUAAWmpuDqi_l9QZ8hMln8D5p_woPMKAALxGAACcbhoU8_uWTSnZzQ9OgQ",
  "XII":  "CAACAgQAAxUAAWmpuDqbcZvbijDdHroAAXQ7u-OcXgACcBUAAvP8aFO3tLOV7gaXnjoE",
  "XIII": "CAACAgQAAxUAAWmpuDpbI-0H2a_A5BbHjTulgA_YAAIgGAACL89pU3KleApWpkVkOgQ",
  "XIV":  "CAACAgQAAxUAAWmpuDrWw4MnclT4YvBibeomR_SaAAJRGAACSYxoU5jvET1f92yCOgQ",
  "XV":   "CAACAgQAAxUAAWmpuDrNlV8UCIOa1OaGvg98TPbOAAIgIwACCIFpU3sWibFx4e3NOgQ",
  "XVI":  "CAACAgQAAxUAAWmpuDpzhD2rJoDMBJBqyXs9BwOeAAMWAAIhsGhTHsQthRmWxb86BA",
  "XVII": "CAACAgQAAxUAAWmpuDp6b0E1P6RW6vpg-PQi0uegAAKCFgACqeZpU0Ls4rXjim6AOgQ",
  "XVIII":"CAACAgQAAxUAAWmpuDrx0MpyfPIWGY-HmZ9BIaZNAAK6EwAC2rJoU_iGSBG88w5qOgQ",
  "XIX":  "CAACAgQAAxUAAWmpuDqKuqA4HgILvCCfSKk6HguOAALwFgACD31oU1-OP6XRU6IBOgQ",
  "XX":   "CAACAgQAAxUAAWmpuDq-o5mCM48EhITa-OOwntO8AALeGAACdwtpU9khuYtwt7b8OgQ",
  "XXI":  "CAACAgQAAxUAAWmpuDo55y0lyV6Bdz9W9V4RWEPYAAKLFwACvPBoU36CrJiKULkkOgQ",
};

if (!BOT_TOKEN) { console.error("MISSING: TELEGRAM_BOT_TOKEN"); process.exit(1); }
if (!LNBITS_URL || !LNBITS_MAIN_INVOICE_KEY) { console.error("MISSING: LNbits config"); process.exit(1); }

// --- Simple JSON file DB ---
const DB_FILE = "./db.json";
function loadDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch { return {}; }
}
function saveDb(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
function dbGet(key) { return loadDb()[key] ?? null; }
function dbSet(key, value) { const d = loadDb(); d[key] = value; saveDb(d); }
function dbDelete(key) { const d = loadDb(); delete d[key]; saveDb(d); }

// --- DB Helpers ---
function getUserBalance(userId) { return Math.max(0, parseInt(dbGet(`balance_${userId}`) || 0)); }
function updateUserBalance(userId, amount) {
  const next = Math.max(0, getUserBalance(userId) + Math.floor(amount));
  dbSet(`balance_${userId}`, next); return next;
}
function getJackpot() { return Math.max(0, parseInt(dbGet(JACKPOT_DB_KEY) || 0)); }
function updateJackpot(amount) {
  const next = Math.max(0, getJackpot() + Math.floor(amount));
  dbSet(JACKPOT_DB_KEY, next); return next;
}
function hasReceivedBonus(userId) { return dbGet(`bonus_given_${userId}`) === true; }
function markBonusReceived(userId) { dbSet(`bonus_given_${userId}`, true); }

if (getJackpot() <= 0) { updateJackpot(MIN_JACKPOT_SEED); console.log(`Jackpot seeded: ${MIN_JACKPOT_SEED} sats`); }

// --- Block Hash Fetching ---
let cachedBlockInfo = { height: null, hash: null, timestamp: null };

async function getLatestBlockHash() {
  try {
    const url = MEMPOOL_URL + '/api/blocks/tip/hash';
    console.log(`Fetching block hash from: ${url}`);
    const [hashRes, heightRes] = await Promise.all([
      axios.get(url, { timeout: 5000 }),
      axios.get(MEMPOOL_URL + '/api/blocks/tip/height', { timeout: 5000 })
    ]);
    const hash = hashRes.data.trim();
    const height = heightRes.data;
    console.log(`Block hash fetched: #${height} ${hash}`);
    cachedBlockInfo = { hash, height, timestamp: Date.now() };
    return hash;
  } catch (error) {
    console.log(`Block hash fetch failed: ${error.message}`);
    return null;
  }
}

// --- Bot ---
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize payout wallet reserve and cache block hash on startup
(async () => {
  console.log("Checking payout wallet reserve...");
  await topUpPayoutWalletReserve();
  console.log("Fetching latest block hash...");
  await getLatestBlockHash();
})().catch(e => console.error("Startup check failed:", e));
const pendingInvoices = {};
const awaitingDepositAmount = new Set();
const awaitingWithdrawInvoice = new Set();
const activeDraws = new Set();

// --- LNbits ---
async function createInvoice(amountSats, memo) {
  const res = await axios.post(`${LNBITS_URL}/api/v1/payments`,
    { out: false, amount: amountSats, memo },
    { headers: { "X-Api-Key": LNBITS_MAIN_INVOICE_KEY }, timeout: 15000 });
  if (!res.data?.payment_hash || !res.data?.payment_request) throw new Error("Bad LNbits invoice response");
  return { hash: res.data.payment_hash, bolt11: res.data.payment_request };
}

async function checkInvoicePaid(hash) {
  const res = await axios.get(`${LNBITS_URL}/api/v1/payments/${hash}`,
    { headers: { "X-Api-Key": LNBITS_MAIN_INVOICE_KEY }, timeout: 10000 });
  return res.data?.paid === true;
}

async function transferToProfitWallet(amount, memo) {
  if (!LNBITS_PROFIT_ADMIN_KEY || amount <= 0) return;
  try {
    const inv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: false, amount, memo },
      { headers: { "X-Api-Key": LNBITS_PROFIT_ADMIN_KEY }, timeout: 15000 });
    await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: true, bolt11: inv.data.payment_request },
      { headers: { "X-Api-Key": LNBITS_MAIN_ADMIN_KEY }, timeout: 45000 });
  } catch (e) { console.error("Profit transfer failed (non-fatal):", e.message); }
}

// --- Payout Wallet Reserve Management ---
const PAYOUT_RESERVE_SATS = 100;

async function getPayoutWalletBalance() {
  try {
    const res = await axios.get(`${LNBITS_URL}/api/v1/wallet`,
      { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 10000 });
    return Math.max(0, Math.floor(res.data?.balance || 0) / 1000);
  } catch (e) {
    console.error("Failed to check payout wallet balance:", e.message);
    return null;
  }
}

async function topUpPayoutWalletReserve() {
  try {
    const balance = await getPayoutWalletBalance();
    if (balance === null) {
      console.warn("Could not check payout wallet balance, skipping reserve top-up");
      return;
    }
    console.log(`Payout wallet balance: ${balance.toFixed(3)} sats`);
    if (balance < PAYOUT_RESERVE_SATS) {
      const shortfall = Math.ceil(PAYOUT_RESERVE_SATS - balance);
      console.log(`Payout reserve below target. Current: ${balance.toFixed(3)} sats, shortfall: ${shortfall} sats (rounded up)`);
      if (shortfall >= 1) {
        console.log(`Topping up payout wallet: funding ${shortfall} sats to reach ${PAYOUT_RESERVE_SATS} sats`);
        const inv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
          { out: false, amount: shortfall, memo: "Reserve top-up" },
          { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 15000 });
        await axios.post(`${LNBITS_URL}/api/v1/payments`,
          { out: true, bolt11: inv.data.payment_request },
          { headers: { "X-Api-Key": LNBITS_MAIN_ADMIN_KEY }, timeout: 45000 });
        console.log(`Payout wallet reserve top-up successful`);
      } else {
        console.log(`Reserve shortfall < 1 sat, skipping top-up (reserve close enough to target)`);
      }
    }
  } catch (e) {
    console.warn(`Payout wallet reserve top-up failed (non-fatal): ${e.message}`);
  }
}

// --- Keyboards ---
function mainKeyboard(userId) {
  const balance = getUserBalance(userId);
  const drawLabel = balance >= PAYMENT_AMOUNT_SATS
    ? `🔮 Your Fortune (${balance} sats)`
    : `🔮 Your Fortune (${PAYMENT_AMOUNT_SATS} sats)`;
  return { inline_keyboard: [
    [{ text: drawLabel, callback_data: "draw" }],
    [{ text: "⚡ Deposit Sats", callback_data: "deposit" }, { text: "💸 Withdraw", callback_data: "withdraw" }],
    [{ text: "🎰 Status", callback_data: "status" }, { text: "❓ Help", callback_data: "help" }]
  ]};
}

// --- Composite Draw Image ---
const BASE_IMAGE = '/home/nrfm/BitcoinTarotBot/madame-satoshi.png';
const CARD_SIZE = 630;
const CARD_POSITIONS = [
  { left: 80,  top: 850 },
  { left: 520, top: 850 },
  { left: 960, top: 850 },
];

async function compositeDrawImage(cardNumbers, userId) {
  const timestamp = Date.now();
  const outPath = `/tmp/draw_${userId}_${timestamp}.jpg`;
  const tmpFiles = [];
  try {
    const composites = [];
    for (let i = 0; i < cardNumbers.length; i++) {
      const fileId = STICKER_MAP[cardNumbers[i]];
      const tmpPath = `/tmp/card_${userId}_${timestamp}_${i}.webp`;
      tmpFiles.push(tmpPath);
      const file = await bot.getFile(fileId);
      const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      fs.writeFileSync(tmpPath, Buffer.from(resp.data));
      const resized = await sharp(tmpPath).resize(CARD_SIZE, CARD_SIZE).toBuffer();
      composites.push({ input: resized, left: CARD_POSITIONS[i].left, top: CARD_POSITIONS[i].top });
    }
    await sharp(BASE_IMAGE).composite(composites).jpeg({ quality: 85 }).toFile(outPath);
    return outPath;
  } finally {
    for (const f of tmpFiles) { try { fs.unlinkSync(f); } catch {} }
  }
}

// --- Flip Frame Generator ---
async function generateFlipFrame(backBuffer, frontBuffer, progressRatio, width = 600, height = 600) {
  // Progress goes 0->1. At 0.5, we're at the thinnest point (width=0)
  const scaleRatio = 1 - Math.abs((progressRatio * 2) - 1); // Goes 0->1->0
  const scaleWidth = Math.max(2, Math.round(width * scaleRatio));
  const cardImage = progressRatio < 0.5 ? backBuffer : frontBuffer;

  // Resize with fill mode to avoid letterboxing
  const resizedBuffer = await sharp(cardImage)
    .resize(scaleWidth, height, { fit: 'fill', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite onto transparent background so actual background shows through
  const background = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: resizedBuffer, left: Math.round((width - scaleWidth) / 2), top: 0 }])
    .png()
    .toBuffer();

  return background;
}

// --- Animated Card Reveal ---
async function generateAnimatedCardReveal(cardNumbers, userId) {
  const timestamp = Date.now();
  const frameDir = `/tmp/frames_${userId}_${timestamp}`;
  const outPath = `/tmp/draw_${userId}_${timestamp}.mp4`;
  const frameFiles = [];

  try {
    // Create frame directory
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

    // Load background image for all frames
    let bgBuffer;
    try {
      bgBuffer = await sharp(BASE_IMAGE).png().toBuffer();
      console.log(`Background image loaded: ${bgBuffer.length} bytes`);
    } catch (bgErr) {
      console.error("Background image load failed:", bgErr.message);
      return { type: 'image', path: await compositeDrawImage(cardNumbers, userId) };
    }

    // Download card images (front) and back
    const cardBuffers = {};
    const backCardFileId = "CAACAgQAAxkBAAFEaxFpsIW8ImJBN6amurW1XFCljORQuQACrB8AAgeCgFFDvIaU3RydKToE";

    // Download and cache card back (convert WebP to PNG)
    let backBuffer;
    try {
      const backFile = await bot.getFile(backCardFileId);
      const backUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${backFile.file_path}`;
      const backResp = await axios.get(backUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const rawBackBuffer = Buffer.from(backResp.data);
      console.log(`Card back downloaded: ${rawBackBuffer.length} bytes`);
      backBuffer = await sharp(rawBackBuffer).toFormat('png').toBuffer();
      console.log(`Card back converted to PNG: ${backBuffer.length} bytes`);
    } catch (e) {
      console.error("Card back download/conversion failed:", e.message, e.stack);
      return { type: 'image', path: await compositeDrawImage(cardNumbers, userId) };
    }

    // Download front card images (convert WebP to PNG)
    for (const cardNum of cardNumbers) {
      const fileId = STICKER_MAP[cardNum];
      if (!fileId) throw new Error(`No sticker for card ${cardNum}`);
      try {
        const file = await bot.getFile(fileId);
        const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        const rawCardBuffer = Buffer.from(resp.data);
        console.log(`Card ${cardNum} downloaded: ${rawCardBuffer.length} bytes`);
        cardBuffers[cardNum] = await sharp(rawCardBuffer).toFormat('png').toBuffer();
        console.log(`Card ${cardNum} converted to PNG: ${cardBuffers[cardNum].length} bytes`);
      } catch (e) {
        console.error(`Failed to download/convert card ${cardNum}:`, e.message, e.stack);
        return { type: 'image', path: await compositeDrawImage(cardNumbers, userId) };
      }
    }

    // Generate 45 frames with new sequence:
    // Frames 1-15: background only
    // Frames 16-20: card 1 slides up from y=1442 and flips
    // Frames 18-22: card 2 slides up and flips (overlapping)
    // Frames 20-24: card 3 slides up and flips (overlapping)
    // Frames 25-45: all 3 revealed cards static (hold longer for viewing)
    const TOTAL_FRAMES = 45;
    const CARD_WIDTH = 600;
    const CARD_HEIGHT = 600;
    const FINAL_POSITIONS = [
      { x: 30, y: 850 },
      { x: 535, y: 850 },
      { x: 1040, y: 850 }
    ];

    console.log(`Generating ${TOTAL_FRAMES} animation frames...`);
    for (let frame = 1; frame <= TOTAL_FRAMES; frame++) {
      const frameNum = String(frame).padStart(3, '0');
      const framePath = `${frameDir}/frame_${frameNum}.jpg`;
      frameFiles.push(framePath);

      let composites = [];

      // Frames 1-15: background only, skip cards
      if (frame > 15) {
        for (let i = 0; i < 3; i++) {
          let cardBuffer;
          let position = { ...FINAL_POSITIONS[i] };

          try {
            // Determine which cards slide and flip, and which are static
            if (i === 0 && frame >= 16 && frame <= 20) {
              // Card 1: slide from y=1442 to y=908 and flip over 5 frames
              const progress = (frame - 16) / 4; // 0 to 1 over 5 frames
              position.y = 1442 + (908 - 1442) * progress; // interpolate Y position
              cardBuffer = await generateFlipFrame(backBuffer, cardBuffers[cardNumbers[0]], progress, CARD_WIDTH, CARD_HEIGHT);
              console.log(`Frame ${frame}: Card 1 sliding (y=${position.y.toFixed(0)}) and flipping (progress ${progress.toFixed(2)})`);
            } else if (i === 1 && frame >= 18 && frame <= 22) {
              // Card 2: slide from y=1442 to y=908 and flip over 5 frames
              const progress = (frame - 18) / 4; // 0 to 1 over 5 frames
              position.y = 1442 + (908 - 1442) * progress;
              cardBuffer = await generateFlipFrame(backBuffer, cardBuffers[cardNumbers[1]], progress, CARD_WIDTH, CARD_HEIGHT);
              console.log(`Frame ${frame}: Card 2 sliding (y=${position.y.toFixed(0)}) and flipping (progress ${progress.toFixed(2)})`);
            } else if (i === 2 && frame >= 20 && frame <= 24) {
              // Card 3: slide from y=1442 to y=908 and flip over 5 frames
              const progress = (frame - 20) / 4; // 0 to 1 over 5 frames
              position.y = 1442 + (908 - 1442) * progress;
              cardBuffer = await generateFlipFrame(backBuffer, cardBuffers[cardNumbers[2]], progress, CARD_WIDTH, CARD_HEIGHT);
              console.log(`Frame ${frame}: Card 3 sliding (y=${position.y.toFixed(0)}) and flipping (progress ${progress.toFixed(2)})`);
            } else {
              // Static revealed cards (frames 25-35 for all, or earlier if animation is done)
              if ((i === 0 && frame > 20) || (i === 1 && frame > 22) || (i === 2 && frame > 24)) {
                cardBuffer = cardBuffers[cardNumbers[i]];
              }
            }

            if (cardBuffer) {
              const resized = await sharp(cardBuffer).resize(CARD_WIDTH, CARD_HEIGHT).toBuffer();
              composites.push({ input: resized, left: position.x, top: Math.round(position.y) });
            }
          } catch (cardErr) {
            console.error(`Error processing card ${i} (${cardNumbers[i]}) on frame ${frame}:`, cardErr.message, cardErr.stack);
            throw cardErr;
          }
        }
      }

      try {
        // Composite cards onto background image (JPEG for better performance)
        const frameBuffer = await sharp(bgBuffer)
          .composite(composites)
          .jpeg({ quality: 85 })
          .toBuffer();

        fs.writeFileSync(framePath, frameBuffer);
        if (frame % 5 === 0) console.log(`Generated frame ${frame}/${TOTAL_FRAMES}`);
      } catch (frameErr) {
        console.error(`Error compositing frame ${frame}:`, frameErr.message, frameErr.stack);
        throw frameErr;
      }
    }

    // Duplicate last frame for 10 seconds viewing time (150 additional frames at 15fps)
    console.log("Extending final frame duration...");
    const lastFramePath = `${frameDir}/frame_${String(TOTAL_FRAMES).padStart(3, '0')}.jpg`;
    const lastFrameBuffer = fs.readFileSync(lastFramePath);
    for (let i = TOTAL_FRAMES + 1; i <= TOTAL_FRAMES + 150; i++) {
      const extFramePath = `${frameDir}/frame_${String(i).padStart(3, '0')}.jpg`;
      fs.writeFileSync(extFramePath, lastFrameBuffer);
      frameFiles.push(extFramePath);
    }
    console.log(`Extended with 150 duplicate frames (10 extra seconds)`);

    // Create MP4 with FFmpeg
    console.log("Encoding video...");
    return new Promise((resolve, reject) => {
      const cleanupFrames = () => {
        for (const f of frameFiles) {
          try { fs.unlinkSync(f); } catch {}
        }
        try { fs.rmdirSync(frameDir); } catch {}
      };

      ffmpeg()
        .input(`${frameDir}/frame_%03d.jpg`)
        .inputFPS(15)
        .videoFilter('scale=trunc(iw/2)*2:trunc(ih/2)*2')
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-crf 28'
        ])
        .output(outPath)
        .on('error', (err) => {
          console.error("FFmpeg error:", err.message);
          cleanupFrames();
          compositeDrawImage(cardNumbers, userId).then(path => {
            resolve({ type: 'image', path });
          }).catch(() => reject(err));
        })
        .on('end', () => {
          console.log("Video created:", outPath);
          cleanupFrames();
          resolve({ type: 'video', path: outPath });
        })
        .run();
    });
  } catch (e) {
    console.error("Animation generation failed:", e.message);
    // Cleanup on error
    for (const f of frameFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
    try { fs.rmdirSync(frameDir); } catch {}
    try {
      return { type: 'image', path: await compositeDrawImage(cardNumbers, userId) };
    } catch (fallbackErr) {
      console.error("Fallback also failed:", fallbackErr.message);
      throw e;
    }
  }
}

// --- Send Draw Result Helper ---
async function sendDrawResult(chatId, userId, cardNumbers, caption = "") {
  try {
    const result = await generateAnimatedCardReveal(cardNumbers, userId);
    if (result.type === 'video') {
      // Send as animation for Telegram autoplay with caption
      await bot.sendAnimation(chatId, fs.createReadStream(result.path), {
        duration: 13,
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard(userId)
      });
    } else {
      await bot.sendPhoto(chatId, fs.createReadStream(result.path), {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard(userId)
      });
    }
    try { fs.unlinkSync(result.path); } catch {}
  } catch (e) {
    console.error("sendDrawResult error:", e.message);
    await bot.sendMessage(chatId, "❌ Failed to generate card reveal. Please try again.");
  }
}

// --- Draw Logic ---
async function performDraw(chatId, userId) {
  // Prevent simultaneous draws for the same user
  if (activeDraws.has(userId)) {
    return bot.sendMessage(chatId, "⏳ Your draw is already in progress...");
  }
  activeDraws.add(userId);

  try {
    // Show status while generating animation
    await bot.sendMessage(chatId, "🎴 Drawing cards...");

    if (!hasReceivedBonus(userId)) {
    // First play: real random draw with 11 sat bonus
    const fpBlockHash = await getLatestBlockHash();
    const fpTimestamp = Date.now();
    const fpSeed = generateBlockSeed(fpBlockHash, userId, fpTimestamp);
    const fpCards = drawCards(fpSeed);
    updateJackpot(JACKPOT_CONTRIBUTION);
    const FIRST_PLAY_BONUS = parseInt(process.env.FIRST_PLAY_BONUS_SATS || '11');
    updateJackpot(-FIRST_PLAY_BONUS);
    const fpNewBalance = updateUserBalance(userId, FIRST_PLAY_BONUS);
    markBonusReceived(userId);

    const fpDb = loadDb();
    fpDb[`draw_verify_${userId}`] = {
      blockHeight: cachedBlockInfo.height,
      blockHash: fpBlockHash,
      cards: fpCards.map(c => c.number),
      timestamp: fpTimestamp
    };
    if (!fpDb.stats) {
      fpDb.stats = { totalDraws: 0, dailyDraws: 0, lastDrawDate: new Date().toISOString().split('T')[0], totalUsers: {}, winsByTier: { jackpot: 0, major: 0, minor: 0, none: 0 } };
    }
    fpDb.stats.totalDraws = (fpDb.stats.totalDraws || 0) + 1;
    const fpToday = new Date().toISOString().split('T')[0];
    if (fpDb.stats.lastDrawDate !== fpToday) {
      fpDb.stats.dailyDraws = 1;
      fpDb.stats.lastDrawDate = fpToday;
    } else {
      fpDb.stats.dailyDraws = (fpDb.stats.dailyDraws || 0) + 1;
    }
    if (!fpDb.stats.totalUsers) fpDb.stats.totalUsers = {};
    fpDb.stats.totalUsers[userId] = true;
    fpDb.stats.winsByTier['none'] = (fpDb.stats.winsByTier['none'] || 0) + 1;
    if (!fpDb.drawLogs) fpDb.drawLogs = [];
    fpDb.drawLogs.push({ userId, cards: fpCards.map(c => c.number), winTier: 'none', timestamp: fpTimestamp });
    if (fpDb.drawLogs.length > 10) fpDb.drawLogs = fpDb.drawLogs.slice(-10);
    saveDb(fpDb);

    const fpCardLine = fpCards.map(c => `*${c.name}*`).join(' · ');
    const { fortune: fpFortune } = calculateFortune(fpCards, getJackpot(), MIN_JACKPOT_SEED, true);
    const fpCaption =
      `🎴 *Madame Satoshi draws...*\n\n${fpCardLine}\n\n🔮 _${fpFortune}_\n\n` +
      `💰 *Bonus: ${FIRST_PLAY_BONUS} sats!*\n👛 Balance: ${fpNewBalance} sats\n🎰 Jackpot: ${getJackpot()} sats`;
    await sendDrawResult(chatId, userId, fpCards.map(c => c.number), fpCaption);
    return;
  }

  let pool = updateJackpot(JACKPOT_CONTRIBUTION);
  await transferToProfitWallet(PROFIT_AMOUNT, `Profit ${userId}`);

  // Block-seeded randomness
  const blockHash = await getLatestBlockHash();
  const timestamp = Date.now();
  const seed = generateBlockSeed(blockHash, userId, timestamp);
  const cards = drawCards(seed);

  let { fortune, sats_won, is_jackpot, win_tier } = calculateFortune(cards, pool, MIN_JACKPOT_SEED);

  if (sats_won > 0) {
    const actual = Math.min(sats_won, pool);
    if (actual < sats_won) fortune += " (Pool limit reached)";
    sats_won = actual;
    updateJackpot(-sats_won);
    updateUserBalance(userId, sats_won);
  }

  const cardLine = cards.map(c => `*${c.name}*`).join(" · ");
  const emoji = is_jackpot ? "🏆" : sats_won > 0 ? "🎉" : "🔮";
  const winLine = sats_won > 0 ? `\n💰 *Won: ${sats_won} sats!*` : "";

  // Ensure win_tier is defined - if undefined, fortuneLogic.js hasn't been updated
  if (typeof win_tier === "undefined") {
    console.error("CRITICAL BUG: win_tier is undefined from calculateFortune. fortuneLogic.js may not be updated. Cards:", cards.map(c => c.number), "sats_won:", sats_won);
    throw new Error("fortuneLogic.js missing win_tier - code needs redeployment");
  }

  const winLabels = { minor: "MINOR WIN!", major: "MAJOR WIN!!", jackpot: "JACKPOT!!!" };
  const winAnnouncement = win_tier !== "none" ? `*${winLabels[win_tier.toLowerCase()]}*\n\n` : "";
  const caption =
    `🎴 *Madame Satoshi draws...*\n\n${winAnnouncement}${cardLine}\n\n${emoji} _${fortune}_${winLine}\n\n` +
    `👛 Balance: ${getUserBalance(userId)} sats\n🎰 Jackpot: ${getJackpot()} sats`;

  // Store verification data (block hash, cards, timestamp)
  const db = loadDb();
  db[`draw_verify_${userId}`] = {
    blockHeight: cachedBlockInfo.height,
    blockHash: blockHash,
    cards: cards.map(c => c.number),
    timestamp: timestamp
  };

  // Update stats
  if (!db.stats) {
    db.stats = { totalDraws: 0, dailyDraws: 0, lastDrawDate: new Date().toISOString().split('T')[0], totalUsers: {}, winsByTier: { jackpot: 0, major: 0, minor: 0, none: 0 } };
  }
  db.stats.totalDraws = (db.stats.totalDraws || 0) + 1;

  // Check if date changed for daily reset
  const today = new Date().toISOString().split('T')[0];
  if (db.stats.lastDrawDate !== today) {
    db.stats.dailyDraws = 1;
    db.stats.lastDrawDate = today;
  } else {
    db.stats.dailyDraws = (db.stats.dailyDraws || 0) + 1;
  }

  // Track unique users
  if (!db.stats.totalUsers) db.stats.totalUsers = {};
  db.stats.totalUsers[userId] = true;

  // Update win tier stats
  const tierKey = win_tier.toLowerCase() || "none";
  db.stats.winsByTier[tierKey] = (db.stats.winsByTier[tierKey] || 0) + 1;

  // Append to draw logs (keep last 10)
  if (!db.drawLogs) db.drawLogs = [];
  db.drawLogs.push({
    userId: userId,
    cards: cards.map(c => c.number),
    winTier: win_tier,
    timestamp: timestamp
  });
  if (db.drawLogs.length > 10) db.drawLogs = db.drawLogs.slice(-10);

    saveDb(db);

    await sendDrawResult(chatId, userId, cards.map(c => c.number), caption);
  } finally {
    activeDraws.delete(userId);
  }
}

// --- Invoice Flow ---
async function startInvoicePayment(chatId, userId, amountSats, type) {
  try {
    const memo = type === "play" ? "Madame Satoshi Reading" : `Deposit ${amountSats} sats`;
    const { hash, bolt11 } = await createInvoice(amountSats, memo);

    const qrBuf = await QRCode.toBuffer(bolt11.toUpperCase(), { width: 150, margin: 2 });
    const qrMsg = await bot.sendPhoto(chatId, qrBuf, {
      caption: `⚡ Pay ${amountSats} sats via Lightning (~5 min expiry)`,
    });
    await bot.sendMessage(chatId, bolt11, {
      entities: [{ type: 'code', offset: 0, length: bolt11.length }],
    });

    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        if (++attempts > 60) {
          clearInterval(interval); delete pendingInvoices[chatId];
          await bot.editMessageCaption("❌ Invoice expired. Try again.", { chat_id: chatId, message_id: qrMsg.message_id });
          return;
        }
        if (await checkInvoicePaid(hash)) {
          clearInterval(interval); delete pendingInvoices[chatId];
          await bot.editMessageCaption("✅ Payment received!", { chat_id: chatId, message_id: qrMsg.message_id });
          if (type === "play") {
            await performDraw(chatId, userId);
          } else {
            const nb = updateUserBalance(userId, amountSats);
            await bot.sendMessage(chatId, `✅ *Deposit confirmed!*\n+${amountSats} sats\n👛 Balance: ${nb} sats`,
              { parse_mode: "Markdown", reply_markup: mainKeyboard(userId) });
          }
        }
      } catch (e) { console.error("Poll error:", e.message); }
    }, 5000);
    pendingInvoices[chatId] = { interval };
  } catch (e) {
    console.error("Invoice error:", e.message);
    await bot.sendMessage(chatId, `❌ Failed to create invoice: ${e.message}`);
  }
}

// --- Withdraw Flow ---
async function processWithdrawInvoice(chatId, userId, invoice) {
  const balance = getUserBalance(userId);
  let fundingInvoice = null;
  try {
    // Step 1: Decode and validate invoice
    const decoded = await axios.post(`${LNBITS_URL}/api/v1/payments/decode`,
      { data: invoice },
      { headers: { "X-Api-Key": LNBITS_MAIN_INVOICE_KEY }, timeout: 10000 });
    const amountSats = Math.ceil((decoded.data?.amount_msat || 0) / 1000);
    console.log('Invoice amount:', amountSats, 'User balance:', balance);
    if (!amountSats || amountSats <= 0) { await bot.sendMessage(chatId, "❌ Invalid invoice."); return; }
    if (amountSats > balance) { await bot.sendMessage(chatId, `❌ Invoice amount (${amountSats} sats) exceeds your balance (${balance} sats).`); return; }

    await bot.sendMessage(chatId, "⏳ Paying invoice...");

    // Step 2: Create payout funding invoice with exact amount (reserve covers routing fees)
    console.log('Creating payout funding invoice for', amountSats, 'sats (reserve covers fees)');
    const fundInvResponse = await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: false, amount: amountSats, memo: "Payout funding" },
      { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 15000 });
    fundingInvoice = fundInvResponse.data.payment_request;

    // Step 3: Fund payout AND pay user invoice atomically
    console.log('Funding payout wallet and paying user invoice (atomic)');
    await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: true, bolt11: fundingInvoice },
      { headers: { "X-Api-Key": LNBITS_MAIN_ADMIN_KEY }, timeout: 45000 });

    // Step 4: Pay user invoice from payout wallet (funds should now be available)
    console.log('Paying user invoice from payout wallet');
    await axios.post(`${LNBITS_URL}/api/v1/payments`,
      { out: true, bolt11: invoice },
      { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 45000 });

    // Step 5: Only deduct from balance after both payments succeed
    const newBalance = updateUserBalance(userId, -amountSats);
    await bot.sendMessage(chatId, `✅ *Withdrawn ${amountSats} sats!*\n👛 Remaining: ${newBalance} sats`,
      { parse_mode: "Markdown", reply_markup: mainKeyboard(userId) });

    // Step 6: Verify and top up reserve if needed
    console.log('Checking payout wallet reserve after withdrawal');
    await topUpPayoutWalletReserve();
  } catch (e) {
    console.error("Withdraw error:", e.message);
    console.log('Withdrawal error response:', JSON.stringify(e.response?.data));

    // If funding invoice was created, attempt to drain excess above reserve with retry logic
    if (fundingInvoice) {
      console.error(`User payment failed. Attempting to drain payout wallet excess (keeping ${PAYOUT_RESERVE_SATS} sats reserve)...`);
      let drainSuccess = false;
      const maxRetries = 5;
      const retryDelayMs = 10000; // 10 seconds

      for (let retryAttempt = 0; retryAttempt < maxRetries && !drainSuccess; retryAttempt++) {
        try {
          // Check current payout balance and drain only excess above reserve
          const payoutBalance = await getPayoutWalletBalance();
          if (payoutBalance === null) {
            console.error(`Cannot check payout balance for drain, skipping drain on attempt ${retryAttempt + 1}`);
            throw new Error("Payout balance check failed");
          }
          const excessAmount = Math.max(0, payoutBalance - PAYOUT_RESERVE_SATS);
          if (excessAmount > 0) {
            console.log(`Draining ${excessAmount} sats from payout wallet (keeping ${PAYOUT_RESERVE_SATS} reserve)`);
            const drainInv = await axios.post(`${LNBITS_URL}/api/v1/payments`,
              { out: false, amount: excessAmount, memo: "Refund due to failed user payment" },
              { headers: { "X-Api-Key": LNBITS_MAIN_INVOICE_KEY }, timeout: 15000 });
            await axios.post(`${LNBITS_URL}/api/v1/payments`,
              { out: true, bolt11: drainInv.data.payment_request },
              { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 45000 });
            console.log(`Payout wallet excess drained successfully on attempt ${retryAttempt + 1}`);
            drainSuccess = true;
          } else {
            console.log(`No excess to drain (balance: ${payoutBalance}, reserve: ${PAYOUT_RESERVE_SATS})`);
            drainSuccess = true;
          }
        } catch (drainErr) {
          const is520Error = drainErr.response?.status === 520;
          if (is520Error && retryAttempt < maxRetries - 1) {
            console.warn(`Drain attempt ${retryAttempt + 1} failed with 520 error. Retrying in ${retryDelayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          } else {
            console.error(`CRITICAL: Failed to drain payout wallet after ${retryAttempt + 1} attempts: ${drainErr.message}`);
            console.error(`Stranded sats may remain in payout wallet above ${PAYOUT_RESERVE_SATS} sat reserve. Manual intervention may be required.`);
            drainSuccess = false;
            break;
          }
        }
      }
    }
    await bot.sendMessage(chatId, "❌ Payment failed. Balance unchanged.");
  }
}

// --- Commands ---
async function sendWelcome(chatId, userId) {
  await bot.sendMessage(chatId,
    `🔮 *Welcome to Madame Satoshi's Bitcoin Oracle!*\n\n` +
    `Pay *21 sats* via Lightning to draw 3 tarot cards and receive your fortune.\n\n` +
    `🎰 *Jackpot Pool:* ${getJackpot()} sats\n👛 *Your Balance:* ${getUserBalance(userId)} sats\n\n` +
    `🏆 JACKPOT: Sun + World + Magician (any order) → 100% of pool (6 in 9,240)\n` +
    `🥇 Major Win → ~35% of pool (66 in 9,240)\n🥈 Minor Win → ~15% of pool (666 in 9,240)`,
    { parse_mode: "Markdown", reply_markup: mainKeyboard(userId) });
}

bot.onText(/\/start/, async (msg) => {
  if (msg.chat.type !== 'private') return;
  await sendWelcome(msg.chat.id, msg.from.id);
});

bot.onText(/\/madame/, async (msg) => {
  await sendWelcome(msg.chat.id, msg.from.id);
});

bot.onText(/\/verify/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const draw = dbGet(`draw_verify_${userId}`);

  if (!draw) {
    return bot.sendMessage(chatId, '🔮 No draws found. Play /madame first to see your verification data.', { reply_markup: mainKeyboard(userId) });
  }

  // Recalculate seed on-the-fly for verification
  const seed = generateBlockSeed(draw.blockHash, userId, draw.timestamp);

  const verifyMessage = `*Last Draw Verification*\n\n` +
    `🔗 Block Height: ${draw.blockHeight || 'Unknown'}\n` +
    `📜 Block Hash:\n\`${draw.blockHash}\`\n\n` +
    `🎯 Seed: \`${seed}\`\n` +
    `🎴 Cards: ${draw.cards.join(' → ')}\n` +
    `⏰ Timestamp: ${new Date(draw.timestamp).toLocaleString()}\n\n` +
    `[Verify on mempool.space](https://mempool.space/block/${draw.blockHash})\n\n` +
    `🔍 *Verify this draw yourself:*\n` +
    `1. Check the block hash at mempool.space (link above)\n` +
    `2. Run this in your terminal:\n\n` +
    `\`\`\`\n` +
    `node -e "\n` +
    `const crypto = require('crypto');\n` +
    `const seed = crypto.createHash('sha256')\n` +
    `.update('${draw.blockHash}' + '${userId}' + '${draw.timestamp}')\n` +
    `.digest('hex');\n` +
    `console.log('Seed:', parseInt(seed.substring(0,8), 16));\n` +
    `"\n` +
    `\`\`\``;

  bot.sendMessage(chatId, verifyMessage, { parse_mode: 'Markdown', reply_markup: mainKeyboard(userId) });
});

// --- Admin Commands ---
bot.onText(/\/msstats/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const db = loadDb();
  const stats = db.stats || { totalDraws: 0, dailyDraws: 0, totalUsers: {}, winsByTier: { jackpot: 0, major: 0, minor: 0, none: 0 } };
  const totalUsers = Object.keys(stats.totalUsers || {}).length;

  const jackpotPool = getJackpot();
  const statsMessage = `*Madame Satoshi Statistics*\n\n` +
    `📊 Total Draws: ${stats.totalDraws}\n` +
    `📅 Daily Draws (today): ${stats.dailyDraws}\n` +
    `👥 Total Players: ${totalUsers}\n` +
    `🎰 Jackpot Pool: ${jackpotPool} sats\n\n` +
    `*Wins Breakdown:*\n` +
    `🏆 Jackpot: ${stats.winsByTier.jackpot || 0}\n` +
    `🥇 Major: ${stats.winsByTier.major || 0}\n` +
    `🥈 Minor: ${stats.winsByTier.minor || 0}\n` +
    `❌ None: ${stats.winsByTier.none || 0}`;

  bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/msuser\s+(\d+)/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const targetUserId = parseInt(match[1]);
  const balance = getUserBalance(targetUserId);
  const draw = dbGet(`draw_verify_${targetUserId}`);

  let userMessage = `*User Stats: ${targetUserId}*\n\n` +
    `💰 Balance: ${balance} sats\n`;

  if (draw) {
    userMessage += `🎴 Last Draw: ${draw.cards.join(' → ')}\n` +
      `⏰ At: ${new Date(draw.timestamp).toLocaleString()}`;
  } else {
    userMessage += `🎴 Last Draw: None`;
  }

  bot.sendMessage(chatId, userMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/msuser$/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");
  bot.sendMessage(chatId, "Usage: /msuser <userId>");
});

bot.onText(/\/mslogs/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const db = loadDb();
  const drawLogs = db.drawLogs || [];

  let logsMessage = `*Recent Draw Logs (Last 10)*\n\n`;
  if (drawLogs.length === 0) {
    logsMessage += "No draws recorded yet.";
  } else {
    drawLogs.reverse().forEach((draw, i) => {
      const tierEmoji = draw.winTier === 'jackpot' ? '🏆' : draw.winTier === 'major' ? '🥇' : draw.winTier === 'minor' ? '🥈' : '❌';
      logsMessage += `${i + 1}. ${tierEmoji} User ${draw.userId}: ${draw.cards.join('-')} @ ${new Date(draw.timestamp).toLocaleTimeString()}\n`;
    });
  }

  bot.sendMessage(chatId, logsMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/msbroadcast\s+(.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const message = match[1];
  const db = loadDb();
  let sentCount = 0;
  let failCount = 0;

  // Send to all users who have balances or stats
  const userIds = new Set();
  for (const [key, value] of Object.entries(db)) {
    if (key.startsWith('balance_')) {
      userIds.add(key.replace('balance_', ''));
    }
    if (key.startsWith('draw_verify_')) {
      userIds.add(key.replace('draw_verify_', ''));
    }
  }

  for (const targetUserId of userIds) {
    try {
      await bot.sendMessage(targetUserId, `📢 *Admin Message*\n\n${message}`, { parse_mode: 'Markdown' });
      sentCount++;
    } catch (e) {
      console.warn(`Broadcast failed for user ${targetUserId}:`, e.message);
      failCount++;
    }
  }

  bot.sendMessage(chatId, `✅ Broadcast sent to ${sentCount} users (${failCount} failed).`);
});

bot.onText(/\/msdrain\s+(\d+)/, async (msg, match) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const amount = parseInt(match[1]);
  if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ Invalid amount.");

  const confirmKeyboard = {
    inline_keyboard: [[
      { text: '✅ YES, Drain', callback_data: `confirm_drain_${amount}` },
      { text: '❌ Cancel', callback_data: 'cancel_drain' }
    ]]
  };

  bot.sendMessage(chatId, `⚠️ About to drain *${amount}* sats from MS payout wallet back to MS main.\n\nConfirm?`,
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
});

bot.onText(/\/msblock/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const blockMessage = `*Latest Block Info*\n\n` +
    `🔗 Block Height: ${cachedBlockInfo.height || 'Unknown'}\n` +
    `📜 Block Hash:\n\`${cachedBlockInfo.hash || 'Unknown'}\`\n` +
    `⏰ Last Updated: ${cachedBlockInfo.timestamp ? new Date(cachedBlockInfo.timestamp).toLocaleString() : 'N/A'}`;

  bot.sendMessage(chatId, blockMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/mshelp/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");

  const helpMessage = `*🔧 Admin Commands:*\n\n` +
    `/msstats — Full dashboard (draws, users, wallets, block status)\n` +
    `/msuser <userId> — Look up a specific user's balance and draw history\n` +
    `/mslogs — Last 10 draws across all users\n` +
    `/msbroadcast <message> — Send message to all active users\n` +
    `/msdrain <amount> — Drain MS payout wallet back to MS main\n` +
    `/msblock — Current Bitcoin block info and randomness status\n` +
    `/mshelp — Show this list`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});


// --- Callbacks ---
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const userId = q.from.id;
  try { await bot.answerCallbackQuery(q.id); } catch(e) { /* ignore expired */ }
  const d = q.data;
  if (d === "draw") {
    const bal = getUserBalance(userId);
    if (bal >= PAYMENT_AMOUNT_SATS) {
      updateUserBalance(userId, -PAYMENT_AMOUNT_SATS);
      await performDraw(chatId, userId);
    } else {
      if (pendingInvoices[chatId]) { await bot.sendMessage(chatId, "⚠️ Pending invoice exists."); return; }
      await startInvoicePayment(chatId, userId, PAYMENT_AMOUNT_SATS, "play");
    }
  } else if (d === "deposit") {
    if (q.message.chat.type === 'group' || q.message.chat.type === 'supergroup') {
      await bot.sendMessage(chatId, "🔮 Please chat with me privately to deposit or withdraw: t.me/BitcoinTarotBot");
      return;
    }
    awaitingDepositAmount.add(userId);
    await bot.sendMessage(chatId, "💰 Enter deposit amount in sats:");
  } else if (d === "withdraw") {
    if (q.message.chat.type === 'group' || q.message.chat.type === 'supergroup') {
      await bot.sendMessage(chatId, "🔮 Please chat with me privately to deposit or withdraw: t.me/BitcoinTarotBot");
      return;
    }
    const bal = getUserBalance(userId);
    if (bal <= 0) { await bot.sendMessage(chatId, "❌ Balance is 0."); return; }
    awaitingWithdrawInvoice.add(userId);
    await bot.sendMessage(chatId, `💸 You have *${bal} sats*. Paste a Lightning invoice to withdraw:`, { parse_mode: "Markdown" });
  } else if (d === "status") {
    await bot.sendMessage(chatId, `🎰 *Jackpot:* ${getJackpot()} sats\n👛 *Balance:* ${getUserBalance(userId)} sats`, { parse_mode: "Markdown" });
  } else if (d === "help") {
    await bot.sendMessage(chatId,
      `🔮 *Madame Satoshi's Bitcoin Oracle*\n\n` +
      `Pay 21 sats → draw 3 tarot cards → receive your Bitcoin fortune.\n\n` +
      `*Possible Wins:*\n` +
      `🏆 JACKPOT: Sun + World + Magician (any order) → 100% of pool (6 in 9,240)\n` +
      `🥇 Major Win → ~35% of pool (66 in 9,240)\n` +
      `🥈 Minor Win → ~15% of pool (666 in 9,240)\n\n` +
      `*🔍 Provably Fair*\n` +
      `Draws are seeded by Bitcoin block hashes.\n` +
      `Use /verify to see your last draw's verification data.\n` +
      `Full verification is possible, check our FOSS GPL v3 [Github Project](https://github.com/artdesignbySF/BTC-tarot-telegram-bot)\n\n` +
      `Use the buttons below to draw, deposit, withdraw, and check your balance.\n\n` +
      `Type /madame to open the oracle.\n\n` +
      `_Stack sats. Trust the cards. Have fun._`,
      { parse_mode: "Markdown", disable_web_page_preview: true });
  } else if (d.startsWith("confirm_drain_")) {
    if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");
    const amount = parseInt(d.split("_")[2]);
    if (isNaN(amount)) return bot.sendMessage(chatId, "❌ Invalid drain amount.");

    try {
      const payoutBal = await getPayoutWalletBalance();
      if (payoutBal < amount) {
        return bot.sendMessage(chatId, `❌ Payout wallet only has ${payoutBal} sats, need ${amount}.`);
      }

      // Drain from payout back to main by paying an invoice
      const memo = `MS Drain ${amount} sats`;
      const { hash: mainHash, bolt11: mainBolt11 } = await createInvoice(amount, memo);

      // Wait a moment for invoice to be created
      await new Promise(r => setTimeout(r, 500));

      // Pay from payout wallet to main
      const payRes = await axios.post(
        `${LNBITS_URL}/api/v1/payments`,
        { out: true, amount: amount, bolt11: mainBolt11 },
        { headers: { "X-Api-Key": LNBITS_PAYOUT_ADMIN_KEY }, timeout: 30000 }
      );

      if (!payRes.data?.payment_hash) throw new Error("Payment failed");
      bot.sendMessage(chatId, `✅ Drained ${amount} sats from MS payout to MS main.`);
    } catch (error) {
      console.error("Drain error:", error.message);
      bot.sendMessage(chatId, `❌ Drain failed: ${error.message}`);
    }
  } else if (d === "cancel_drain") {
    if (userId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Access denied. Admins only!");
    bot.sendMessage(chatId, "❌ Drain cancelled.");
  }
});

// --- Free text ---
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();
  if (msg.sticker) { console.log('Sticker file_id:', msg.sticker.file_id); }
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') return;
  if (!text || text.startsWith("/")) return;

  if (awaitingDepositAmount.has(userId)) {
    awaitingDepositAmount.delete(userId);
    const amt = parseInt(text);
    if (isNaN(amt) || amt <= 0) { await bot.sendMessage(chatId, "❌ Invalid amount."); return; }
    await startInvoicePayment(chatId, userId, amt, "deposit");
    return;
  }

  if (awaitingWithdrawInvoice.has(userId)) {
    awaitingWithdrawInvoice.delete(userId);
    if (!text.toLowerCase().startsWith("lnbc")) { await bot.sendMessage(chatId, "❌ Invalid invoice."); return; }
    await processWithdrawInvoice(chatId, userId, text);
    return;
  }

});

// --- /getstickers: list all stickers in the BitcoinTarot set with their file_ids ---
bot.onText(/\/getstickers/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const set = await bot.getStickerSet(STICKER_SET_NAME);
    const lines = set.stickers.map((s, i) =>
      `${String(i + 1).padStart(2, "0")} ${s.emoji || "?"} \`${s.file_id}\``
    );
    // Send in chunks to stay under the 4096-char Telegram limit
    const CHUNK = 50;
    await bot.sendMessage(chatId, `*${set.title}* — ${set.stickers.length} stickers:`, { parse_mode: "Markdown" });
    for (let i = 0; i < lines.length; i += CHUNK) {
      await bot.sendMessage(chatId, lines.slice(i, i + CHUNK).join("\n"), { parse_mode: "Markdown" });
    }
  } catch (e) {
    console.error("getStickerSet error:", e.message);
    await bot.sendMessage(chatId, `❌ Could not fetch sticker set "${STICKER_SET_NAME}": ${e.message}`);
  }
});

bot.on("polling_error", (e) => console.error("Polling error:", e.message));
process.on("SIGINT", () => {
  Object.values(pendingInvoices).forEach(p => clearInterval(p.interval));
  process.exit(0);
});

console.log("✅ Madame Satoshi Bot is running!");