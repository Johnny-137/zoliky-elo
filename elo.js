// Elo podle patche 1.1 – stejné jako list Hry/Vývoj Elo v tabulce.
function computeSeason(season, s) {
  const elo = {}, hist = [];
  season.players.forEach(p => elo[p] = s.start);
  for (const g of season.games) {
    const ps = Object.keys(g), n = ps.length, before = { ...elo };
    for (const a of ps) {
      let sum = 0;
      for (const b of ps) {
        if (a === b) continue;
        const place = g[a] < g[b] ? 1 : g[a] === g[b] ? 0.5 : 0;
        const pts = Math.min(1, Math.max(0, 0.5 + (g[b] - g[a]) / (2 * s.clearLoss)));
        const S = s.closeWeight * place + (1 - s.closeWeight) * pts;
        const E = 1 / (1 + 10 ** ((before[b] - before[a]) / 400));
        sum += S - E;
      }
      elo[a] = before[a] + s.k / (n - 1) * sum;
    }
    hist.push({ game: g, before, after: { ...elo } });
  }
  return { elo, hist };
}
function rankOf(e, ranks) {
  const r = Math.round(e);
  let name = ranks[0][0];
  for (const [n, from] of ranks) if (r >= from) name = n;
  return name;
}
if (typeof module !== "undefined") module.exports = { computeSeason, rankOf };
