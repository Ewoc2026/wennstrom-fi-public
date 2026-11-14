# Testaus — kasvissosekeitto 0.3.4

## Paikalliset automaattiset tarkistukset

- `node tests/model.test.js`: 24 nimettyä tarkistusta ja 33 900 determinististä reseptiyhdistelmää. Tarkistettu myös, että suolaa ja mustapippuria ei enää lasketa eikä niille näytetä numeerisia määriä; ruskistuserät ovat yhden kerroksen kokoisia, eikä juureserien kokonaisaikaa ehdoteta. Muiden kasvisten lisäysjärjestys, veden lisääminen kerran, nollamäärät ja käyttäjän omat määrät tarkistetaan.
- `python3 tests/browser.test.py`: 31 Chromium-selaintarkistusta. Niihin sisältyvät omat määrät, profiilien vaihto, näppäimistösyöttö, haitallisen näköisten muistiinpanojen käsittely pelkkänä tekstinä, tallennuksen palautuminen, kopiointi, tulostuspainikkeen kutsu, virhetilanteet ja 320–1440 px leveyden tarkistukset.
- `python3 tests/publication.test.py`: 6 paikallista Chromium-tarkistusta, joissa hash-pohjainen CSP toteutetaan selaimeen lisätyllä meta-käytännöllä (ei oikea palvelimen HTTP-otsake), lisäksi ohita reseptin alkuun -linkki, 200 % juurifonttikoko, kapea näkymä, tulostetun/säästetyn tilan tekstin turvallisuus ja päivitetyt ainesohjeet.

## Rajaukset

Automaattiset testit eivät osoita WCAG 2.2 AA -vaatimusten täyttymistä. Ruudunlukijatesti puuttuu. Tulostuspainikkeen ja CSS:n tarkistus ei ole sama kuin todellisen paperitulosteen tarkistus. Firefoxia, Safaria ja wennström.fi:n julkaisujärjestelmää ei ole vielä testattu tämän version osalta. Kasvisyhdistelmien maistuvuutta ja erilaisten astioiden käyttäytymistä ei voi päätellä laskentatesteistä.

## Kevyt värikontrastin pistotarkistus

CSS-paletin tavallisen tekstin kontrastit laskettiin paikallisesti: tavallinen tekstiväri vaalealla paperilla noin 12:1, himmeä tekstiväri paperilla noin 6:1 ja yhteenvetokortissa noin 5,3:1. Tämä ei korvaa kaikkien tilojen, kuvakkeiden ja apuvälineiden arviointia.
