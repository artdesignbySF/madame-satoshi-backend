# 🔮 Madame Satoshi's Bitcoin Oracle

A provably fair Bitcoin fortune telling game powered by Lightning Network. Pay 21 sats, draw 3 tarot cards from the Major Arcana, receive your fortune — and verify every draw on the blockchain.

**Live site:** [madamesatoshi.com](https://madamesatoshi.com)

---

## Architecture

madame-satoshi-backend/
├── core/
│   ├── fortuneLogic.js          # Card drawing, win detection, payout calculation
│   ├── db.js                    # JSON database (jackpot pool, user balances)
│   ├── blockSeed.js             # Bitcoin block hash seeding for provably fair draws
│   └── lnbits.js                # LNbits API: invoices, transfers, payout wallet
├── interfaces/
│   ├── telegram/
│   │   └── bot.js               # Telegram bot interface
│   └── web/
│       ├── server.js            # Express web server + WebSocket
│       ├── withdrawalRoutes.js  # LNURL-based withdrawal flow
│       └── frontend/            # Static site assets (HTML, CSS, JS, card images, sounds)
├── index.js                     # Entry point — starts both bot and web server
├── db.json                      # Runtime database (gitignored)
└── .env                         # Secrets (gitignored)


A single Node process starts on boot, initializes the jackpot pool, fetches the latest Bitcoin block hash, and starts both the Telegram bot and the Express web server. All interfaces share the same `db.json` and jackpot pool.

---

## Game Logic

All draws use provably fair, Bitcoin block-seeded randomness from a 22-card Major Arcana deck — P(22,3) = 9,240 possible permutations.

| Tier | Combinations | Permutations | Odds | Payout |
|------|-------------|--------------|------|--------|
| 🏆 Jackpot | 1 (Sun + World + Magician) | 6 / 9,240 | 0.065% | 100% of pool |
| ✨ Major Win | 11 triplets | 66 / 9,240 | 0.714% | 35% of pool |
| 💫 Minor Win | 27 pairs | 162 / 9,240 | 1.75% | 15% of pool |

**First play bonus:** New players receive 11 sats (The Fool's number) on their first draw regardless of outcome.

### Major Win Combinations (11)
Sun+World+Ace · Empress+Emperor+Strength · Star+Sun+Temperance · Magician+Lovers+World · Empress+Emperor+Lovers · Sun+Lovers+Ace · Wheel+Lovers+Magician · Star+Sun+Lovers · Justice+Wheel+Star · Hermit+Star+Lovers · Empress+World+Star

### Minor Win Combinations (27)
Ace+Wheel · Chariot+Strength · Sun+Lovers · World+Lovers · Magician+Star · Empress+Lovers · Justice+Wheel · Hermit+World · Empress+Magician · High Priestess+Hermit · Fool+Wheel · Death+Judgment · Star+Moon · Temperance+Justice · Magician+High Priestess · Emperor+Hierophant · Chariot+Emperor · Fool+Star · Death+Tower · Sun+Judgment · Moon+High Priestess · Hanged Man+Hermit · World+Ace · Hierophant+Justice · Fool+Magician · Temperance+Star · Strength+Hanged Man

---

## Provably Fair

Each draw is seeded using the latest Bitcoin block hash from a local Mempool instance. The seed is generated as:

SHA256(blockHash + sessionId + timestamp) → integer seed


The `/api/verify/:sessionId` endpoint returns full verification data. Players can independently verify any draw in their terminal:
```bash
node -e "
const crypto = require('crypto');
const seed = crypto.createHash('sha256')
  .update('BLOCK_HASH' + 'SESSION_ID' + 'TIMESTAMP')
  .digest('hex');
console.log('Seed:', parseInt(seed.substring(0,8), 16));
"
```

---

## Frontend Features

- **Mobile-first responsive layout** — fits any screen without scrolling
- **Card flip animation** — cards appear face-down and flip to reveal
- **Cabinet border shimmer** — glowing gold pulse during draws
- **Sound effects** — card slide, flip, win, button sounds with mute toggle
- **Live jackpot updates** — WebSocket broadcasts to all connected clients
- **4 tabs:** Fortune · Wins (Combos) · Verify · Help
- **Verify tab** — shows block height, hash, seed and Mempool link after each draw
- **Shimmer buttons** — Play and Deposit buttons with animated gold shimmer
- **First draw bonus** — 11 sats welcome gift with on-screen message

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Health check |
| POST | `/api/session` | Create or retrieve session |
| GET | `/api/balance/:sessionId` | Get session balance |
| POST | `/api/draw` | Draw from balance (21 sats) |
| POST | `/api/draw-from-balance` | Draw deducting from existing balance |
| POST | `/api/create-invoice` | Create Lightning play invoice |
| GET | `/api/check-invoice/:hash` | Check invoice payment status |
| POST | `/api/create-deposit-invoice` | Create custom deposit invoice |
| POST | `/api/confirm-deposit-payment` | Confirm deposit and credit balance |
| GET | `/api/jackpot` | Get current jackpot pool |
| GET | `/api/verify/:sessionId` | Get provably fair draw data |
| POST | `/api/generate-withdraw-lnurl` | Generate LNURL withdrawal |
| GET | `/api/check-lnurl-claim/:id/:sessionId` | Check LNURL claim status |

WebSocket on the same port broadcasts live jackpot updates to all connected clients.

---

## Requirements

- Node.js 18+
- Self-hosted [LNbits](https://lnbits.com) instance with:
  - Main wallet (receives deposits, funds jackpot)
  - Payout wallet (staging for LNURL withdrawals)
  - Profit wallet (receives operator share)
  - Withdraw extension enabled
- Local [Mempool](https://mempool.space/docs/api) instance (or public API)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for public access

---

## Setup

### 1. Clone and install
```bash
git clone https://github.com/artdesignbySF/madame-satoshi-backend.git
cd madame-satoshi-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
nano .env
```

### 3. Run
```bash
node index.js
```

---

## Environment Variables
```env
TELEGRAM_BOT_TOKEN=your_bot_token

LNBITS_URL=https://lnbits.yourdomain.com
LNBITS_MAIN_INVOICE_KEY=...
LNBITS_MAIN_ADMIN_KEY=...
LNBITS_PAYOUT_ADMIN_KEY=...
LNBITS_PROFIT_ADMIN_KEY=...

PAYMENT_AMOUNT_SATS=21
FIRST_PLAY_BONUS_SATS=11

CARDS_DIR=/path/to/cards
MEMPOOL_API_URL=http://localhost:8081
PORT=3002
ADMIN_TELEGRAM_ID=your_telegram_id
```

---

## Deployment (Pop!_OS + Cloudflare Tunnel)

### Systemd service
```ini
[Unit]
Description=Madame Satoshi Backend
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/madame-satoshi-backend
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable madamesatoshi
sudo systemctl start madamesatoshi
```

### Cloudflare Tunnel config
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/user/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: madamesatoshi.com
    service: http://localhost:3002
  - hostname: www.madamesatoshi.com
    service: http://localhost:3002
  - hostname: lnbits.madamesatoshi.com
    service: http://localhost:5000
  - service: http_status:404
```

---

## Related Repositories

| Repo | Description |
|------|-------------|
| [MadameSatoshi](https://github.com/artdesignbySF/MadameSatoshi) | Frontend website |
| [BTC-tarot-telegram-bot](https://github.com/artdesignbySF/BTC-tarot-telegram-bot) | Legacy standalone Telegram bot |

---

## Roadmap

- [ ] Nostr interface
- [ ] Persistent sessions (currently browser session only)
- [ ] Jackpot history / leaderboard
- [ ] Mobile app wrapper

---

*Built with ⚡ and 🔮 — No banks. No borders. Just sats and fate.*
