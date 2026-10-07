// Vlož do tabulky Zoliky_Elo: Rozšíření → Apps Script, nasaď jako webovou aplikaci (spouštět jako já, přístup Kdokoli).
// Web sem posílá nové hry a zapíše je do listu Hry jako další řádek.
const HESLO = "ZMEN-ME"; // stejné heslo zadáš na webu

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.heslo !== HESLO) return out({ ok: false, chyba: "Špatné heslo" });
  const sh = SpreadsheetApp.getActive().getSheetByName("Hry");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Hráči jsou v řádku 2 od sloupce B až po první prázdnou buňku.
    const names = sh.getRange(2, 2, 1, sh.getLastColumn() - 1).getValues()[0].map(String);
    const end = names.indexOf("");
    const cols = names.slice(0, end < 0 ? names.length : end);
    for (const p in d.hra) if (!cols.includes(p)) { sh.getRange(2, 2 + cols.length).setValue(p); cols.push(p); }
    const rows = sh.getRange(3, 2, sh.getMaxRows() - 2, cols.length).getValues();
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
