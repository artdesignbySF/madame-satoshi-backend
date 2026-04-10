'use strict';

// --- Tarot Card Data (with Advice Categories) ---
const majorArcana = [
    // Categories: security, backup, strategy, privacy, network, spending, hodl, learning, tech_dev, general
    {
        name: "00 The Fool",
        number: "00",
        image: "0-fool.webp",
        keywords: [
            "a risky leap",
            "new beginnings",
            "potential volatility",
            "untested paths",
        ],
        advice_category: "strategy",
    },
    {
        name: "I The Magician",
        number: "I",
        image: "1-magician.webp",
        keywords: [
            "skillful execution",
            "manifesting value",
            "resourcefulness",
            "technical mastery",
        ],
        advice_category: "tech_dev",
    },
    {
        name: "II The High Priestess",
        number: "II",
        image: "2-high-priestess.webp",
        keywords: [
            "hidden knowledge",
            "trusting intuition",
            "cypherpunk secrets",
            "verifying code",
        ],
        advice_category: "privacy",
    },
    {
        name: "III The Empress",
        number: "III",
        image: "3-empress.webp",
        keywords: [
            "creative abundance",
            "nurturing growth",
            "stacking sats",
            "fertile innovation",
        ],
        advice_category: "spending",
    },
    {
        name: "IV The Emperor",
        number: "IV",
        image: "4-emperor.webp",
        keywords: [
            "establishing structure",
            "regulatory control",
            "stable foundations",
            "protocol rules",
        ],
        advice_category: "security",
    },
    {
        name: "V The Hierophant",
        number: "V",
        image: "5-hierophant.webp",
        keywords: [
            "legacy systems",
            "institutional adoption",
            "learning tradition",
            "established consensus",
        ],
        advice_category: "learning",
    },
    {
        name: "VI The Lovers",
        number: "VI",
        image: "6-lovers.webp",
        keywords: [
            "important choices",
            "community alignment",
            "network collaboration",
            "harmonious partnerships",
        ],
        advice_category: "strategy",
    },
    {
        name: "VII The Chariot",
        number: "VII",
        image: "7-chariot.webp",
        keywords: [
            "determined drive",
            "overcoming obstacles",
            "focused ambition",
            "transaction speed",
        ],
        advice_category: "tech_dev",
    },
    {
        name: "VIII Strength",
        number: "VIII",
        image: "8-strength.webp",
        keywords: [
            "inner fortitude",
            "HODLing strong",
            "resilience to FUD",
            "patient courage",
        ],
        advice_category: "hodl",
    },
    {
        name: "IX The Hermit",
        number: "IX",
        image: "9-hermit.webp",
        keywords: [
            "deep research",
            "seeking truth",
            "independent verification",
            "sovereign thought",
        ],
        advice_category: "learning",
    },
    {
        name: "X Wheel of Fortune",
        number: "X",
        image: "10-wheel-of-fortune.webp",
        keywords: [
            "market cycles",
            "inevitable change",
            "adapting to trends",
            "DCA timing",
        ],
        advice_category: "strategy",
    },
    {
        name: "XI Justice",
        number: "XI",
        image: "11-justice.webp",
        keywords: [
            "protocol fairness",
            "immutable truth",
            "transparent accountability",
            "code is law",
        ],
        advice_category: "network",
    },
    {
        name: "XII The Hanged Man",
        number: "XII",
        image: "12-hanged-man.webp",
        keywords: [
            "a necessary pause",
            "shifting perspective",
            "calculated risk",
            "low time preference",
        ],
        advice_category: "hodl",
    },
    {
        name: "XIII Death",
        number: "XIII",
        image: "13-death.webp",
        keywords: [
            "radical transformation",
            "ending old ways",
            "protocol upgrades",
            "creative destruction",
        ],
        advice_category: "tech_dev",
    },
    {
        name: "XIV Temperance",
        number: "XIV",
        image: "14-temperance.webp",
        keywords: [
            "finding balance",
            "integrating systems",
            "patient development",
            "portfolio moderation",
        ],
        advice_category: "strategy",
    },
    {
        name: "XV The Tower",
        number: "XV",
        image: "15-tower.webp",
        keywords: [
            "sudden disruption",
            "exchange collapse",
            "protocol failure",
            "market shock",
        ],
        advice_category: "security",
    },
    {
        name: "XVI The Star",
        number: "XVI",
        image: "16-star.webp",
        keywords: [
            "renewed hope",
            "open-source inspiration",
            "guiding light",
            "optimistic future",
        ],
        advice_category: "network",
    },
    {
        name: "XVII The Moon",
        number: "XVII",
        image: "17-moon.webp",
        keywords: [
            "navigating uncertainty",
            "market FUD",
            "hidden variables",
            "shadowy super coders",
        ],
        advice_category: "privacy",
    },
    {
        name: "XVIII The Sun",
        number: "XVIII",
        image: "18-sun.webp",
        keywords: [
            "clarity and success",
            "peak enlightenment",
            "bull market joy",
            "protocol vitality",
        ],
        advice_category: "general",
    },
    {
        name: "XIX Judgment",
        number: "XIX",
        image: "19-judgement.webp",
        keywords: [
            "a final reckoning",
            "code audit results",
            "awakening to truth",
            "network consensus",
        ],
        advice_category: "backup",
    },
    {
        name: "XX The World",
        number: "XX",
        image: "20-world.webp",
        keywords: [
            "global adoption",
            "project completion",
            "network integration",
            "ultimate success",
        ],
        advice_category: "network",
    },
    {
        name: "XXI Ace of Pentacles",
        number: "XXI",
        image: "21-ace-of-pentacles.webp",
        keywords: [
            "new financial opportunity",
            "seed investment",
            "tangible results",
            "staking rewards",
        ],
        advice_category: "spending",
    },
];

