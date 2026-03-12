# 🔮 Madame Satoshi Backend

Unified backend for Madame Satoshi's Bitcoin Fortune Telling — serving the web interface, Telegram bot, and (future) Nostr interface from a single Node.js process with shared state and a shared Lightning jackpot pool.

**Live site:** [madamesatoshi.com](https://madamesatoshi.com)

---

## Architecture

```
madame-satoshi-backend/
├── core/                        # Shared game logic
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
│       └── frontend/            # Static site assets (HTML, CSS, JS, card images)
├── index.js                     # Entry point — starts both bot and web server
├── db.json                      # Runtime database (gitignored)
└── .env                         # Secrets (gitignored)
```

A single Node process starts on boot, initializes the jackpot pool, fetches the latest block hash, and then starts both the Telegram bot and the web server. All interfaces share the same `db.json` and the same jackpot pool.

---

## Game Logic

All draws use provably fair, Bitcoin block-seeded randomness from a 22-card Major Arcana deck (9,240 possible permutations: P(22,3)).

| Tier | Combination | Odds | Payout |
|------|-------------|------|--------|
| 🏆 Jackpot | Sun + World + Magician (any order) | 6 / 9,240 | 100% of pool |
| ✨ Major Win | Any three matching Major Arcana | 66 / 9,240 | 35% of pool |
| 💫 Minor Win | Any two matching Major Arcana | 54 / 9,240 | 15% of pool |

**First play bonus:** New players receive 11 sats (The Fool's number) added to their balance on their first draw, regardless of outcome.

---

## Provably Fair

Each draw is seeded using the latest Bitcoin block hash fetched from a local Mempool instance. The `/api/verify/:sessionId` endpoint returns:

```json
{
  "blockHeight": 940418,
  "blockHash": "00000000000000000000...",
  "seed": "...",
  "cards": ["XVIII", "XX", "I"],
  "timestamp": 1741802318
}
```

Players can verify any draw independently at [mempool.space](https://mempool.space).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Health check |
| POST | `/api/session` | Create or retrieve session |
| GET | `/api/balance` | Get session balance |
| POST | `/api/draw` | Draw from balance (21 sats) |
| POST | `/api/create-invoice` | Create Lightning deposit invoice |
| GET | `/api/check-invoice/:hash` | Check invoice payment status |
| POST | `/api/create-deposit-invoice` | Create custom amount deposit invoice |
| POST | `/api/confirm-deposit-payment` | Confirm deposit and credit balance |
| GET | `/api/jackpot` | Get current jackpot pool |
| GET | `/api/verify/:sessionId` | Get provably fair draw data |
| POST | `/api/generate-withdraw-lnurl` | Generate LNURL withdrawal link |
| GET | `/api/check-lnurl-claim/:id/:sessionId` | Check if LNURL was claimed |

WebSocket on the same port broadcasts live jackpot updates to all connected clients.

---

## Requirements

- Node.js 18+
- Self-hosted [LNbits](https://lnbits.com) instance with:
  - Main wallet (receives deposits, funds jackpot)
  - Payout wallet (staging for LNURL withdrawals)
  - Profit wallet (receives operator share)
  - Withdraw extension enabled
- Local [Mempool](https://mempool.space/docs/api) instance (or use public API)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for public access (no port forwarding required)

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
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# LNbits (use public URL if serving over internet)
LNBITS_URL=https://lnbits.yourdomain.com
LNBITS_MAIN_INVOICE_KEY=...
LNBITS_MAIN_ADMIN_KEY=...
LNBITS_PAYOUT_ADMIN_KEY=...
LNBITS_PROFIT_ADMIN_KEY=...

# Game settings
PAYMENT_AMOUNT_SATS=21
FIRST_PLAY_BONUS_SATS=11

# Card images (absolute path)
CARDS_DIR=/path/to/cards

# Mempool API
MEMPOOL_API_URL=http://localhost:8081

# Web server
PORT=3002

# Admin
ADMIN_TELEGRAM_ID=your_telegram_id
```

---

## Deployment (Pop!_OS + Cloudflare Tunnel)

### Systemd service

```ini
# /etc/systemd/system/madamesatoshi.service
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
# ~/.cloudflared/madamesatoshi-config.yml
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
| [BTC-tarot-telegram-bot](https://github.com/artdesignbySF/BTC-tarot-telegram-bot) | Legacy standalone Telegram bot (superseded by this repo) |

---

## Roadmap

- [ ] Social links (X, GitHub, Telegram) in website footer
- [ ] Verify prompt visible in website UI
- [ ] Nostr interface
- [ ] UI space efficiency improvements
- [ ] script.js updated to display live block seed verify data

---

*Built with ⚡ and 🔮 — No banks. No servers. Just sats and fate.*
