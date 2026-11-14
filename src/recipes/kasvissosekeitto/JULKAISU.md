# Julkaisuehdokkaan käyttöönotto — wennström.fi / Codex

Tämä paketti ei julkaise mitään verkkosivulle. Julkaisua edeltävät muutokset sekä paikalliset testit on tehty versioon 0.3.4.

## Suositeltu seuraava eteneminen

1. **Selvitä julkaisutekniikka.** Onko wennström.fi staattinen sivusto, WordPress, muu CMS vai oma toteutus? Tarkista palvelimen ja sivuston CSP-, välimuisti- ja sisällönhallinta-asetukset. Älä sijoita kokonaista HTML-dokumenttia suoraan CMS:n teksti-editoriin.
2. **Valmistele erillinen testiosoite.** Laita julkinen, puhdas `index.html` ensin salasanalla rajattuun testiympäristöön, jos tarkoitus on pitää testaus yksityisenä. Pelkkä noindex ei ole pääsynhallinta.
3. **Testaa sivustolla:** Firefox (Manjaro) ja Chromium (desktop), puhelin (kapea näyttö), pelkkä näppäimistö, näytön tekstin suurennus, syötekenttien virheilmoitukset, maustelinjan vaihto, oma vesi, kolmas B-kasvis, kopiointi, HTML-tallennus ja tulostus myös oikealta paperilta.
4. **Saavutettavuus:** arvioi käytännössä ruudunlukijan käyttäytyminen (esim. NVDA/Firefox tai Orca/Firefox), valintojen päivittymisestä tulevat ilmoitukset, dialogin fokus, kontrastit, näppäimistöansat ja 200 % tekstisuurennus. Automaattiset testit eivät yksin osoita WCAG 2.2 AA -tason toteutumista.
5. **Yksityisyys:** sovellus ei lähetä valintoja tai muistiinpanoja verkkoon eikä käytä evästeitä, analytiikkaa tai localStoragea. Sivuston muut skriptit, lokit ja mahdollinen analytiikka tarkastetaan erikseen. Ladattuun HTML-tiedostoon jäävät käyttäjän muistiinpanot, joten siitä kerrotaan käyttöliittymässä.
6. **Jos käytössä on tiukka CSP:** itsenäinen HTML sisältää sisäisen `<style>`-elementin ja kaksi ohjelmallista `<script>`-lohkoa. Palvelimen CSP:n on sallittava niiden suoritus, mieluiten täsmällisillä SHA-256-hasheilla tai erottamalla JavaScript ja CSS omiksi tiedostoiksi *säilyttäen samalla käyttäjän tallentaman reseptin offline-toimivuus*. Katso `python3 csp_hashes.py`. Älä ota laajaa `unsafe-inline`-sallintaa käyttöön vain tätä ohjelmaa varten.
7. **Tee julkaisupäätös erikseen.** Avaa sivu yleisölle vasta hyväksyttyjen selaintestien, tietoturva-/yksityisyystarkistuksen ja valitun julkaisulisenssin jälkeen.

## Tiedoston tallentamisen tärkeä yksityiskohta

Nykyinen `Tallenna valinnat` toimii, koska valmis HTML sisältää CSS:n ja JavaScriptin sisäisesti. Jos verkkosivupaketissa ulkoistat ne tiedostoiksi, pelkkä sivun ulkoistaminen voi rikkoa ladatun reseptin offline-toimivuuden. Testaa tallennetun tiedoston avaaminen ilman verkkoyhteyttä ennen julkaisua.

## Tunnetut rajoitukset

- Paikalliset Chromium- ja mallintestit on tehty, mutta Firefox-, Safari-, ruudunlukija- ja oikean verkkopalvelimen testit jäävät julkaisuympäristöön.
- Tulostusnappi ja CSS on testattu ohjelmallisesti; todellisen paperitulosteen sivutusta ei ole tarkistettu tässä versiossa.
- Kaikkien kasvisten maku- ja kypsyystuloksia ei ole keittiössä varmennettu. Määrät ovat ehdotuksia.
- Lisenssi avoimelle julkaisulle pitää päättää erikseen. Lähdekoodipaketin toimitus ei automaattisesti myönnä avoimen lähdekoodin lisenssiä.

## Codexille sopiva aloitustehtävä

> Tutustu ensin `README.md`, `JULKAISU.md`, `TESTAUS.md` ja lähdekoodiin. Selvitä wennström.fi-sivuston todellinen julkaisutekniikka ja tarvittavat käyttöoikeudet, älä oleta WordPressiä tai staattista sivustoa. Suunnittele turvallinen testijulkaisu v0.3.4:stä ilman tuotantosivun muutoksia. Säilytä omien valintojen offline-HTML-tallennus sekä selain- ja näppäimistökäyttö. Tee sivustokohtaiset muutokset vain erikseen hyväksytyn suunnitelman mukaan.