// --- Advice Snippets ---
const advicePools = {
    security: [
        "Secure keys offline.",
        "Verify hardware wallet RNG.",
        "Use strong, unique passphrases.",
        "Update node/wallet software regularly.",
        "Beware unsolicited DMs/offers.",
    ],
    backup: [
        "Verify your seed phrase backup.",
        "Consider metal seed storage.",
        "Test your recovery plan.",
        "Backup wallet files/configs.",
        "Multisig needs seeds, xpubs/paths & config.",
    ],
    strategy: [
        "Low time preference wins.",
        "DCA through market cycles.",
        "Define your Bitcoin strategy.",
        "Avoid FOMO & panic selling.",
        "Understand risk management.",
    ],
    privacy: [
        "Mind your UTXO privacy.",
        "Consider CoinJoin/mixing tools.",
        "Use Tor for node connections.",
        "Label addresses privately.",
        "Avoid KYC where possible/legal.",
    ],
    network: [
        "Run your own full node for sovereignty.",
        "Verify software signatures.",
        "Understand mempool dynamics/fees.",
        "Support Bitcoin Core development.",
        "Learn about Layer 2 solutions.",
    ],
    spending: [
        "Consolidate UTXOs wisely for lower fees.",
        "Label outgoing transactions.",
        "Understand replace-by-fee (RBF).",
        "Use Lightning for small payments.",
        "Spend & replace to build the circular economy.",
    ], // Added new advice
    hodl: [
        "Patience during volatility is key.",
        "HODL with conviction.",
        "Understand Bitcoin's long-term value.",
        "Resist FUD with knowledge.",
        "Secure cold storage is paramount.",
    ],
    learning: [
        "Never stop learning; read whitepapers.",
        "Verify, don't trust.",
        "Understand consensus rules.",
        "Research before investing.",
        "Follow reputable Bitcoin educators.",
    ],
    tech_dev: [
        "Contribute to open-source projects.",
        "Master Lightning Network tools.",
        "Learn basic cryptography principles.",
        "Explore Bitcoin scripting potential.",
        "Build on Bitcoin!",
    ],
    general: [
        "Not your keys, not your coins.",
        "Stay humble, stack sats.",
        "Focus on the fundamentals.",
        "Bitcoin fixes this (eventually).",
        "Separate signal from noise.",
        "Spend & replace; build the circular economy.",
    ], // Added new advice
};

// --- Helper Functions ---
function getRandomKeyword(card) {
    if (!card?.keywords?.length) return "an unknown influence";
    return card.keywords[Math.floor(Math.random() * card.keywords.length)];
}

