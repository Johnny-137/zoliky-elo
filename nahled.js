// Update 3.0: šachové hodiny, odznaky, konec sezóny, sdílení hry jako obrázek. Turnaj je zatím jen pro admina (DEV_TABS v index.html).
// Turnaj je zatím testovací: ukládá se jen v tomto prohlížeči a do Elo ligy se nepočítá.

// --- turnaj: přihlášky, pavouk 1 na 1, testovací Elo ---
const T_KEY = "zoliky-turnaj";
let T = (() => { try { return JSON.parse(store(T_KEY)) || null; } catch { return null; } })() || { nazev: "Turnaj", bo: 2, hraci: [], kola: null, seq: 0 };
let tsel = null, tpen = {};
const tsave = () => { store(T_KEY, JSON.stringify(T)); render(); };
const leagueElo = p => S[D.seasons[0].id].st[p]?.elo ?? D.settings.start;
// Standardní nasazení: 1 hraje s posledním, nejlepší dva se můžou potkat až ve finále.
function seedOrder(n) { let o = [1]; while (o.length < n) { const m = o.length * 2; o = o.flatMap(x => [x, m + 1 - x]); } return o; }
const twins = m => m.hry.reduce((w, g) => (g.a === 0 ? w[0]++ : w[1]++, w), [0, 0]);
function twin(m) {
  if (m.a === false) return m.b || null;
  if (m.b === false) return m.a || null;
  if (!m.a || !m.b) return null;
  const [wa, wb] = twins(m);
  return wa >= T.bo ? m.a : wb >= T.bo ? m.b : null;
}
function tsync() {
  for (let r = 1; r < T.kola.length; r++) T.kola[r].forEach((m, i) => {
    const a = twin(T.kola[r - 1][2 * i]), b = twin(T.kola[r - 1][2 * i + 1]);
    if (m.a !== a || m.b !== b) Object.assign(m, { a, b, hry: [] });
  });
}
function tstart() {
  const ps = T.hraci.filter(h => h.ok).map(h => h.j).sort((x, y) => leagueElo(y) - leagueElo(x));
  if (ps.length < 2) return alert("Schval aspoň 2 hráče.");
  const size = 2 ** Math.ceil(Math.log2(ps.length)), o = seedOrder(size);
  T.kola = [];
  for (let n = size / 2; n >= 1; n /= 2) T.kola.push(Array.from({ length: n }, () => ({ a: null, b: null, hry: [] })));
  T.kola[0].forEach((m, i) => { m.a = ps[o[2 * i] - 1] ?? false; m.b = ps[o[2 * i + 1] - 1] ?? false; });
  tsync(); tsel = null; tsave();
}
const roundName = (r, n) => ["Finále", "Semifinále", "Čtvrtfinále", "Osmifinále"][n - 1 - r] || `Kolo ${r + 1}`;
// Elo jako by se turnajové hry zapsaly do ligy po všech dosavadních hrách (jen výpočet, nic se neukládá).
function telo() {
  const s = D.seasons[0], tg = T.kola ? T.kola.flat().flatMap(m => m.hry.map(g => ({ n: g.n, m, game: { [m.a]: g.a, [m.b]: g.b } }))).sort((x, y) => x.n - y.n) : [];
  const players = [...new Set(s.players.concat(T.hraci.map(h => h.j)))];
  const { hist } = computeSeason({ players, games: s.games.concat(tg.map(x => x.game)) }, D.settings);
  const by = new Map(tg.map((x, k) => [x.n, hist[s.games.length + k]]));
  return { by, after: hist.length > s.games.length ? hist.at(-1).after : {} };
}
function tplaces() {
  const pl = {}, n = T.kola.length;
  T.kola.forEach((ms, r) => ms.forEach(m => {
    const w = twin(m);
    [m.a, m.b].forEach(p => { if (p && w && p !== w) pl[p] = r === n - 1 ? "2." : `${2 ** (n - 1 - r) + 1}.–${2 ** (n - r)}.`; });
  }));
  const champ = twin(T.kola[n - 1][0]);
  if (champ) pl[champ] = "1.";
  return pl;
}

