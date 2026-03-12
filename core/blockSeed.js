const axios = require('axios');

const MEMPOOL_URL = process.env.MEMPOOL_API_URL || 'http://localhost:8081';

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
    console.warn('WARNING: Falling back to crypto.randomBytes()');
    return null;
  }
}

function getCachedBlockInfo() {
  return cachedBlockInfo;
}

module.exports = { getLatestBlockHash, getCachedBlockInfo };