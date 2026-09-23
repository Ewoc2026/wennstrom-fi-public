# wennstrom-fi-public

`wennström.fi`-sivuston julkinen lähderepositorio.

Tämä repo sisältää vain verkossa julkaistavaa sivustoa. Työmuisti, kokeilut ja keskeneräinen projektiaineisto pidetään erillisessä private-repossa.

## Nykyinen julkaisu

- `/syvatutkimus` — SYVÄTUTKIMUSOHJE v0.6

## Keittiö-osio

- `/keittio/` — mittauksia, kokeita ja havaintoja reseptikehityksen tueksi
- `/keittio/uuni/200-c-pizzakivella-ja-ilman/` — uunin 200 °C:n kylmäkäynnistysvertailu

Mittaussivu käyttää alkuperäistä SVG-kuvaajaa. Sen voi suurentaa sivulla tai avata erikseen. Mittausdataa sisältävä CSV ei kuulu julkaistaviin tiedostoihin.

Codex toteutti Keittiö-osion sivuston tekijän toimittamasta luonnoksesta ja kuvaajasta sekä täydensi tämän README:n kehitysohjeet. Sivulla erotetaan mittaustulokset, tulkinta ja avoimet kysymykset.

## Paikallinen kehitys

Node.js-vaatimus on vähintään 22.12.0. Asenna riippuvuudet versionhallinnan lukitustiedostosta:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Tarkista etusivu ja molemmat Keittiö-osion sivut myös kapealla näytöllä. Tuotantoversion tarkistus:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

Esikatselu avautuu osoitteeseen `http://127.0.0.1:4322/`. Nykyinen Astro-versio käynnistää esikatselun taustalle; pysäytä se tarkistuksen jälkeen komennolla `npm run preview -- stop`.

## Julkaisu

Sivusto on staattinen Astro-sivusto. `main`-haaraan tehty push käynnistää `.github/workflows/deploy.yml`-workflow'n, joka rakentaa sivuston ja julkaisee sen GitHub Pagesiin.

Tavoitedomain: `https://wennström.fi`
