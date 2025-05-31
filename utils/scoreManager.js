const { QuickDB } = require("quick.db");
const db = new QuickDB();
async function updateScore(name, value) {
    await db.set(`scores.${name}`, value);
}

async function getScores() {
    return await db.get('scores') || {};
}

module.exports = { updateScore, getScores };