VIEWS.turnaj = () => {
  const ok = T.hraci.filter(h => h.ok), wait = T.hraci.filter(h => !h.ok);
  const top = `<p class="note">Testovací režim: turnaj se ukládá jen v tomto prohlížeči a do Elo ligy se nezapočítá. Elo níže ukazuje, jak by se změnilo.</p>`;
  const reg = `<div class="cols"><div class="panel"><h2>Přihláška</h2>
      <p class="muted">Takhle se přihlásí kdokoli. Po vydání půjde formulář do tabulky a admin přihlášky schválí.</p>
      <form id="tf" class="row"><input id="tjm" maxlength="20" placeholder="Jméno" autocomplete="off" aria-label="Jméno"><button>Přihlásit</button></form>
      <p><button type="button" id="tliga">Přihlásit všechny hráče ligy</button></p></div>
    <div class="panel"><h2>Schválení · ${ok.length} schváleno, ${wait.length} čeká</h2>
      <table>${T.hraci.map((h, i) => `<tr><td>${esc(h.j)}</td><td class="num">${fmt(leagueElo(h.j))}</td><td class="muted">${h.ok ? "schválen" : "čeká"}</td>
        <td class="num">${h.ok ? "" : `<button type="button" data-tok="${i}">${ic("check")} Schválit</button>`} <button type="button" data-tdel="${i}" aria-label="Odebrat">${ic("x")}</button></td></tr>`).join("") || `<tr><td class="muted">Zatím nikdo.</td></tr>`}</table>
      <p class="row"><label>Postup na <select id="tbo">${[1, 2, 3].map(b => `<option value="${b}" ${b === T.bo ? "selected" : ""}>${b} ${b === 1 ? "výhru" : "výhry"}</option>`).join("")}</select></label>
        <button type="button" class="pri" id="tgo" ${ok.length < 2 ? "disabled" : ""}>Vylosovat pavouka</button></p></div></div>`;
  if (!T.kola) return top + reg;
  const E = telo(), pl = tplaces(), n = T.kola.length;
  const side = (m, p, w, wins, seed) => p === false ? `<div class="s lose"><i></i><span>volný los</span></div>`
    : `<div class="s ${w ? (w === p ? "win" : "lose") : ""}"><i>${seed || ""}</i><span>${p ? esc(p) : "—"}</span><b>${p && m.a !== false && m.b !== false ? wins : ""}</b></div>`;
  const seeds = Object.fromEntries(T.hraci.filter(h => h.ok).map(h => h.j).sort((x, y) => leagueElo(y) - leagueElo(x)).map((p, i) => [p, i + 1]));
  const bracket = `<div class="bracket">${T.kola.map((ms, r) => `<div class="round"><h3>${roundName(r, n)}</h3><div class="rm">${ms.map((m, i) => {
    const w = twin(m), [wa, wb] = twins(m);
    return `<div class="match ${tsel && tsel[0] === r && tsel[1] === i ? "on" : ""}" data-tm="${r},${i}" role="button" tabindex="0">${side(m, m.a, w, wa, r ? "" : seeds[m.a])}${side(m, m.b, w, wb, r ? "" : seeds[m.b])}</div>`; }).join("")}</div></div>`).join("")}</div>`;
  let detail = `<p class="muted">Klikni na zápas v pavouku a zapiš hry.</p>`;
  const m = tsel && T.kola[tsel[0]][tsel[1]];
  if (m) {
    const w = twin(m), ready = m.a && m.b, [wa, wb] = twins(m);
    const games = m.hry.map((g, k) => { const h = E.by.get(g.n), d = p => h ? fmt(h.after[p]) - fmt(h.before[p]) : 0, sg = x => (x >= 0 ? "+" : "") + x;
      return `<tr><td>Hra ${k + 1}</td><td class="num">${g.a === 0 ? ic("trophy") : g.a}</td><td class="num ${d(m.a) >= 0 ? "up" : "down"}">${sg(d(m.a))}</td><td class="num">${g.b === 0 ? ic("trophy") : g.b}</td><td class="num ${d(m.b) >= 0 ? "up" : "down"}">${sg(d(m.b))}</td></tr>`; }).join("");
    detail = !ready ? `<p class="muted">Čeká se na soupeře.</p>` : `<table><tr><th></th><th class="num" colspan="2">${esc(m.a)} · ${wa}</th><th class="num" colspan="2">${esc(m.b)} · ${wb}</th></tr>${games}</table>
      ${w ? `<p>Postupuje <b>${esc(w)}</b>.</p>` : `<form id="tgf"><div class="duel">${[m.a, m.b].map((p, j) => `<label>${esc(p)}${tpen[p] ? ` <span class="down">+${tpen[p]} za čas</span>` : ""}<input name="${j ? "b" : "a"}" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="body"></label>`).join("")}</div>
        <p class="row"><button class="pri">Zapsat hru</button><button type="button" id="tclock">${ic("clock")} Hodiny pro tento zápas</button><span id="tgmsg" class="muted" role="status"></span></p></form>`}
      ${m.hry.length ? `<p><button type="button" id="tundo">Smazat poslední hru</button></p>` : ""}`;
  }
  const names = Object.keys(seeds);
  const st = names.map(p => {
    const ms = T.kola.flat().filter(x => x.a === p || x.b === p), mine = ms.flatMap(x => x.hry.map(g => x.a === p ? g.a : g.b));
    const mw = ms.filter(x => twin(x) === p && x.a !== false && x.b !== false).length, ml = ms.filter(x => twin(x) && twin(x) !== p).length;
    const after = E.after[p] ?? leagueElo(p), d = fmt(after) - fmt(leagueElo(p));
    return { p, place: pl[p] || "hraje", mw, ml, gw: mine.filter(v => v === 0).length, gl: mine.filter(v => v > 0).length, after, d };
  }).sort((x, y) => (parseInt(x.place) || 99) - (parseInt(y.place) || 99) || y.mw - x.mw);
  return top + `<div class="panel"><h2>${esc(T.nazev)} · pavouk 1 na 1, postup na ${T.bo} ${T.bo === 1 ? "výhru" : "výhry"}</h2>${bracket}
      <p class="row"><button type="button" id="treset">Nový turnaj</button></p></div>
    <div class="cols"><div class="panel"><h2>Zápas</h2>${detail}</div>
    <div class="panel"><h2>Pořadí turnaje</h2><table><tr><th>Místo</th><th>Hráč</th><th class="num">Zápasy</th><th class="num">Hry</th><th class="num">Elo (test)</th></tr>
      ${st.map(x => `<tr><td>${x.place}</td><td><div class="player" style="cursor:auto">${emblem(rank(x.after), "emb sm")}${esc(x.p)}</div></td><td class="num">${x.mw}–${x.ml}</td><td class="num">${x.gw}–${x.gl}</td>
        <td class="num">${fmt(x.after)} <span class="${x.d >= 0 ? "up" : "down"}">${x.d >= 0 ? "+" : ""}${x.d}</span></td></tr>`).join("")}</table></div></div>`;
};
document.addEventListener("submit", e => {
  if (e.target.id === "tf") {
    e.preventDefault();
    const j = $("#tjm").value.trim();
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,19}$/u.test(j)) return alert("Jméno: jen písmena, čísla a mezery, max 20 znaků.");
    if (T.hraci.some(h => h.j === j)) return alert("Tohle jméno už je přihlášené.");
    T.hraci.push({ j, ok: false }); tsave();
  }
  if (e.target.id === "tgf") {
    e.preventDefault();
    const m = T.kola[tsel[0]][tsel[1]], f = e.target, msg = $("#tgmsg");
    const v = ["a", "b"].map(k => f.elements[k].value);
    if (v.some(x => !/^\d{1,3}$/.test(x))) return msg.textContent = "Zapiš body oběma hráčům.";
    const [a, b] = v.map(Number).map((x, j) => x + (tpen[[m.a, m.b][j]] || 0));
    if ((a === 0) === (b === 0)) return msg.textContent = "Právě jeden hráč musí zavřít (0 bodů).";
    m.hry.push({ a, b, n: ++T.seq }); tpen = {}; tsync(); tsave();
  }
});
document.addEventListener("input", e => { if (e.target.closest("#tgf")) e.target.value = e.target.value.replace(/\D/g, ""); });
document.addEventListener("change", e => { if (e.target.id === "tbo") { T.bo = +e.target.value; if (T.kola) tsync(); tsave(); } });
document.addEventListener("click", e => {
  const t = e.target.closest("button,[data-tm]");
  if (!t) return;
  if (t.id === "tliga") { S[D.seasons[0].id].table.forEach(x => { if (!T.hraci.some(h => h.j === x.p)) T.hraci.push({ j: x.p, ok: false }); }); tsave(); }
  else if (t.dataset.tok) { T.hraci[+t.dataset.tok].ok = true; tsave(); }
  else if (t.dataset.tdel) { if (T.kola && !confirm("Pavouk už je vylosovaný. Odebrat hráče a zrušit pavouka?")) return; T.hraci.splice(+t.dataset.tdel, 1); T.kola = null; tsave(); }
  else if (t.id === "tgo") { if (!T.kola || confirm("Vylosovat znovu? Zapsané zápasy se smažou.")) tstart(); }
  else if (t.id === "treset") { if (confirm("Smazat turnaj a začít nový?")) { T = { nazev: "Turnaj", bo: 2, hraci: [], kola: null, seq: 0 }; tsel = null; tsave(); } }
  else if (t.dataset.tm) { tsel = t.dataset.tm.split(",").map(Number); tpen = {}; render(); }
  else if (t.id === "tundo") { T.kola[tsel[0]][tsel[1]].hry.pop(); tsync(); tsave(); }
  else if (t.id === "tclock") { const m = T.kola[tsel[0]][tsel[1]]; clockStart([m.a, m.b], 5, tsel); }
});

