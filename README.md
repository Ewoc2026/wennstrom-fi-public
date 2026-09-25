# wennstrom-fi-public

`wennström.fi`-sivuston julkinen lähderepositorio.

Tämä repo sisältää vain verkossa julkaistavaa sivustoa. Työmuisti, kokeilut ja keskeneräinen projektiaineisto pidetään erillisessä private-repossa.

## Sivut

Sivusto sisältää keskusteluesimerkkejä, syvätutkimusohjeen ja Keittiö-osion. Julkiset sivut ovat `src/pages/`-hakemistossa. Etusivu ja osioiden omat sivut kokoavat niiden linkit.

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

`npm run build` tarkistaa myös valmiin `dist/`-hakemiston: jokaisen julkisen sivun otsikon, yksilöllisen kuvauksen, kielen, canonical-osoitteen, indeksoinnin sallimisen, sivukartan kattavuuden ja löytymisen etusivulta tavallisia linkkejä seuraamalla. Tarkistus ei sisällä ylläpidettävää sivuluetteloa. Sen voi ajaa jo rakennetulle sivustolle erikseen komennolla `npm run check:site`.

Esikatselu avautuu osoitteeseen `http://127.0.0.1:4322/`. Nykyinen Astro-versio käynnistää esikatselun taustalle; pysäytä se tarkistuksen jälkeen komennolla `npm run preview -- stop`.

## Uuden tavallisen sivun lisääminen

Sivujen ja linkkien lisäykset tekee tässä projektissa yleensä Codex. Kun käyttäjä pyytää uuden sivun tai sisältömuutoksen, Codex hoitaa osana samaa työtä myös otsikon ja yksilöllisen metakuvauksen laatimisen aineiston perusteella, sopivan osoitteen ja sisäisten linkkien valinnan sekä alla olevat tekniset tarkistukset. Käyttäjän antamat otsikot ja sisältövalinnat säilytetään. Käyttäjän ei tarvitse kirjoittaa erillisiä SEO-kenttiä tai pyytää linkitystä erikseen; häneltä kysytään vain olennaiset asiat, joita aineisto ja sivuston nykyinen rakenne eivät ratkaise.

