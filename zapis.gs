// Vlož do tabulky Zoliky_Elo: Rozšíření → Apps Script, nasaď jako webovou aplikaci (spouštět jako já, přístup Kdokoli).
// Web sem posílá nové hry (heslo hráčů) a mazání her (admin heslo) a mění list Hry.
const HESLO = "ZMEN-ME";        // heslo pro zápis her
const ADMIN_HESLO = "ZMEN-ME-ADMIN"; // heslo pro mazání her

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const admin = d.heslo === ADMIN_HESLO;
  if (!admin && d.heslo !== HESLO) return out({ ok: false, chyba: "Špatné heslo" });
  if (d.akce === "overit") return out({ ok: true, admin });
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

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
