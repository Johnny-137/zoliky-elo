# Liga žolíků

Žebříček Elo pro žolíky (patch 1.1) s rank up/down animacemi. Statický web pro GitHub Pages.

- `data.json` – obě sezóny a nastavení. Aktuální sezóna se navíc čte živě z Google tabulky (list Hry), pokud je sdílená „kdokoli s odkazem“.
- `elo.js` – výpočet Elo, `node check.js` ověří, že sedí s tabulkou.
- `zapis.gs` – Apps Script do tabulky, přes který web zapisuje nové hry (adresu dát do `SCRIPT_URL` v index.html).