Build johtaa osoitteet ja sivukartan mekaanisesti. Sisällön merkitystä koskevan työn tekee sivun toteuttaja, yleensä Codex, lukemalla aineiston ja kirjoittamalla sitä vastaavat metatiedot. Repon [AGENTS.md](AGENTS.md) ohjaa Codexin tähän työnkulkuun [projektiohjeiden lukutavan](https://learn.chatgpt.com/docs/agent-configuration/agents-md) mukaisesti.

Luo esimerkiksi `src/pages/uusi-sivu.astro` ja käytä yhteistä `PageLayout`-sivupohjaa:

```astro
---
import PageLayout from '../layouts/PageLayout.astro';

const title = 'Uuden sivun otsikko';
---

<PageLayout
  title={title}
  description="Kirjoita tähän lyhyt, tätä sivua kuvaava yhteenveto."
>
  <main>
    <h1>{title}</h1>
    <p>Sivun varsinainen sisältö.</p>
  </main>
</PageLayout>
```

Anna sivulle sen oma otsikko, kuvaus ja sisältö. Otsikkoa ja kuvausta ei arvata tiedostonimestä tai pitkän keskustelun ensimmäisistä lauseista. Sivupohja pysäyttää buildin, jos otsikko tai kuvaus puuttuu. Sivupohja ei lisää tyylejä: säilytä tai valitse sivulle sopivat olemassa olevat tyylit.

Lisää sivulle tavallinen linkki esimerkiksi etusivulta tai sitä vastaavalta osiosivulta: `<a href="/uusi-sivu/">Uuden sivun otsikko</a>`. Linkin paikka ja lukijalle hyödyllinen teksti ovat toimituksellisia valintoja. Build huomaa sivun, johon ei pääse etusivulta sisäisten linkkien kautta. Älä muokkaa julkaistuja keskusteluja linkkien lisäämiseksi, kun sopiva kokoava sivu on olemassa.

Alikansio toimii samoin: `src/pages/osio/uusi-sivu.astro` tuottaa osoitteen `/osio/uusi-sivu/`. Korjaa tällöin sivupohjan suhteellinen import-polku. Reitti tulee tiedoston sijainnista; sivulle ei anneta erikseen canonical-osoitetta eikä sitä lisätä SEO-luetteloon.

Jokaisessa buildissa automaattisesti:

- `PageLayout` tuottaa suomenkielisen HTML-rungon, otsikon, kuvauksen ja ensisijaisen HTTPS-osoitteen (`canonical`). Osoite käyttää `astro.config.mjs`-tiedoston `site`-asetusta ja sivun reittiä; esikatselun domain tai kyselyparametrit eivät päädy siihen.
- `@astrojs/sitemap` muodostaa staattisista reiteistä `sitemap-index.xml`- ja `sitemap-0.xml`-tiedostot. Myös uudet alisivut tulevat mukaan.
- `src/pages/robots.txt.ts` tuottaa indeksointirobottien kulun sallivan `robots.txt`-tiedoston ja sivukartan osoitteen samasta domain-asetuksesta.
- Buildin lopputarkistus vertaa sivukarttaa oikeasti tuotettuihin HTML-sivuihin. Sama tarkistus kuuluu nykyiseen GitHub Pages -julkaisubuildiin, koska workflow käyttää `npm run build` -komentoa.

Nykyinen malli koskee julkisia suomenkielisiä sivuja. Pidä keskeneräiset tai yksityiset luonnokset poissa `src/pages/`- ja `public/`-hakemistoista. Julkaistava `noindex`-sivu, uudelleenohjaus tai muun kielinen sivu vaatii erillisen ratkaisun; tavallisen sivun lisääminen ei vaadi näitä asetuksia. Palvelimen 404/500-virhesivut eivät kuulu julkisten sisältösivujen tarkistukseen.

### Ratkaisun rajat ja perusteet

Sivut ovat valmista HTML:ää, joten lukeminen ei edellytä JavaScriptiä. Keskustelutekstejä, näkyvää rakennetta, tyylejä tai kuvia ei muutettu tässä hakukonetyössä. Etusivun aiempi kuvaus `wennström.fi.` korvattiin sen nykyistä sisältöä kuvaavalla yhteenvedolla. Reseptit, reseptien structured data ja käyttäjäseuranta eivät kuulu toteutukseen.

Sivukarttaan ei keksitä päivitysaikoja jokaisella buildilla. `lastmod` edellyttäisi tietoa sisällön merkittävästä muutoksesta; buildin kellonaika ei osoita sitä. Myöskään `priority`- ja `changefreq`-arvoja ei ylläpidetä. Tavallisten sivujen indeksointi ei vaadi erillistä structured data -järjestelmää, tekijätietojen arvaamista tai automaattisia hakukoneilmoituksia joka julkaisussa.

Ratkaisu perustuu [Astron sivukarttaintegraatioon](https://docs.astro.build/en/guides/integrations-guide/sitemap/), [Astron sivupohjiin](https://docs.astro.build/en/basics/layouts/) sekä Googlen ohjeisiin [sivukartoista](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [canonical-osoitteista](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sivukohtaisista kuvauksista](https://developers.google.com/search/docs/appearance/snippet) ja [sisäisistä linkeistä](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

Codex tutki nykyisen repon ja viralliset ohjeet, toteutti tämän teknisen infrastruktuurin ja sen tarkistuksen sekä kirjoitti nämä ylläpito-ohjeet. Paikallinen buildin tarkistus ei osoita hakukoneen indeksoineen sivuja.

## Julkaisu

Sivusto on staattinen Astro-sivusto. `main`-haaraan tehty push käynnistää `.github/workflows/deploy.yml`-workflow'n, joka rakentaa sivuston ja julkaisee sen GitHub Pagesiin.

Tavoitedomain: `https://wennström.fi`

Push ja julkaisu edellyttävät käyttäjän erillistä hyväksyntää. Hyväksytyn julkaisun jälkeen tarkista julkisesta domainista `robots.txt`, `sitemap-index.xml`, sen osoittama sivukartta ja vähintään yhden sivun canonical-osoite. Paikallinen build ei todista julkaisun onnistumista.

Hakukone voi löytää sivukartan osoitteesta `https://xn--wennstrm-t4a.fi/robots.txt`. Erillistä hakukonetiliä ei tarvita tähän perusinfrastruktuuriin. Halutessasi voit erikseen vahvistaa sivuston omistajuuden hakukoneen ylläpitopalvelussa (esimerkiksi Google Search Consolessa) ja lähettää siellä kerran osoitteen `https://xn--wennstrm-t4a.fi/sitemap-index.xml`; sama osoite palvelee myös tulevia sivuja. Se antaa näkyvyyttä indeksoinnin tilaan, mutta [indeksointi tai hakusijoitus ei ole taattu](https://developers.google.com/search/docs/essentials/technical). Tilien, DNS:n ja omistajuuden vahvistusta ei tehdä repository-muutoksilla.
