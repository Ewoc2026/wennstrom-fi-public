# Dynaaminen kasvissosekeitto 0.3.4 — paikallinen julkaisuehdokas

Suomenkielinen, ilman verkkoyhteyttä toimiva HTML-reseptigeneraattori. A–B–C–D-kasvisryhmät, oma vesi ja valkosipulimurska, kolme maustelinjaa sekä muuttuvat työvaiheet. Käyttäjän itse valitsemat määrät säilyvät; reseptin määrät ja ajat ovat lähtöehdotuksia, eivät tiukkoja rajoja.

## Mitä korjattiin (0.3.3 → 0.3.4)

1. **Suola ja mustapippuri:** ainesluettelossa `oman maun mukaan`. Suolalle huomautus käytetyn kasvisliemen suolasta. Aiempi laskennallinen suola poistettiin itse mallista ja kaikista ohje-esityksistä.
2. **Ruskistaminen:** ohje nimeää valitut ruskistettavat kasvikset ja käskee mitoittamaan jokaisen erän paistoastian pohjalle yhteen kerrokseen. Eriä voi olla kuinka monta tahansa. Juuresten ruskistamisen kokonaisaika-arvio poistettiin; väri ja todellinen paistuminen ratkaisevat. Bataatin valinnaiseen ruskistamiseen sama kerrosperiaate.
3. **Kukkakaalipohjan taustatieto:** siinä on yksi onnistunut käytännön koe, mutta kaikki suhteet eivät ole vahvistettuja. Korjattu myös taustan välimerkki.
4. **Tuloste ja kopioitu resepti:** lyhyempi kokeiluhistorian maininta; tarkempi selostus jää sivun taustaosioon.
5. **Julkiseen käyttöön sopiva nimi:** `Valkosipulimurska (oletus: Valkoliekki, 70 % valkosipulia)`; muita murskia voi käyttää omaan makuun sovittaen. Laskennan työoletus säilyy ennallaan.

Aiemmat ominaisuudet, esimerkiksi kolmannen B-kasviksen käyttökelpoinen määräehdotus, valinnainen laakerinlehti, omien määrien säilyminen ja tallennus, on säilytetty.

## Käyttö

Avaa `index.html` paikallisesti Firefoxissa tai muussa modernissa selaimessa. Kirjoita määrät ja vahvista Enterillä tai siirtymällä kentästä pois. `Kopioi ohje`, `Tulosta` ja `Tallenna valinnat` käyttävät kulloinkin näkyvää reseptiä.

**Tallenna valinnat** tuottaa uuden itsenäisen HTML-tiedoston, johon muistiinpanot sisältyvät. Älä julkaise vahingossa yksityistä valintatiedostoa. Julkiselle palvelimelle tarkoitettu `index.html` on puhdas oletusversio ilman muistiinpanoja tai yksityisiä valintoja.

## Tiedostot

- `index.html` — valmis, itsenäinen julkaisuehdokas (sisältää CSS:n ja JavaScriptin)
- `src/model.js` — laskenta, kasvisyhdistelmät ja valmistusohje
- `src/app.js` — käyttöliittymä, muistiinpanot, tallennus ja tulostus
- `src/page.html` / `src/style.css` — sivun rakenne ja ulkoasu
- `build.py` — kokoaa itsenäisen HTML-tiedoston
- `tests/model.test.js` — laskentatestit
- `tests/browser.test.py` — Chromium-selaintestit
- `tests/publication.test.py` — paikallinen CSP:n hash-valvonnan, käytettävyyden ja saavutettavuuden perustarkistus
- `JULKAISU.md` — jatko-ohje desktop-sovellukseen/Codexiin ja wennström.fi-koeasennukseen
- `TESTAUS.md` — toteutetut tarkistukset ja rajat
- `MITTAMUUNNOKSET.md` — käytettyjen keittiömittojen oletukset

## Paikallinen rakentaminen ja testaus

```bash
python3 build.py
node tests/model.test.js
python3 tests/browser.test.py
python3 tests/publication.test.py
```

Node.js ja Python 3 tarvitaan rakentamiseen ja testeihin, Playwright ja Chromium selaintesteihin. **Valmis `index.html` ei vaadi niitä eikä mitään ulkoista kirjastoa.**

## Julkaisun rajat

Reseptin ruoka-arvioita ei voi hyväksyä ohjelmistotestien perusteella. Kahdesta tarkemmin kuvatusta yhdistelmästä on myönteistä kotikokeilua; muita ei ole järjestelmällisesti testattu. Sovellus ei laske ravintoarvoja tai erityisruokavalioita.

Tämä paketti on *paikallinen julkaisuehdokas*, ei vielä wennström.fi-sivustolle viety versio. Lue `JULKAISU.md` ennen sivustolle siirtämistä. Julkisen levityksen lisenssiä ei ole käyttäjän puolesta valittu.
