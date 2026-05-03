const axios = require('axios');
const crypto = require('crypto');

const MEMPOOL_URL = process.env.MEMPOOL_API_URL || 'http://localhost:8081';
const CACHE_STALE_MS = 60 * 60 * 1000; // 1 hour

let cachedBlockInfo = { height: null, hash: null, timestamp: null };

async function getLatestBlockHash() {
  try {
    const [hashRes, heightRes] = await Promise.all([
      axios.get(MEMPOOL_URL + '/api/blocks/tip/hash', { timeout: 5000 }),
      axios.get(MEMPOOL_URL + '/api/blocks/tip/height', { timeout: 5000 })
    ]);
    const hash = hashRes.data.trim();
    const height = heightRes.data;
    console.log(`Block hash fetched: #${height} ${hash}`);
    cachedBlockInfo = { hash, height, timestamp: Date.now() };
    return hash;
  } catch (error) {
    console.log(`Block hash fetch failed: ${error.message}`);
    // Use cached hash if it's less than 1 hour old
    if (cachedBlockInfo.hash && cachedBlockInfo.timestamp && (Date.now() - cachedBlockInfo.timestamp < CACHE_STALE_MS)) {
      console.warn(`WARNING: Using cached block hash #${cachedBlockInfo.height} (age: ${Math.floor((Date.now() - cachedBlockInfo.timestamp) / 1000)}s)`);
      return cachedBlockInfo.hash;
    }
    // Last resort: cryptographically random seed (not provably fair, but game still works)
    const randomHash = crypto.randomBytes(32).toString('hex');
    console.warn('WARNING: No cached block hash available. Using crypto.randomBytes() — draw is NOT provably fair.');
    cachedBlockInfo = { hash: randomHash, height: null, timestamp: Date.now() };
    return randomHash;
  }
}

function getCachedBlockInfo() {
  return cachedBlockInfo;
}

module.exports = { getLatestBlockHash, getCachedBlockInfo };