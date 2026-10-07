// Vlož do tabulky Zoliky_Elo: Rozšíření → Apps Script, nasaď jako webovou aplikaci (spouštět jako já, přístup Kdokoli).
// Web sem posílá nové hry (heslo hráčů) a mazání her (admin heslo) a mění list Hry.
const HESLO = "ZMEN-ME";        // heslo pro zápis her
const ADMIN_HESLO = "ZMEN-ME-ADMIN"; // heslo pro mazání her

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const admin = d.heslo === ADMIN_HESLO;
  if (!admin && d.heslo !== HESLO) return out({ ok: false, chyba: "Špatné heslo" });
  if (d.akce === "overit") return out({ ok: true, admin });
  if (d.akce === "web") {
    // Nastavení webu z editoru (název, barvy, patch notes, CSS) jako JSON v listu Web.
    if (!admin) return out({ ok: false, chyba: "Upravovat web může jen admin" });
    const json = JSON.stringify(d.web);
    if (!d.web || typeof d.web !== "object" || json.length > 45000) return out({ ok: false, chyba: "Nastavení je moc velké" });
    const ss = SpreadsheetApp.getActive();
    (ss.getSheetByName("Web") || ss.insertSheet("Web")).getRange("A1").setNumberFormat("@").setValue(json);
    return out({ ok: true });
  }
  const sh = SpreadsheetApp.getActive().getSheetByName("Hry");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Hráči jsou v řádku 2 od sloupce B až po první prázdnou buňku.
    const names = sh.getRange(2, 2, 1, sh.getLastColumn() - 1).getValues()[0].map(String);
    const end = names.indexOf("");
    const cols = names.slice(0, end < 0 ? names.length : end);
    const rng = () => sh.getRange(3, 2, sh.getMaxRows() - 2, cols.length);
    if (d.akce === "smazat") {
      if (!admin) return out({ ok: false, chyba: "Mazat může jen admin" });
      // Odehrané hry posune o řádek nahoru, ať čísla her zůstanou souvislá.
      const rows = rng().getValues().filter(row => row.some(v => v !== ""));
      const i = d.cislo - 1;
      if (!(i >= 0 && i < rows.length)) return out({ ok: false, chyba: "Hra neexistuje" });
      rows.splice(i, 1);
      sh.getRange(3, 2, rows.length + 1, cols.length).setValues(rows.concat([cols.map(() => "")]));
      return out({ ok: true });
    }
    const chyba = zkontroluj(d.hra, cols);
    if (chyba) return out({ ok: false, chyba });
    // Proti spamu: nejvýš 20 zápisů za hodinu.
    const cache = CacheService.getScriptCache(), n = Number(cache.get("zapisy") || 0);
    if (n >= 20) return out({ ok: false, chyba: "Příliš mnoho zápisů, zkus to za hodinu" });
    cache.put("zapisy", String(n + 1), 3600);
    for (const p in d.hra) if (!cols.includes(p)) { sh.getRange(2, 2 + cols.length).setValue(p); cols.push(p); }
    const rows = rng().getValues();
    const r = rows.findIndex(row => row.every(v => v === ""));
    if (r < 0) return out({ ok: false, chyba: "List Hry je plný" });
    sh.getRange(3 + r, 2, 1, cols.length).setValues([cols.map(p => p in d.hra ? Number(d.hra[p]) : "")]);
    return out({ ok: true, hra: r + 1 });
  } finally {
    lock.releaseLock();
  }
}

// Web kontroluje totéž, ale ten jde obejít – tady je pravidlo, které platí vždycky.
function zkontroluj(hra, cols) {
  if (!hra || typeof hra !== "object" || Array.isArray(hra)) return "Chybí hra";
  const ps = Object.keys(hra), body = Object.values(hra);
  if (ps.length < 2 || ps.length > 6) return "Hru hrají 2–6 hráči";
  if (!body.every(b => Number.isInteger(b) && b >= 0 && b <= 999)) return "Body musí být celá čísla 0–999";
  if (!body.includes(0)) return "Někdo musí zavřít (0 bodů)";
  const nove = ps.filter(p => !cols.includes(p));
  if (nove.length > 1) return "V jedné hře může být nejvýš 1 nový hráč";
  if (nove.some(p => !/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,19}$/u.test(p) || p.trim() !== p)) return "Jméno: jen písmena, čísla a mezery, max 20 znaků";
  if (cols.length + nove.length > 50) return "Hráčů je už moc";
  return "";
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
