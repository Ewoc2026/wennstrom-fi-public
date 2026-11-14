/* Kasvissosekeitto 0.3.4 — pure, inspectable recipe model.
 * Ratios and seasoning amounts are starting suggestions, not verified equivalences.
 * No DOM, network, storage or user tracking in this module.
 */
(function (root) {
'use strict';
const VERSION = '0.3.4';
const VEG = {
 carrot:{name:'Porkkana',acc:'porkkana',part:'porkkanaa',prep:'root',weight:2},
 cauliflower:{name:'Kukkakaali',acc:'kukkakaali',part:'kukkakaalia',prep:'cauliflower',weight:2},
 cabbage:{name:'Valkokaali',acc:'valkokaali',part:'valkokaalia',prep:'cabbage',weight:2},
 swede:{name:'Lanttu',acc:'lanttu',part:'lanttua',prep:'root',weight:2},
 sweetpotato:{name:'Bataatti',acc:'bataatti',part:'bataattia',prep:'sweet',weight:1.5,cap:.45},
 kohlrabi:{name:'Kyssäkaali',acc:'kyssäkaali',part:'kyssäkaalia',prep:'root',weight:2},
 parsnip:{name:'Palsternakka',acc:'palsternakka',part:'palsternakkaa',prep:'root',weight:1,cap:.25},
 celeriac:{name:'Juuriselleri',acc:'juuriselleri',part:'juuriselleriä',prep:'root',weight:1,cap:.14},
 turnip:{name:'Nauris',acc:'nauris',part:'naurista',prep:'root',weight:1,cap:.35}
};
const PRIMARY = {
 carrot:{ratio:.45,other:'swede',recommended:['swede','cauliflower','kohlrabi'],tip:'Paahteinen, porkkanapohjainen lähtökohta. Yrttisyys ja pieni happolisä ovat ehdotus makeuden vastapainoksi.'},
 cauliflower:{ratio:.40,other:'carrot',recommended:['carrot','kohlrabi','parsnip'],tip:'Kukkakaali lisätään kovia juureksia myöhemmin. Yksi kukkakaali–porkkana–juurisellerikeitto onnistui ilman perunaa; muut suhteet ovat vielä kokeilemattomia.'},
 cabbage:{ratio:.50,other:'carrot',recommended:['carrot','swede','celeriac'],tip:'Valkokaalipohja on kokeilematon. Kaali tarvitsee ohuen suikaloinnin ja kunnollisen pehmennyksen; aivan sileää rakennetta ei luvata.'},
 swede:{ratio:.55,other:'carrot',recommended:['carrot','cauliflower','kohlrabi'],tip:'Tämä tekee tarkoituksella lanttupainotteisen keiton. Pääkasviksena lanttu on tässä mallissa vielä kokeilematon.'},
 sweetpotato:{ratio:.55,other:'cauliflower',recommended:['cauliflower','carrot','celeriac'],tip:'Bataatti makeuttaa ja tekee soseesta täyteläistä ilman perunaa. Sen määräsuhteet ovat vielä kokeilemattomia; kasvismäärät ovat suuntaviivoja.'}
};
const ONIONS = {onion:'Keltasipuli',red_onion:'Punasipuli',leek:'Purjo'};
const MAX_GRAMS = 20000;
const MAX_NOTES = 2000;
const MAX_WATER = 50000;
const MAX_GARLIC_TSP = 4000; // Technical input limit, not a culinary recommendation.
const LEGACY_GARLIC_G_PER_TSP = 5; // Approximation, not a measured Valkoliekki density.
const clone = obj => JSON.parse(JSON.stringify(obj));
const escapeHtml = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('fi-FI',{maximumFractionDigits:1}).format(n);
const roundTo = (n,step) => Math.round(n/step)*step;
const roundVeg = n => roundTo(n,n>=100?25:n>=30?10:5);
const join = arr => arr.length<2?(arr[0]||''):arr.slice(0,-1).join(', ')+' ja '+arr.at(-1);
const grams = n => fmt(n)+' g';
const fmtDecimal = n => new Intl.NumberFormat('fi-FI',{maximumFractionDigits:2}).format(n);
// Practical volume equivalents. Densities are averages/assumptions, not product guarantees.
// See MITTAMUUNNOKSET.md for sources and uncertainty. Quantified seasonings use volume; salt/pepper use taste.
const G_PER_TSP = Object.freeze({thyme:1,marjoram:.6,provencal:1,paprika:2.3,mustard:5,vinegar:5,oil:4.5});
const MEASURE_NOTE='Yrttien, savupaprikan, sinapin, etikan, öljyn ja valkosipulimurskan määrät ovat keittiömittoina (1 tl = 5 ml, 1 rkl = 15 ml). Suola ja mustapippuri lisätään oman maun mukaan. Maustemäärät ovat lähtöehdotuksia.';
function fraction(n){
 const whole=Math.floor(n),quarter=Math.round((n-whole)*4);
 if(Math.abs(n*4-Math.round(n*4))>1e-8)return fmtDecimal(n);
 return quarter?(whole?fmt(whole)+' ':'')+['','¼','½','¾'][quarter]:fmt(whole);
}
function tspText(n){return fraction(n)+' tl';}
function spoonMeasure(gramsValue,kind){
 const tsp=gramsValue/G_PER_TSP[kind];
 if(kind==='oil'&&tsp>=3){
  return fraction(Math.max(.5,roundTo(tsp/3,.5)))+' rkl';
 }
 if(tsp<.25){
  // No special 1 ml spice measure: keep very small additions deliberately qualitative.
  return kind==='vinegar'?'muutama tippa':'ripaus';
 }
 const rounded=Math.max(.25,roundTo(tsp,.25));
 if(rounded>=6){
  const tbsp=Math.floor(rounded/3),rest=rounded-tbsp*3;
  return fmt(tbsp)+' rkl'+(rest?' + '+tspText(rest):'');
 }
 return tspText(rounded);
}
function garlicSuggestion(ab){
 const equivalent=Math.max(1,Math.round(ab*.015))/LEGACY_GARLIC_G_PER_TSP;
 return Math.max(.25,roundTo(equivalent,equivalent>=1?.5:.25));
}
function validTsp(n){return Number.isFinite(n)&&n>=0&&n<=MAX_GARLIC_TSP&&Math.abs(n*100-Math.round(n*100))<1e-7;}


const PROFILES = {
 provencal: {name:'Provencelaisen yrttinen', short:'Yrttinen', description:'Herbes de Provence, pieni sinappilisä ja hallittu happo. Oletuksena aiemman keittokokeen maustesuunnan perusteella; määrät ovat ehdotuksia.', herbs:[['Herbes de Provence',0.0025]], mustard:0.005, vinegar:0.001},
 smoky: {name:'Savuisen paahteinen', short:'Savuinen', description:'Mieto savupaprika ja timjami. Savuisuus ei tarkoita chilin poltetta. Yksi onnistunut käytännön keittokokeilu; tarkkoja toteutuneita maustemääriä ei vahvistettu.', herbs:[['Kuivattu timjami',0.001]], paprika:0.0015, mustard:0.004, vinegar:0.001},
 mustard: {name:'Sinappisen aromaattinen', short:'Sinappinen', description:'Dijon-sinappi, timjami ja meirami. Lisää etikkaa vasta sinapin maistamisen jälkeen. Uusi, vielä keittiössä kokeilematon maustelinja.', herbs:[['Kuivattu timjami',0.0012],['Kuivattu meirami',0.0008]], mustard:0.012, vinegar:0.0005}
};
function defaults(){return {schema:4,primary:{id:'carrot',grams:550},b:[{uid:'b1',ingredient:'swede',autoChoice:true,own:null}],onion:{id:'onion',own:null},garlic:{own:null},potato:{own:null},water:{own:null},profile:'provencal',userNotes:'',nextId:2};}
function isAmount(n,min=0){return Number.isInteger(n)&&n>=min&&n<=MAX_GRAMS;}
function isOwn(n){return n===null||isAmount(n);}
function validState(s){
 return !!s&&s.schema===4&&!!s.primary&&Object.hasOwn(PRIMARY,s.primary.id)&&isAmount(s.primary.grams,1)
 &&Array.isArray(s.b)&&s.b.length<=3&&s.b.every(r=>r&&/^b\d+$/.test(r.uid)&&Object.hasOwn(VEG,r.ingredient)&&typeof r.autoChoice==='boolean'&&isOwn(r.own))
 &&new Set(s.b.map(r=>r.uid)).size===s.b.length&&new Set(s.b.map(r=>r.ingredient)).size===s.b.length
 &&s.onion&&Object.hasOwn(ONIONS,s.onion.id)&&isOwn(s.onion.own)&&s.garlic&&(s.garlic.own===null||validTsp(s.garlic.own))&&s.potato&&isOwn(s.potato.own)
 &&s.water&&(s.water.own===null||(Number.isInteger(s.water.own)&&s.water.own>=50&&s.water.own<=MAX_WATER&&s.water.own%10===0))
 &&Object.hasOwn(PROFILES,s.profile)&&typeof s.userNotes==='string'&&s.userNotes.length<=MAX_NOTES
 &&Number.isInteger(s.nextId)&&s.nextId>=2&&s.nextId<1000000&&s.b.every(r=>Number(r.uid.slice(1))<s.nextId);
}
function normalizeState(input){
 if(!input||typeof input!=='object')return null;
 let s=input;
 if(s.schema===2)s={...s,schema:3,water:{own:null},profile:'provencal',userNotes:''};
 if(s.schema===3){
  if(!s.garlic||!isOwn(s.garlic.own))return null;
  s={...s,schema:4,garlic:{own:s.garlic.own===null?null:s.garlic.own/LEGACY_GARLIC_G_PER_TSP}};
 }
 if(!validState(s))return null;
 // Only copy known data fields. Never merge untrusted objects into application objects.
 return {schema:4,primary:{id:s.primary.id,grams:s.primary.grams},b:s.b.map(r=>({uid:r.uid,ingredient:r.ingredient,autoChoice:r.autoChoice,own:r.own})),onion:{id:s.onion.id,own:s.onion.own},garlic:{own:s.garlic.own},potato:{own:s.potato.own},water:{own:s.water.own},profile:s.profile,userNotes:s.userNotes,nextId:s.nextId};
}
function allocateB(s){
 const target=roundVeg(s.primary.grams*PRIMARY[s.primary.id].ratio);
 const unit=target>=100?25:5;
 const fixed=s.b.reduce((sum,r)=>sum+(r.own??0),0);
 const auto=s.b.filter(r=>r.own===null);
 const amounts=Object.fromEntries(s.b.map(r=>[r.uid,r.own??0]));
 let remaining=Math.max(0,target-fixed);
 const caps=Object.fromEntries(auto.map(r=>[r.uid,VEG[r.ingredient].cap?Math.max(unit,roundTo(s.primary.grams*VEG[r.ingredient].cap,unit)):Infinity]));
 // The third B item receives a useful starter amount, even if the earlier
 // user-set amounts already exhaust the suggested B basket. Existing OWN
 // quantities are left untouched; the total batch may grow.
 let thirdStarter=0;
 if(s.b.length===3 && s.b[2].own===null){
   const third=s.b[2], cap=caps[third.uid];
   const base=Math.max(5,roundVeg(Math.min(100,s.primary.grams*.22)));
   thirdStarter=Math.min(base,Number.isFinite(cap)?cap:base);
   amounts[third.uid]=thirdStarter;
   caps[third.uid]=thirdStarter; // Keep the initial third-vegetable suggestion modest.
   remaining=Math.max(0,remaining-thirdStarter);
 }
 // Distribute remaining budget among automatic rows, honoring individual caps.
 // Do not overwrite a user quantity or silently raise previously chosen amounts.
 while(remaining>=unit){
   const candidates=auto.filter(r=>amounts[r.uid]+unit<=caps[r.uid]);
   if(!candidates.length)break;
   candidates.sort((a,b)=>amounts[a.uid]/VEG[a.ingredient].weight-amounts[b.uid]/VEG[b.ingredient].weight);
   amounts[candidates[0].uid]+=unit;remaining-=unit;
 }
 return {target,amounts,fixed,thirdStarter,extra:Math.max(0,Object.values(amounts).reduce((a,b)=>a+b,0)-target)};
}
function derive(s){
 const b=allocateB(s), byId={};
 const put=(id,n)=>{if(n>0)byId[id]=(byId[id]||0)+n;};
 put(s.primary.id,s.primary.grams);
 s.b.forEach(r=>put(r.ingredient,b.amounts[r.uid]));
 const bTotal=s.b.reduce((sum,r)=>sum+b.amounts[r.uid],0), ab=s.primary.grams+bTotal;
 const brassicas=(byId.cauliflower||0)+(byId.cabbage||0);
 const sweet=byId.sweetpotato||0;
 // Sweet potato thickens the soup on its own; do not automatically stack much potato on top.
 const potatoProposal=ab*.22+brassicas*.05-sweet*.55;
 const suggested={onion:roundVeg(ab*.18),garlic:garlicSuggestion(ab),potato:Math.max(0,roundVeg(potatoProposal))};
 const onion=s.onion.own??suggested.onion, garlic=s.garlic.own??suggested.garlic, potato=s.potato.own??suggested.potato;
 const total=ab+onion+potato, waterFactor=brassicas/ab>=.4?.5:sweet/ab>=.3?.55:.6;
 suggested.water=Math.max(50,roundTo(total*waterFactor,50));
 const water=s.water.own??suggested.water;
 const profile=PROFILES[s.profile];
 const herbs=profile.herbs.map(([name,ratio])=>({name,grams:Math.max(.5,roundTo(total*ratio,.5))}));
 const oil=Math.max(1,roundTo(total*.022,total>=300?5:1));
 const mustard=Math.max(1,roundTo(total*profile.mustard,1));
 const vinegar=Math.max(.5,roundTo(total*profile.vinegar,.5));
 const paprika=profile.paprika?Math.max(.5,roundTo(total*profile.paprika,.5)):0;
 return {b,bTotal,ab,byId,suggested,onion,garlic,potato,total,water,waterFactor,oil,herbs,mustard,vinegar,paprika};
}
function notices(s,d){
 const out=[];
 if(s.primary.id==='cabbage')out.push('Valkokaalipohja on kokeilematon yhdistelmä. Odota ennen soseutusta, että kaali on aidosti pehmeää; aivan sileää rakennetta ei luvata.');
 if(s.primary.id==='swede')out.push('Lantun maku saa tässä olla pääosassa. Lanttupohjan suhde on vielä kokeilematon, ei sama kuin porkkana–lanttupohjassa.');
 if(d.byId.sweetpotato)out.push('Bataatti tuo makeutta ja sakeutta. Sen voi hyvin soseuttaa ilman perunaa. Määrät ovat kokeilemattomia lähtöehdotuksia, eivät tarkkoja korvaussuhteita.');
 const duplicate=s.b.find(r=>r.ingredient===s.primary.id&&d.b.amounts[r.uid]>0);
 if(duplicate)out.push(VEG[s.primary.id].name+' on sekä A- että B-korissa. Omat määrät säilyvät ja ne on yhdistetty ainesluetteloon: '+grams(d.byId[s.primary.id])+'.');
 if(d.b.extra>0)out.push('B-kori ylittää yhteisen lähtöehdotuksen noin '+grams(d.b.extra)+'. Kolmannen kasviksen käyttökelpoinen ehdotus tai omat määrät voivat kasvattaa keittoerää; mitään itse valitsemaasi määrää ei pienennetä.');
 if((d.byId.celeriac||0)/d.ab>.2)out.push('Juuriselleriä on paljon suhteessa muuhun kasvispohjaan. Varaudu selleripainotteiseen makuun; oma määräsi ei muutu.');
 if((d.byId.parsnip||0)/d.ab>.25)out.push('Palsternakkaa on melko suuri osuus. Sen makeus ja aromi voivat korostua; tämä on makuvalinta, ei virhe.');
 if(d.potato===0)out.push('Peruna on jätetty pois. Arvioi sakeus soseuttamisen jälkeen ja lisää loppuvettä maltilla.');
 else if(d.potato/d.total>.35)out.push('Perunan osuus on suuri. Keitosta tulee perunapainotteinen; soseuta vain sen verran kuin on tarpeen.');
 if(s.water.own!==null){
  out.push('Aloitusvesi on oma valintasi ('+fmt(d.water/100)+' dl). Se pysyy myös erän muuttuessa. Nykyisen yhdistelmän automaattinen ehdotus olisi noin '+fmt(d.suggested.water/100)+' dl.');
  if(d.water<d.total*.25)out.push('Omaa aloitusvettä on vähän suhteessa kasviksiin. Se ei välttämättä riitä kannen alla kypsentämiseen: tarkkaile pohjaa ja lisää vettä tarvittaessa jo ennen soseuttamista.');
  if(d.water>d.total*.9)out.push('Omaa aloitusvettä on runsaasti. Keitto voi jäädä tavoiteltua juoksevammaksi; vettä voi pitää aluksi osan sivussa.');
 }
 if(d.total>1800)out.push('Erä on suuri. Varaa väljä kattila ja ruskista useammassa erässä. Kypsennysaika ei kasva samassa suhteessa grammamäärään.');
 if(d.total<350)out.push('Erä on hyvin pieni. Käytä pientä astiaa ja varmista, että sauvasekoittimen teräosa peittyy. Maustemäärien pyöristys korostuu: aloita erityisen pienillä lisäyksillä.');
 return out;
}
function buildRecipe(s,d=derive(s)){
 const ids=Object.keys(d.byId), roots=ids.filter(id=>VEG[id].prep==='root');
 const hardBrown=ids.filter(id=>VEG[id].prep==='root'||id==='cabbage');
 const hasSweet=!!d.byId.sweetpotato, hasCauli=!!d.byId.cauliflower, hasCabbage=!!d.byId.cabbage;
 // Sweet potato softens faster than hard roots; after optional browning, add it late when there is a slow component.
 const hasEarly=roots.length>0||hasCabbage||d.potato>0;
 const lateSweet=hasSweet&&hasEarly, lateCauli=hasCauli&&hasEarly;
 const earlyBrown=[...hardBrown,...(hasSweet&&!lateSweet?['sweetpotato']:[])];
 const hasRoast=hardBrown.length>0||hasSweet||(d.onion>0&&s.onion.id!=='leek');
 const onionName=ONIONS[s.onion.id], onionAcc=onionName.toLowerCase();
 const names=ids.map(id=>VEG[id].acc), profile=PROFILES[s.profile];
 const title=names.length<=3?join(names.map((n,i)=>i===0?n[0].toUpperCase()+n.slice(1):n))+' · sosekeitto':'Kasvissosekeitto';
 const ingredients=ids.map(id=>({name:VEG[id].name,amount:grams(d.byId[id])}));
 if(d.onion)ingredients.push({name:onionName,amount:grams(d.onion)});
 if(d.potato)ingredients.push({name:'Peruna',amount:grams(d.potato)});
 if(d.garlic)ingredients.push({name:'Valkosipulimurska (oletus: Valkoliekki, 70 % valkosipulia)',amount:(s.garlic.own===null?'noin ':'')+tspText(d.garlic)});
 ingredients.push({name:'Vesi aluksi',amount:fmt(d.water/100)+' dl'+(s.water.own!==null?' · oma määrä':'')});
 const measures={oil:spoonMeasure(d.oil,'oil'),mustard:spoonMeasure(d.mustard,'mustard'),vinegar:spoonMeasure(d.vinegar,'vinegar'),paprika:d.paprika?spoonMeasure(d.paprika,'paprika'):null};
 const herbKey=name=>name==='Kuivattu timjami'?'thyme':name==='Kuivattu meirami'?'marjoram':'provencal';
 const seasonings=[{name:'Rypsi- tai oliiviöljy',amount:'noin '+measures.oil},...d.herbs.map(h=>({name:h.name,amount:'aloita noin '+spoonMeasure(h.grams,herbKey(h.name))})),{name:'Laakerinlehti (valinnainen)',amount:'1–2 kpl'}];
 if(d.paprika)seasonings.push({name:'Savupaprika, mieto',amount:'aloita noin '+measures.paprika});
 seasonings.push({name:'Mustapippuri, jauhettu',amount:'oman maun mukaan'},
  {name:'Dijon-sinappi',amount:'aloita noin '+measures.mustard},
  {name:'Väkiviinaetikka 10 %',amount:'tarvittaessa aluksi noin '+measures.vinegar},
  {name:'Suola',amount:'oman maun mukaan; huomioi kasvisliemen suola'});
 const steps=[], prep=[];
 prep.push('Valitse kattila tai kasari, johon kaikki raa\'at kasvikset mahtuvat kannen alle ja jossa pystyt myös sekoittamaan.');
 const peel=roots.map(id=>VEG[id].acc);
 if(peel.length)prep.push('Kuori '+join(peel)+'. Leikkaa '+(peel.length>1?'ne':'se')+' noin 1–2 cm paloiksi.');
 if(hasSweet)prep.push('Kuori bataatti ja paloittele noin 1–2 cm paloiksi. Bataatti pehmenee yleensä kovia juureksia nopeammin.'+(lateSweet?' Pidä bataatti erillään myöhempää lisäystä varten.':''));
 if(d.potato)prep.push('Kuori ja leikkaa peruna noin 1–2 cm paloiksi. Pidä peruna erillään ruskistettavista kasviksista; se lisätään vasta nesteeseen.');
 if(hasCabbage)prep.push('Suikaloi valkokaali ohuesti ja poista puumainen kanta.');
 if(hasCauli)prep.push('Jaa kukkakaali pieniksi kukinnoiksi ja viipaloi pehmeä varsi ohuesti. Poista mahdollinen puumainen osa.'+(lateCauli?' Pidä kukkakaali erillään myöhempää lisäystä varten.':''));
 if(d.onion)prep.push(s.onion.id==='leek'?'Halkaise purjo, huuhdo multa lehtien välistä ja viipaloi.':'Kuori ja hienonna '+onionAcc+'.');
 steps.push({title:'Valmistele valitut kasvikset',text:prep.join(' ')});
 if(hardBrown.length||hasSweet||d.onion){
  const roast=[];
  if(d.onion&&s.onion.id!=='leek')roast.push('Kuumenna osa öljystä leveässä kattilassa tai kasarissa. Ruskista '+onionAcc+' keskilämmöllä kullanruskeaksi, suuntaa antavasti 10–15 minuuttia. Siirrä hetkeksi sivuun.');
  if(hardBrown.length)roast.push((d.onion&&s.onion.id!=='leek'?'Lisää öljyä tarpeen mukaan. ':'Kuumenna osa öljystä leveässä kattilassa tai kasarissa. ')+'Ruskista '+join(hardBrown.map(id=>VEG[id].acc))+' tarvittaessa useassa erässä. Mitoita jokainen erä niin, että palat mahtuvat paistoastian pohjalle yhteen kerrokseen eivätkä ole päällekkäin. Eriä voi olla niin monta kuin tarvitaan. Anna osaan pinnoista muodostua selvä ruskea, paahteinen väri. Vältä polttamista ja siirrä valmiit erät sivuun.');
  if(hasSweet)roast.push((hardBrown.length||(d.onion&&s.onion.id!=='leek')?'Lisää tarvittaessa tilkka öljyä. ':'Kuumenna hieman öljyä kasarissa. ')+'Ruskista bataatti halutessasi keskilämmöllä. Jos ruskistat, paista tarvittaessa useassa erässä niin, että palat mahtuvat pohjalle yhteen kerrokseen. Lopeta, kun bataatti saa paikoin väriä; vältä palamista.'+(lateSweet?' Siirrä se erilleen odottamaan myöhempää lisäystä.':' Pidä se kattilassa tai siirrä hetkeksi syrjään.'));
  if(d.onion&&s.onion.id==='leek')roast.push((hardBrown.length||hasSweet?'Laske lämpöä ja lisää purjo.':'Kuumenna osa öljystä ja lisää purjo.')+' Pehmennä purjo sekoitellen; älä tavoittele tummaa ruskistusta.');
  steps.push({title:hasRoast?'Rakenna paahteinen pohja':'Pehmennä purjo',text:roast.join(' ')});
 }
 let start=(hardBrown.length||hasSweet||d.onion)?'Laske lämpöä. Jos astia on vielä hyvin kuuma, siirrä se hetkeksi pois levyltä ennen mausteiden lisäämistä. ':'Kuumenna öljy kattilassa miedolla lämmöllä. ';
 if(hasRoast)start+='Tarkista ensin, onko astian pohjassa aivan mustia tai kitkerän palaneita jäämiä. Jos on, poista ne tai jatka puhtaassa kattilassa; älä sekoita niitä keittoon. ';
 if(earlyBrown.length||d.onion)start+='Kokoa '+join([...earlyBrown.map(id=>VEG[id].acc),...(d.onion?[onionAcc]:[])])+' kattilaan. ';
 start+='Lisää '+(d.garlic?'valkosipulimurska ja ':'')+'mustapippuri sekä noin puolet '+(s.profile==='provencal'?'Herbes de Provence -yrteistä':s.profile==='smoky'?'timjamista':'timjamista ja meiramista')+'. Sekoita lyhyesti miedolla lämmöllä, polttamatta mausteita. ';
 // A single, atomic instruction: exactly one initial water addition, in every profile.
 const waterQty=fmt(d.water/100)+' dl';
 if(d.paprika)start+='Lisää savupaprika, sekoita muutaman sekunnin ajan ja kaada heti perään aloitusvesi ('+waterQty+'). ';
 else start+='Kaada kattilaan aloitusvesi ('+waterQty+'). ';
 if(hasRoast)start+='Jos astian pohjassa on ruskeita paistojäämiä, voit irrottaa ne lisättyyn veteen lastalla. Kaikkiin astioihin niitä ei synny. ';
 if(d.potato)start+='Lisää peruna. ';
 start+='Lisää halutessasi 1–2 laakerinlehteä; ne poistetaan ennen soseuttamista. ';
 if(hasCauli&&!lateCauli)start+='Lisää kukkakaali nyt. ';
 start+='Veden voi korvata miedolla kasvisliemellä. Älä lisää silloin suolaa vielä.';
 steps.push({title:'Lisää valitun maustelinjan mausteet ja vesi',text:start});
 let cook='Laita kansi päälle ja kuumenna hiljaiseen kiehumiseen. ';
 const late=[...(lateSweet?['bataatti']:[]),...(lateCauli?['kukkakaali']:[])];
 if(late.length){
  if(roots.length||hasCabbage){
   const slow=[...roots.map(id=>VEG[id].acc),...(hasCabbage?['valkokaali']:[])];
   cook+='Hauduta aluksi suuntaa antavasti 15–25 minuuttia. Ennen '+join(late.map(x=>x==='bataatti'?'bataatin':'kukkakaalin'))+' lisäämistä '+join(slow)+(slow.length>1?' saavat olla jo lähes pehmeitä. ':' saa olla jo lähes pehmeää. ');
  }else cook+='Kypsennä perunaa ensin suuntaa antavasti 8–12 minuuttia. ';
  cook+='Lisää '+join(late)+'. Laita kansi takaisin ja kuumenna uudelleen hiljaiseen kiehumiseen. Tarkista kypsyys noin 10–15 minuutin kuluttua kiehumisen palaamisesta ja jatka tarvittaessa pidempään. ';
 }else if(hasCauli&&hasSweet)cook+='Tarkista kukkakaalin ja bataatin kypsyys noin 10–20 minuutin kuluttua kiehumisen alkamisesta ja jatka tarvittaessa pidempään. ';
 else if(hasCauli)cook+='Tarkista kukkakaalin kypsyys noin 10–15 minuutin kuluttua kiehumisen alkamisesta ja jatka tarvittaessa pidempään. ';
 else if(hasSweet&&!hasEarly)cook+='Tarkista bataatin kypsyys noin 10–20 minuutin kuluttua kiehumisen alkamisesta ja jatka tarvittaessa pidempään. ';
 else cook+='Hauduta suuntaa antavasti 25–40 minuuttia kiehumisen alkamisesta. ';
 cook+='Pidä kansi päällä kypsennyksen ajan. Kääntele välillä, jotta myös päällimmäiset kasvikset kypsyvät tasaisesti. Lisää tarvittaessa hieman vettä, jotta pohjalla on koko ajan nestettä. Kasvisten ei tarvitse peittyä kokonaan: nesteen yläpuolelle jäävät osat kypsyvät kannen alla höyryssä. Kypsennys päättyy vasta, kun kaikki kasvikset'+(hasCauli?', myös kukkakaalin varsipalat,':'')+' murtuvat helposti haarukalla painaen — ei kellon perusteella.';
 steps.push({title:late.length?'Lisää '+join(late)+' myöhemmin':'Kypsennä aidosti pehmeäksi',text:cook});
 let blend='Poista mahdolliset laakerinlehdet. Ota kattila pois kuumalta levyltä. Käytä sauvasekoitinta oman laitteesi kuumia ruokia koskevan ohjeen mukaan. Pidä teräosa pinnan alla ja pysäytä kone ennen nostamista, jotta kuuma keitto ei roisku. Soseuta tasaiseksi. ';
 if(d.potato)blend+='Perunan vuoksi vältä tarpeettoman pitkää soseuttamista. ';
 blend+='Lisää vettä pienissä erissä, kunnes rakenne on sinulle sopiva.';
 steps.push({title:'Soseuta ja päätä lopullinen sakeus',text:blend});
 let finish='Lisää loput yrteistä maistaen ja anna niiden pehmetä lämpimässä keitossa muutama minuutti. Lisää aluksi noin '+measures.mustard+' Dijon-sinappia. ';
 if(s.profile==='mustard')finish+='Maista sinapin tuoma happamuus ennen muuta happoa. ';
 finish+='Lisää tarvittaessa aluksi noin '+measures.vinegar+' 10-prosenttista elintarvike-etikkaa. Määrä koskee nimenomaan 10 % etikkaa. ';
 if(d.paprika)finish+='Arvioi savuisuus maistamalla; savupaprikan voimakkuus vaihtelee. ';
 finish+='Säädä pienin lisäyksin. Lisää mustapippuria ja suolaa oman maun mukaan. Ota huomioon käyttämäsi kasvisliemen, fondin ja muiden suolaisten ainesten sisältämä suola. Maista ennen lisäsuolaa. Tarjoa esimerkiksi leivän kanssa.';
 steps.push({title:'Viimeistele maistamalla',text:finish});
 const ingredientNote='Mausteissa on Dijon-sinappia.'+(d.byId.celeriac?' Kasvispohjassa on myös juuriselleriä.':'')+' Tarkista käyttämäsi liemen, mausteseosten ja murskan ainesosat pakkauksista; malli ei tarkista erityisruokavalioita.';
 return {title,profile:s.profile,profileName:profile.name,profileDescription:profile.description,ingredients,seasonings,steps,measureNote:MEASURE_NOTE,notes:notices(s,d),userNotes:s.userNotes,ingredientNote,total:d.total,water:d.water,waterOwn:s.water.own!==null,provenance:'Määrät ja ajat ovat suuntaa-antavia. Porkkana–lanttu- ja kukkakaali–porkkana–juuriselleriyhdistelmistä on myönteistä kotikokeilua; muita yhdistelmiä ei ole järjestelmällisesti testattu.'};
}
function recipeText(r){
 return ['KASVISSOSEKEITTO · DYNAAMINEN RESEPTI '+VERSION,r.title,r.profileName,'',
 'Kasviksia '+grams(r.total)+' (ilman murskaa). Painot puhdistettuina.',
 'Aloitusvesi '+fmt(r.water/100)+' dl'+(r.waterOwn?' · oma määrä.': ' · lähtöehdotus.')+' Lopullinen määrä rakenteen mukaan.','',
 'AINEKSET',...r.ingredients.map(i=>i.name+': '+i.amount),'',
 r.profileName.toLocaleUpperCase('fi-FI')+' – LÄHTÖEHDOTUS',...r.seasonings.map(i=>i.name+': '+i.amount),'',r.measureNote,'',
 'VALMISTUS',...r.steps.flatMap((st,i)=>[(i+1)+'. '+st.title,st.text,'']),
 ...(r.notes.length?['HUOMIOT',...r.notes.map(n=>'• '+n),'']:[]),
 r.ingredientNote,'',
 ...(r.userNotes.trim()?['OMAT MUISTIINPANOT (eivät muuta reseptiä)',r.userNotes,'']:[]),
 'Seuraavalla lämmityskerralla arvioi sakeus lämpimänä ja lisää vettä vain tarvittaessa.','',r.provenance].join('\n');
}
const API={VERSION,VEG,PRIMARY,ONIONS,PROFILES,MAX_GRAMS,MAX_WATER,MAX_NOTES,MAX_GARLIC_TSP,defaults,validState,normalizeState,derive,buildRecipe,recipeText,clone,escapeHtml,fmt,fmtDecimal,grams,join,tspText,spoonMeasure};
if(typeof module==='object'&&module.exports)module.exports=API;
else root.SoupCore=Object.freeze(API);
})(typeof globalThis!=='undefined'?globalThis:this);