// --- šachové hodiny: jeden telefon uprostřed stolu, ťuknutím na svůj čas předáš tah dalšímu ---
const PEN = 5; // trestné body za každou započatou minutu přes čas
let C = null, cpick = [], cmin = 5, cres = null;
const cpen = ms => ms < 0 ? PEN * Math.ceil(-ms / 60000) : 0;
const ctime = ms => { const a = Math.abs(ms), s = Math.ceil(a / 1000) - (ms < 0 ? 1 : 0); return (ms < 0 ? "+" : "") + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
VIEWS.hodiny = () => {
  const ps = S[D.seasons[0].id].table.map(x => x.p);
  return `<div class="panel"><h2>Šachové hodiny</h2>
    <p class="muted">Telefon polož doprostřed stolu: kdo dohraje tah, ťukne na svůj čas a hodiny běží dalšímu. Na PC předáš tah mezerníkem (nebo kliknutím), P je pauza a F celá obrazovka. Za každou započatou minutu přes čas je +${PEN} trestných bodů.</p>
    <div id="cbubs">${ps.map(p => `<label class="bub"><input type="checkbox" data-cp="${esc(p)}" ${cpick.includes(p) ? "checked" : ""}><span>${emblem(rank(leagueElo(p)))}${esc(p)}</span></label>`).join("")}</div>
    <p class="muted">Pořadí tahů: ${cpick.map(esc).join(" → ") || "vyber hráče"}</p>
    <p class="row"><label>Čas na hráče <input id="cmin" inputmode="numeric" maxlength="2" value="${cmin}" style="width:56px;text-align:center"> min</label>
      <button type="button" class="pri" id="cgo" ${cpick.length < 2 ? "disabled" : ""}>${ic("clock")} Spustit</button></p></div>
    ${cres ? `<div class="panel"><h2>Poslední hra</h2><table><tr><th>Hráč</th><th class="num">Zbylo</th><th class="num">Trestné body</th></tr>
      ${cres.map(r => `<tr><td>${esc(r.p)}</td><td class="num ${r.left < 0 ? "down" : ""}">${ctime(r.left)}</td><td class="num">${r.pen ? "+" + r.pen : "0"}</td></tr>`).join("")}</table>
      <p class="muted">Trestné body za čas připočti k bodům z karet při zápisu hry.</p></div>` : ""}`;
};
document.addEventListener("change", e => {
  const p = e.target.dataset?.cp;
  if (p === undefined) return;
  cpick = e.target.checked ? cpick.concat(p) : cpick.filter(x => x !== p);
  render();
});
document.addEventListener("input", e => { if (e.target.id === "cmin") { e.target.value = e.target.value.replace(/\D/g, ""); cmin = +e.target.value || 5; } });
document.addEventListener("click", e => { if (e.target.closest("#cgo")) clockStart(cpick, cmin, null); });

function clockStart(ps, min, back) {
  C = { ps, left: ps.map(() => min * 60000), act: 0, run: true, t: performance.now(), back };
  const el = document.createElement("div");
  el.className = "clock"; el.id = "clock";
  el.innerHTML = `<div class="cgrid ${ps.length === 2 ? "two" : "many"}">${ps.map((p, i) => `<div class="ct" data-ci="${i}"><div class="n">${esc(p)}</div><div class="t"></div><div class="pen"></div></div>`).join("")}</div>
    <div class="cbar"><span class="muted khint">Mezerník = další hráč · P = pauza · F = celá obrazovka</span><button type="button" id="cpause">${ic("pause")} Pauza</button><button type="button" id="cfull">${ic("full")} Celá obrazovka</button><button type="button" id="cend">Konec hry</button></div>`;
  document.body.appendChild(el);
  navigator.wakeLock?.request("screen").then(l => C.lock = l).catch(() => {});
  C.iv = setInterval(ctick, 100); ctick();
}
function ctick() {
  const now = performance.now();
  if (C.run) C.left[C.act] -= now - C.t;
  C.t = now;
  document.querySelectorAll("#clock .ct").forEach((el, i) => {
    el.classList.toggle("act", i === C.act); el.classList.toggle("over", C.left[i] < 0);
    el.querySelector(".t").textContent = ctime(C.left[i]);
    el.querySelector(".pen").textContent = C.left[i] < 0 ? `+${cpen(C.left[i])} bodů` : "";
  });
}
const cpass = () => { if (!C.run) return; ctick(); C.act = (C.act + 1) % C.ps.length; ctick(); navigator.vibrate?.(30); };
document.addEventListener("pointerdown", e => {
  if (!C) return;
  const t = e.target.closest("[data-ci]");
  if (t && +t.dataset.ci === C.act) cpass();
});
// Na PC: mezerník nebo Enter předá tah, P pauza, F celá obrazovka.
document.addEventListener("keydown", e => {
  if (!C || e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === " " || k === "enter") { e.preventDefault(); cpass(); }
  else if (k === "p") $("#cpause").click();
  else if (k === "f") $("#cfull").click();
});
document.addEventListener("click", e => {
  if (!C) return;
  const pb = e.target.closest("#cpause");
  if (pb) { ctick(); C.run = !C.run; pb.innerHTML = C.run ? `${ic("pause")} Pauza` : `${ic("play")} Pokračovat`; }
  if (e.target.closest("#cfull")) document.fullscreenElement ? document.exitFullscreen() : $("#clock").requestFullscreen?.().catch(() => {});
  if (e.target.closest("#cend")) {
    if (!confirm("Ukončit hru a spočítat trestné body za čas?")) return;
    ctick(); clearInterval(C.iv); C.lock?.release();
    if (document.fullscreenElement) document.exitFullscreen();
    $("#clock").remove();
    cres = C.ps.map((p, i) => ({ p, left: C.left[i], pen: cpen(C.left[i]) }));
    if (C.back) { tpen = Object.fromEntries(cres.map(r => [r.p, r.pen])); tsel = C.back; tab = "turnaj"; } else tab = "hodiny";
    C = null; render();
  }
});

// --- odznaky (achievementy) ---
const BADGES = [
  ["První výhra", "Poprvé zavři hru.", "#c8aa6e", c => c.win],
  ["Hattrick", "Vyhraj 3 hry v řadě.", "#d9ae4a", c => c.streak >= 3],
  ["Neporazitelný", "Vyhraj 5 her v řadě.", "#f2d27a", c => c.streak >= 5],
  ["Velký stůl", "Vyhraj hru, kde hrálo aspoň 5 hráčů.", "#7690ff", c => c.win && c.n >= 5],
  ["Těsně vedle", "Skonči s 1 až 5 body.", "#a9b4c0", c => c.pts >= 1 && c.pts <= 5],
  ["Plná ruka", "Skonči se 150 a víc body.", "#e3404d", c => c.pts >= 150],
  ["Raketa", "Získej v jedné hře 20 a víc Elo.", "#36b3c7", c => c.delta >= 20],
  ["Návrat", "Vyhraj po 5 hrách bez výhry.", "#2fc27a", c => c.win && c.dry >= 5],
  ["Veterán", "Odehraj 50 her.", "#a8673f", c => c.games >= 50],
  ["Gold", "Dosáhni ranku Gold.", RANK_COLOR.Gold, c => tier(rank(c.elo)) >= tier("Gold")],
  ["Platinum", "Dosáhni ranku Platinum.", RANK_COLOR.Platinum, c => tier(rank(c.elo)) >= tier("Platinum")],
  ["Diamond", "Dosáhni ranku Diamond.", RANK_COLOR.Diamond, c => tier(rank(c.elo)) >= tier("Diamond")]
];
function earned() {
  const got = BADGES.map(() => []), run = {};
  S[cur.id].hist.forEach((h, i) => Object.entries(h.game).forEach(([p, pts]) => {
    const r = run[p] ||= { streak: 0, dry: 0, games: 0 }, win = pts === 0;
    const c = { win, pts, n: Object.keys(h.game).length, delta: h.after[p] - h.before[p], elo: h.after[p], streak: win ? r.streak + 1 : 0, dry: r.dry, games: r.games + 1 };
    BADGES.forEach((b, k) => { if (!got[k].some(x => x.p === p) && b[3](c)) got[k].push({ p, i }); });
    Object.assign(r, { streak: c.streak, dry: win ? 0 : r.dry + 1, games: c.games });
  }));
  return got;
}
const medal = c => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 4h6l4 12h-6zM32 4h-6l-4 12h6z" fill="${c}" opacity=".55"/><circle cx="24" cy="30" r="13" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="24" cy="30" r="8" fill="${c}" opacity=".85"/></svg>`;
VIEWS.odznaky = () => {
  const got = earned();
  return `<div class="panel"><h2>Odznaky · ${esc(cur.name)}</h2><p class="muted">Odznaky se počítají z odehraných her, hráč dostane každý jen jednou. Číslo je hra, ve které ho získal.</p>
    <div class="badges">${BADGES.map(([n, d, c], k) => `<div class="badge ${got[k].length ? "" : "none"}">${medal(c)}<b>${n}</b><small>${d}</small>
      <div class="who">${got[k].map(x => `${esc(x.p)} <span class="muted">#${x.i + 1}</span>`).join(", ") || `<span class="muted">Zatím nikdo</span>`}</div></div>`).join("")}</div></div>`;
};

// --- konec sezóny: ceny a vyhlášení ---
function awards() {
  const { table } = S[cur.id], ps = table.map(x => pstats(x.p)), reg = ps.filter(x => x.games >= 10);
  const best = (arr, f, lo) => arr.length ? arr.reduce((a, b) => (lo ? f(b) < f(a) : f(b) > f(a)) ? b : a) : null;
  const num = v => typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return [
    ["3. místo", table[2], x => `${fmt(x.elo)} Elo`],
    ["2. místo", table[1], x => `${fmt(x.elo)} Elo`],
    ["Šampion sezóny", table[0], x => `${fmt(x.elo)} Elo`],
    ["Nejvíc výher", best(ps, x => x.wins), x => `${x.wins} výher`],
    ["Nejlepší winrate", best(reg, x => x.winrate), x => `${x.winrate} %`],
    ["Čisté ruce", best(reg, x => num(x.avg), true), x => `Ø ${x.avg} bodů`],
    ["Nejvyšší peak", best(ps, x => x.max), x => `${fmt(x.max)} Elo`],
    ["Nejdelší série", best(ps, x => x.bestStreak), x => `${x.bestStreak} výher v řadě`],
    ["Raketa", best(ps, x => num(x.bestGain)), x => `${x.bestGain} Elo v jedné hře`],
    ["Dříč", best(ps, x => x.games), x => `${x.games} her`]
  ].filter(a => a[1]).map(([n, x, f]) => ({ n, p: x.p, v: f(x), r: rank(x.elo) }));
}
VIEWS.sezona = () => {
  const a = awards();
  return `<div class="panel"><h2>Konec sezóny · ${esc(cur.name)}</h2>
    <p class="muted">Takhle by vypadalo vyhlášení, kdyby sezóna skončila teď. Ceny s winrate a průměrem bodů jen pro hráče s 10+ hrami.</p>
    <p><button type="button" class="pri" id="cerem">${ic("play")} Přehrát vyhlášení</button></p>
    <div class="awards">${a.slice().reverse().map(x => `<div class="award"><div class="tl">${x.n}</div><div class="player" style="cursor:auto">${emblem(x.r, "emb")}<b>${esc(x.p)}</b></div><div class="muted">${x.v}</div></div>`).join("")}</div></div>`;
};
document.addEventListener("click", e => {
  if (!e.target.closest("#cerem")) return;
  // Vyhlášení od méně důležitých cen po šampiona.
  const a = awards(), order = a.slice(3).concat(a.slice(0, 3));
  const fx = $("#fx");
  const show = k => {
    if (k >= order.length) { fx.className = ""; fx.onclick = null; return; }
    const x = order[k];
    fx.className = "show awfx upfx";
    fx.style.setProperty("--rc", RANK_COLOR[x.r] + "88");
    fx.innerHTML = `<div><div class="aw">${esc(cur.name)} · ${k + 1}/${order.length}</div><div class="stage"><div class="rays"></div>${emblem(x.r, "new")}</div>
      <div class="title">${x.n}</div><div class="sub">${esc(x.p)} · ${x.v}</div></div>`;
    clearTimeout(fx.t); fx.t = setTimeout(() => show(k + 1), 4500);
    fx.onclick = () => show(k + 1);
  };
  show(0);
});

// --- sdílení hry jako obrázek (do skupiny) ---
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-share]");
  if (!b) return;
  const i = +b.dataset.share, h = S[cur.id].hist[i], ps = Object.entries(h.game).sort((x, y) => x[1] - y[1]);
  const css = getComputedStyle(document.documentElement), v = k => css.getPropertyValue(k).trim();
  const W = 1080, H = 300 + ps.length * 120, c = Object.assign(document.createElement("canvas"), { width: W, height: H }), g = c.getContext("2d");
  g.fillStyle = v("--bg"); g.fillRect(0, 0, W, H);
  g.strokeStyle = v("--gold"); g.lineWidth = 4; g.strokeRect(24, 24, W - 48, H - 48);
  g.fillStyle = v("--gold2"); g.font = "700 52px Cinzel, serif"; g.fillText(WEB.nazev, 72, 120);
  g.fillStyle = v("--muted"); g.font = "500 30px Inter, sans-serif";
  const t = cur.times?.[i] && new Date(cur.times[i]);
  g.fillText(`${cur.name} · hra #${i + 1}${t && !isNaN(t) ? " · " + t.toLocaleDateString("cs-CZ") : ""}`, 72, 170);
  ps.forEach(([p, pts], k) => {
    const y = 250 + k * 120, d = fmt(h.after[p]) - fmt(h.before[p]), r = rank(h.after[p]);
    g.fillStyle = v("--panel"); g.fillRect(72, y - 10, W - 144, 100);
    g.fillStyle = RANK_COLOR[r]; g.fillRect(72, y - 10, 8, 100);
    g.fillStyle = v("--gold2"); g.font = "600 40px Inter, sans-serif"; g.fillText(p, 110, y + 40);
    g.fillStyle = v("--muted"); g.font = "500 26px Inter, sans-serif"; g.fillText(`${r} · ${fmt(h.after[p])} Elo`, 110, y + 76);
    g.textAlign = "right";
    g.fillStyle = pts === 0 ? v("--up") : v("--gold2"); g.font = "700 44px Inter, sans-serif"; g.fillText(pts === 0 ? "zavřel" : pts + " b.", W - 260, y + 54);
    g.fillStyle = d >= 0 ? v("--up") : v("--down"); g.fillText((d >= 0 ? "+" : "") + d, W - 100, y + 54);
    g.textAlign = "left";
  });
  const blob = await new Promise(r => c.toBlob(r, "image/png")), file = new File([blob], `zoliky-hra-${i + 1}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch {} return; }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: file.name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
