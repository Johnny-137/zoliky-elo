// node check.js – ověří, že výpočet sedí s tabulkou
const assert = require("assert"), d = require("./data.json"), { computeSeason } = require("./elo.js");
const want = [{ Vitek: 1545, Erik: 1545, Bibi: 1485, Johnny: 1481, Denis: 1479, "eliška": 1466 },
  { Asiat: 1526, Duchod: 1458, Gay: 1487, "Voják": 1517, Ital: 1541, "Šmorgy": 1526, Kri: 1453, "Stý": 1491 }];
d.seasons.forEach((s, i) => {
  const { elo } = computeSeason(s, d.settings);
  for (const p in want[i]) assert.strictEqual(Math.round(elo[p]), want[i][p], `${s.name} ${p}: ${elo[p]}`);
});
console.log("OK");