function getRandomAdvice(category = "general") {
    const pool = advicePools[category] || advicePools.general;
    if (!pool?.length) return advicePools.general[0]; // Absolute fallback
    return pool[Math.floor(Math.random() * pool.length)];
}

function capitalizeFirstLetter(string) {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- Block-Seeded Randomness ---
const crypto = require('crypto');

function generateBlockSeed(blockHash, userId, timestamp) {
    const combined = blockHash + userId + timestamp;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
}

// Simple seeded PRNG (mulberry32)
function createSeededRNG(seed) {
    return function() {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Draw Logic ---
function drawCards(seed) {
    const deck = [...majorArcana];

    // Use seeded RNG if seed provided, otherwise use Math.random()
    const rng = seed !== undefined ? createSeededRNG(seed) : Math.random;

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, 3);
}

// --- Fortune Calculation Logic [PERMUTATION-BASED with Position Meanings] ---
// Total possible outcomes: P(22,3) = 22 × 21 × 20 = 9,240 permutations
// Jackpot: 6 permutations (all orderings of Sun+World+Magician)
// Major wins: 66 permutations (11 combinations × 6 orderings each)
// Minor wins: 27 pairs × 6 permutations = 162 / 9,240
function calculateFortune(drawnCardObjects, poolAmount, minJackpotSeed, isFirstPlay = false) {
    let fortune = "";
    let sats_won = 0;
    let isJackpotWin = false;
    let win_tier = "none"; // 'jackpot', 'major', 'minor', or 'none'

    const cardNames = drawnCardObjects.map((cardObj) => {
        const parts = cardObj.name.split(" ");
        return parts.length > 2 ? parts.slice(1).join(" ") : parts[1];
    });

    // Position meanings in permutation order
    const pastCard = drawnCardObjects[0];
    const presentCard = drawnCardObjects[1];
    const futureCard = drawnCardObjects[2];

    const choose = (options) =>
        options[Math.floor(Math.random() * options.length)];

    const TIER_S_PERCENT = 1.0;
    const TIER_A_PERCENT = 0.35;
    const TIER_A_MIN_SATS = 75;
    const TIER_B_PERCENT = 0.15;
    const TIER_B_MIN_SATS = 21;
    const effectiveJackpotPool = Math.max(poolAmount, minJackpotSeed);

    // --- Check Winning Combinations First (Order-Sensitive) ---
    if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The World") &&
        cardNames.includes("The Magician")
    ) {
        let p = effectiveJackpotPool;
        sats_won = Math.min(p, poolAmount);
        fortune = `*** JACKPOT! *** Your past (${pastCard.number}), present (${presentCard.number}), and future (${futureCard.number}) align in ultimate Bitcoin synchronicity! ${sats_won} sats added to your balance!`;
        isJackpotWin = true;
        win_tier = "jackpot";
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The World") &&
        cardNames.includes("Ace of Pentacles")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Your journey flows through clarity (${pastCard.number}), completion (${presentCard.number}), and new prosperity (${futureCard.number})! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Emperor") &&
        cardNames.includes("The Empress") &&
        cardNames.includes("Strength")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Your past (${pastCard.number}) builds foundations, present (${presentCard.number}) channels authority, and future (${futureCard.number}) brings resilience! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Star") &&
        cardNames.includes("The Sun") &&
        cardNames.includes("Temperance")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past hope (${pastCard.number}) flows to present clarity (${presentCard.number}) and future balance (${futureCard.number})! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Magician") &&
        cardNames.includes("The Lovers") &&
        cardNames.includes("The World")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Your past skill (${pastCard.number}), present connection (${presentCard.number}), and future completion (${futureCard.number}) align! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Empress") &&
        cardNames.includes("The Emperor") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past nurturing (${pastCard.number}), present authority (${presentCard.number}), and future love (${futureCard.number}) flourish! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The Lovers") &&
        cardNames.includes("Ace of Pentacles")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past clarity (${pastCard.number}), present connection (${presentCard.number}), and future wealth (${futureCard.number}) manifest! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("Wheel of Fortune") &&
        cardNames.includes("The Lovers") &&
        cardNames.includes("The Magician")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past fortune (${pastCard.number}), present love (${presentCard.number}), and future mastery (${futureCard.number}) sync! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Star") &&
        cardNames.includes("The Sun") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past hope (${pastCard.number}), present brilliance (${presentCard.number}), and future connection (${futureCard.number}) ignite! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("Justice") &&
        cardNames.includes("Wheel of Fortune") &&
        cardNames.includes("The Star")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past fairness (${pastCard.number}), present cycles (${presentCard.number}), and future hope (${futureCard.number}) prevail! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Hermit") &&
        cardNames.includes("The Star") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past wisdom (${pastCard.number}), present inspiration (${presentCard.number}), and future love (${futureCard.number}) guide you! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("The Empress") &&
        cardNames.includes("The World") &&
        cardNames.includes("The Star")
    ) {
        let p = Math.max(
            TIER_A_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_A_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        fortune = `Major Win! Past abundance (${pastCard.number}), present completion (${presentCard.number}), and future hope (${futureCard.number}) align perfectly! +${sats_won} sats to your balance!`;
        win_tier = "major";
    } else if (
        cardNames.includes("Ace of Pentacles") &&
        cardNames.includes("Wheel of Fortune")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_1 = [
            `Minor Win! Past opportunity (${pastCard.number}) meets present fortune (${presentCard.number}). Your luck is turning! +${sats_won} sats to your balance!`,
            `Minor Win! The seeds you planted (${pastCard.number}) now bear fruit through fortune's cycles (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past openness (${pastCard.number}) aligns with present good timing (${presentCard.number}). Prosperity flows! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_1);
    } else if (
        cardNames.includes("The Chariot") &&
        cardNames.includes("Strength")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_2 = [
            `Minor Win! Your past momentum (${pastCard.number}) meets present inner strength (${presentCard.number}). Unstoppable! +${sats_won} sats to your balance!`,
            `Minor Win! Determination from before (${pastCard.number}) combines with quiet power now (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past ambition (${pastCard.number}) fuels present resilience (${presentCard.number}). You'll prevail! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_2);
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_3 = [
            `Minor Win! Past brilliance (${pastCard.number}) and present connection (${presentCard.number}) radiate together! +${sats_won} sats to your balance!`,
            `Minor Win! The light you found (${pastCard.number}) now deepens through meaningful bonds (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past joy (${pastCard.number}) meets present harmony (${presentCard.number}). Blessed alignment! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_3);
    } else if (
        cardNames.includes("The World") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_4 = [
            `Minor Win! Past cycles complete (${pastCard.number}), present bonds deepen (${presentCard.number}). Wholeness!  +${sats_won} sats to your balance!`,
            `Minor Win! What you finished (${pastCard.number}) makes space for deep connection (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past fulfillment (${pastCard.number}) and present unity (${presentCard.number}) create perfection! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_4);
    } else if (
        cardNames.includes("The Magician") &&
        cardNames.includes("The Star")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_5 = [
            `Minor Win! Your mastery (${pastCard.number}) awakens to higher calling (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Skills honed before (${pastCard.number}) now illuminate your path forward (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past resourcefulness (${pastCard.number}) meets present vision (${presentCard.number}). Manifest your dreams! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_5);
    } else if (
        cardNames.includes("The Empress") &&
        cardNames.includes("The Lovers")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_6 = [
            `Minor Win! Generosity you've cultivated (${pastCard.number}) blooms in heartfelt connection (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past care (${pastCard.number}) and present devotion (${presentCard.number}) create beauty! +${sats_won} sats to your balance!`,
            `Minor Win! The seeds you planted (${pastCard.number}) grow rich with love (${presentCard.number})! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_6);
    } else if (
        cardNames.includes("Justice") &&
        cardNames.includes("Wheel of Fortune")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_7 = [
            `Minor Win! Your righteous actions (${pastCard.number}) bear fruit through fortune's turn (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Balance you've sought (${pastCard.number}) manifests through good timing (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Past integrity (${pastCard.number}) aligns with present blessing (${presentCard.number}}. Justice served! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_7);
    } else if (
        cardNames.includes("The Hermit") &&
        cardNames.includes("The World")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_8 = [
            `Minor Win! Reflection and study (${pastCard.number}) culminate in wholeness (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Your inner quest (${pastCard.number}) reaches fulfillment (${presentCard.number}). Cycle complete! +${sats_won} sats to your balance!`,
            `Minor Win! Truth sought in silence (${pastCard.number}) manifests in tangible success (${presentCard.number})! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_8);
    } else if (
        cardNames.includes("The Empress") &&
        cardNames.includes("The Magician")
    ) {
        let p = Math.max(
            TIER_B_MIN_SATS,
            Math.floor(effectiveJackpotPool * TIER_B_PERCENT),
        );
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_9 = [
            `Minor Win! Creative abundance (${pastCard.number}) meets skillful action (${presentCard.number}). Manifest your vision! +${sats_won} sats to your balance!`,
            `Minor Win! Fertile imagination (${pastCard.number}) channels through technical mastery (${presentCard.number})! +${sats_won} sats to your balance!`,
            `Minor Win! Generosity (${pastCard.number}) and resourcefulness (${presentCard.number}) create prosperity! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_9);
    } else if (
        cardNames.includes("The High Priestess") &&
        cardNames.includes("The Hermit")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_10 = [
            `Minor Win! Hidden knowledge (II) meets deep research (IX). The answers you seek are closer than you think! +${sats_won} sats to your balance!`,
            `Minor Win! Intuition (II) and solitude (IX) reveal what others cannot see! +${sats_won} sats to your balance!`,
            `Minor Win! Secret wisdom (II) aligns with patient study (IX). Stack the knowledge! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_10);
    } else if (
        cardNames.includes("The Fool") &&
        cardNames.includes("Wheel of Fortune")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_11 = [
            `Minor Win! New beginnings (00) ride the turn of fate (X). Your boldness is rewarded! +${sats_won} sats to your balance!`,
            `Minor Win! The leap of faith (00) meets fortune's spin (X). Chance favors the brave! +${sats_won} sats to your balance!`,
            `Minor Win! Fearless beginnings (00) and lucky timing (X) align! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_11);
    } else if (
        cardNames.includes("Death") &&
        cardNames.includes("Judgment")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_12 = [
            `Minor Win! Transformation (XIII) awakens reckoning (XIX). One cycle ends, a new one rises! +${sats_won} sats to your balance!`,
            `Minor Win! The great reset (XIII) leads to clarity (XIX). Rebirth is your reward! +${sats_won} sats to your balance!`,
            `Minor Win! Change (XIII) and awakening (XIX) — the ultimate reset combo! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_12);
    } else if (
        cardNames.includes("The Star") &&
        cardNames.includes("The Moon")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_13 = [
            `Minor Win! Hope (XVI) navigates the unknown (XVII). Light guides you through darkness! +${sats_won} sats to your balance!`,
            `Minor Win! Guiding star (XVI) and mysterious moon (XVII) — two faces of the night sky align! +${sats_won} sats to your balance!`,
            `Minor Win! Inspiration (XVI) meets illusion (XVII). Trust your inner compass! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_13);
    } else if (
        cardNames.includes("Temperance") &&
        cardNames.includes("Justice")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_14 = [
            `Minor Win! Balance (XIV) meets fairness (XI). The scales tip in your favor! +${sats_won} sats to your balance!`,
            `Minor Win! Patient equilibrium (XIV) and righteous order (XI) prevail! +${sats_won} sats to your balance!`,
            `Minor Win! Harmony (XIV) and justice (XI) — the universe corrects course! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_14);
    } else if (
        cardNames.includes("The Magician") &&
        cardNames.includes("The High Priestess")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_15 = [
            `Minor Win! Active will (I) meets passive knowing (II). The great duality unlocks fortune! +${sats_won} sats to your balance!`,
            `Minor Win! Skill (I) and intuition (II) — the perfect partnership manifests! +${sats_won} sats to your balance!`,
            `Minor Win! Mastery (I) aligns with mystery (II). Your power is complete! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_15);
    } else if (
        cardNames.includes("The Emperor") &&
        cardNames.includes("The Hierophant")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_16 = [
            `Minor Win! Secular power (IV) meets institutional wisdom (V). The establishment rewards you! +${sats_won} sats to your balance!`,
            `Minor Win! Governance (IV) and protocol (V) align — code is law, and law is on your side! +${sats_won} sats to your balance!`,
            `Minor Win! Authority (IV) and structure (V) create stability and prosperity! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_16);
    } else if (
        cardNames.includes("The Chariot") &&
        cardNames.includes("The Emperor")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_17 = [
            `Minor Win! Determined drive (VII) backed by solid foundations (IV). Execution meets governance! +${sats_won} sats to your balance!`,
            `Minor Win! Victory in motion (VII) meets stable authority (IV). Unstoppable force! +${sats_won} sats to your balance!`,
            `Minor Win! Momentum (VII) and mastery (IV) — nothing can stop you now! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_17);
    } else if (
        cardNames.includes("The Fool") &&
        cardNames.includes("The Star")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_18 = [
            `Minor Win! The leap of faith (00) is guided by starlight (XVI). Optimism rewarded! +${sats_won} sats to your balance!`,
            `Minor Win! New beginnings (00) find their guiding light (XVI). Your path is illuminated! +${sats_won} sats to your balance!`,
            `Minor Win! Innocent boldness (00) meets cosmic inspiration (XVI)! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_18);
    } else if (
        cardNames.includes("Death") &&
        cardNames.includes("The Tower")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_19 = [
            `Minor Win! Double disruption — transformation (XIII) and the great reset (XV). The old must fall! +${sats_won} sats to your balance!`,
            `Minor Win! Radical change (XIII) follows sudden collapse (XV). From ruins, you rise! +${sats_won} sats to your balance!`,
            `Minor Win! The reset pair (XIII + XV) — destruction precedes your rebirth! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_19);
    } else if (
        cardNames.includes("The Sun") &&
        cardNames.includes("Judgment")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_20 = [
            `Minor Win! Peak clarity (XVIII) meets final reckoning (XIX). The bull market awakening! +${sats_won} sats to your balance!`,
            `Minor Win! Radiant truth (XVIII) and cosmic call (XIX) — you are seen and celebrated! +${sats_won} sats to your balance!`,
            `Minor Win! Joy (XVIII) and awakening (XIX) — the universe applauds your journey! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_20);
    } else if (
        cardNames.includes("The Moon") &&
        cardNames.includes("The High Priestess")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_21 = [
            `Minor Win! Hidden variables (XVII) meet secret knowledge (II). The two mystery cards reveal their truth! +${sats_won} sats to your balance!`,
            `Minor Win! Illusion (XVII) and intuition (II) — only the wise can read these signs! +${sats_won} sats to your balance!`,
            `Minor Win! The veil lifts — Moon (XVII) and Priestess (II) share their secrets with you! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_21);
    } else if (
        cardNames.includes("The Hanged Man") &&
        cardNames.includes("The Hermit")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_22 = [
            `Minor Win! Low time preference (XII) meets deep research (IX). The ultimate HODL and study combo! +${sats_won} sats to your balance!`,
            `Minor Win! Patient waiting (XII) and solitary wisdom (IX) — you played the long game! +${sats_won} sats to your balance!`,
            `Minor Win! Surrender (XII) and introspection (IX) reveal hidden treasure! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_22);
    } else if (
        cardNames.includes("The World") &&
        cardNames.includes("Ace of Pentacles")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_23 = [
            `Minor Win! Completion (XX) opens new financial opportunity (XXI). The cycle ends, the seed is planted! +${sats_won} sats to your balance!`,
            `Minor Win! Total fulfillment (XX) meets new abundance (XXI). What a time to be alive! +${sats_won} sats to your balance!`,
            `Minor Win! The world is yours (XX) and wealth follows (XXI)! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_23);
    } else if (
        cardNames.includes("The Hierophant") &&
        cardNames.includes("Justice")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_24 = [
            `Minor Win! Established consensus (V) meets code is law (XI). Institutional fairness prevails! +${sats_won} sats to your balance!`,
            `Minor Win! Tradition (V) and truth (XI) — the system works in your favor! +${sats_won} sats to your balance!`,
            `Minor Win! Wisdom of ages (V) aligns with cosmic balance (XI)! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_24);
    } else if (
        cardNames.includes("The Fool") &&
        cardNames.includes("The Magician")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_25 = [
            `Minor Win! Potential energy (00) meets raw skill (I). The beginning of mastery! +${sats_won} sats to your balance!`,
            `Minor Win! Innocent curiosity (00) unleashed by focused will (I). Magic happens! +${sats_won} sats to your balance!`,
            `Minor Win! The journey begins (00) with all the tools you need (I)! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_25);
    } else if (
        cardNames.includes("Temperance") &&
        cardNames.includes("The Star")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_26 = [
            `Minor Win! Patient integration (XIV) meets renewed hope (XVI). Two of the great healing cards align! +${sats_won} sats to your balance!`,
            `Minor Win! Balance (XIV) and inspiration (XVI) — you are on the path to wholeness! +${sats_won} sats to your balance!`,
            `Minor Win! Gentle flow (XIV) guided by starlight (XVI). Healing and hope! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_26);
    } else if (
        cardNames.includes("Strength") &&
        cardNames.includes("The Hanged Man")
    ) {
        let p = Math.max(TIER_B_MIN_SATS, Math.floor(effectiveJackpotPool * TIER_B_PERCENT));
        sats_won = Math.min(p, poolAmount);
        win_tier = "minor";
        const fortuneVariants_27 = [
            `Minor Win! Inner fortitude (VIII) meets low time preference (XII). The ultimate HODL through the wait! +${sats_won} sats to your balance!`,
            `Minor Win! Quiet power (VIII) and patient surrender (XII) — you held strong! +${sats_won} sats to your balance!`,
            `Minor Win! Resilience (VIII) and acceptance (XII) create unexpected reward! +${sats_won} sats to your balance!`,
        ];
        fortune = choose(fortuneVariants_27);
    }

    // --- Non-Winning Fortunes: Position-Based Templates with Advice ---
    else {
        const kw1 = getRandomKeyword(pastCard);
        const kw2 = getRandomKeyword(presentCard);
        const adviceCategory =
            futureCard.advice_category || presentCard.advice_category || "general";
        const adviceSnippet = getRandomAdvice(adviceCategory);

        // Define templates with explicit position meanings (Past/Present/Future)
        const templates = [
            `Your past brought ${kw1} (${pastCard.number}). Now you encounter ${kw2} (${presentCard.number}). Your wisdom going forward: ${adviceSnippet} (${futureCard.number}).`,
            `Past foundations of ${kw1} (${pastCard.number}) meet present ${kw2} (${presentCard.number}). The path ahead calls you to: ${adviceSnippet} (${futureCard.number}).`,
            `You traversed ${kw1} (${pastCard.number}) and now face ${kw2} (${presentCard.number}). To move forward, remember: ${adviceSnippet} (${futureCard.number}).`,
            `The seeds of ${kw1} (${pastCard.number}) grew into present ${kw2} (${presentCard.number}). Your next step: ${adviceSnippet} (${futureCard.number}).`,
            `Your past was marked by ${kw1} (${pastCard.number}); now ${kw2} (${presentCard.number}) demands attention. Focus on: ${adviceSnippet} (${futureCard.number}).`,
            `From ${kw1} (${pastCard.number}) you evolved to present ${kw2} (${presentCard.number}). Moving forward, cultivate: ${adviceSnippet} (${futureCard.number}).`,
        ];

        fortune = choose(templates);
        fortune = capitalizeFirstLetter(fortune); // Ensure first letter is capitalized
        if (isFirstPlay && win_tier === null) { fortune += " Madame Satoshi welcomes you with 11 sats. Your journey begins."; }
    }

    if (fortune === "") {
        fortune =
            "The blockchain remains enigmatic... [Error generating fortune]";
    }
    sats_won = Math.max(0, Math.floor(sats_won));

    return { fortune: fortune, sats_won: sats_won, is_jackpot: isJackpotWin, win_tier: win_tier };
}

const WIN_TYPES = { JACKPOT: 'jackpot', MAJOR: 'major', MINOR: 'minor' };
const PAYOUT_PERCENTAGES = { jackpot: 1.0, major: 0.35, minor: 0.15 };
module.exports = { drawCards, calculateFortune, generateBlockSeed, WIN_TYPES, PAYOUT_PERCENTAGES };



