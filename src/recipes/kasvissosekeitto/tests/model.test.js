'use strict';
const assert=require('node:assert/strict');
const m=require('../src/model.js');
let recipes=0, checks=0;
function check(name, fn){fn();checks++;console.log('OK '+name);}
check('default vegetables/water retained; garlic shown in teaspoons',()=>{
 const s=m.defaults(),d=m.derive(s);assert.ok(m.validState(s));
 assert.equal(d.total,1125);assert.equal(d.bTotal,250);assert.equal(d.onion,150);assert.equal(d.potato,175);assert.equal(d.garlic,2.5);assert.equal(d.water,700);
});
check('v0.2 state migration',()=>{
 const s=m.defaults();s.schema=2;delete s.profile;delete s.water;delete s.userNotes;
 const n=m.normalizeState(s);assert.ok(n);assert.equal(n.water.own,null);assert.equal(n.profile,'provencal');
});
check('invalid state, quantity and notes rejection',()=>{
 for(const change of [s=>s.primary.id='banana',s=>s.primary.grams=0,s=>s.onion.own=-1,s=>s.water.own=0,s=>s.water.own=55,s=>s.profile='other',s=>s.userNotes='x'.repeat(2001),s=>s.userNotes={},s=>s.primary.grams=Infinity,s=>s.b.push({...s.b[0]})]){
  const s=m.defaults();change(s);assert.equal(m.validState(s),false);assert.equal(m.normalizeState(s),null);
 }
});
check('custom amounts retained regardless of primary and profile',()=>{
 const s=m.defaults();s.b[0].own=250;s.b[0].autoChoice=false;s.onion.own=128;s.garlic.own=2.6;s.potato.own=210;s.water.own=750;
 for(const id of Object.keys(m.PRIMARY))for(const profile of Object.keys(m.PROFILES)){
  s.primary={id,grams:1200};s.profile=profile;const before=JSON.stringify(s),d=m.derive(s);
  assert.equal(d.b.amounts.b1,250);assert.equal(d.onion,128);assert.equal(d.garlic,2.6);assert.equal(d.potato,210);assert.equal(d.water,750);assert.equal(JSON.stringify(s),before);
 }
});
check('B allocation splits budget; own amounts never shrink',()=>{
 const s=m.defaults();s.b.push({uid:'b2',ingredient:'cauliflower',autoChoice:false,own:null});s.nextId=3;
 assert.equal(m.derive(s).bTotal,250);s.b[0].own=500;const d=m.derive(s);assert.equal(d.b.amounts.b1,500);assert.equal(d.b.amounts.b2,0);assert.ok(m.buildRecipe(s).notes.some(n=>n.includes('ylittää')));
});
check('duplicated A/B vegetable is merged in ingredient list',()=>{
 const s=m.defaults();s.b[0]={uid:'b1',ingredient:'carrot',autoChoice:false,own:250};const r=m.buildRecipe(s);
 assert.equal(r.ingredients.filter(i=>i.name==='Porkkana').length,1);assert.equal(r.ingredients[0].amount,'800 g');
});
check('seasoning changes actual ingredients and preparation',()=>{
 let s=m.defaults();s.profile='smoky';let r=m.buildRecipe(s);
 assert.ok(r.seasonings.some(i=>i.name==='Savupaprika, mieto'));assert.ok(r.steps.some(i=>i.text.includes('savupaprika')));assert.ok(!r.seasonings.some(i=>i.name.includes('Provence')));
 s.profile='mustard';r=m.buildRecipe(s);assert.ok(r.seasonings.some(i=>i.name==='Kuivattu meirami'));assert.ok(!r.seasonings.some(i=>i.name.includes('Savupaprika')));assert.ok(r.steps.some(i=>i.text.includes('ennen muuta happoa')));
});
check('cauliflower-only and no potato/onion/garlic have no stale steps',()=>{
 const s=m.defaults();s.primary.id='cauliflower';s.b=[];s.onion.own=0;s.garlic.own=0;s.potato.own=0;
 const r=m.buildRecipe(s);const text=r.steps.map(x=>x.text).join(' ');
 assert.ok(!/peruna|sipuli|lanttu|porkkana/i.test(text));assert.ok(text.includes('Lisää kukkakaali nyt.'));assert.ok(!r.steps.some(x=>x.title==='Rakenna paahteinen pohja'));
});
check('notes are data and do not change recipe amounts or steps',()=>{
 const s=m.defaults(),a=m.buildRecipe(s);s.userNotes='Lanttu hyvä.\n</script><img src=x onerror="alert(1)">';const b=m.buildRecipe(s);
 assert.deepEqual(a.ingredients,b.ingredients);assert.deepEqual(a.steps,b.steps);assert.ok(m.recipeText(b).includes(s.userNotes));
});
check('low and high custom-water notices',()=>{
 const s=m.defaults();s.water.own=50;assert.ok(m.buildRecipe(s).notes.some(n=>n.includes('vähän suhteessa')));
 s.water.own=2000;assert.ok(m.buildRecipe(s).notes.some(n=>n.includes('run saasti'.replace(' ',''))));
});
check('third B ingredient gets useful suggestion even when two user quantities fill basket',()=>{
 const s=m.defaults();s.primary={id:'cauliflower',grams:900};
 s.b=[{uid:'b1',ingredient:'carrot',autoChoice:false,own:250},{uid:'b2',ingredient:'celeriac',autoChoice:false,own:100},{uid:'b3',ingredient:'swede',autoChoice:false,own:null}];s.nextId=4;
 const d=m.derive(s);
 assert.equal(d.b.target,350);assert.equal(d.b.amounts.b1,250);assert.equal(d.b.amounts.b2,100);
 assert.equal(d.b.amounts.b3,100);assert.equal(d.b.extra,100);assert.ok(m.buildRecipe(s).notes.some(n=>n.includes('keitt o erää'.replace(/ /g,''))));
 s.primary.grams=500;assert.equal(m.derive(s).b.amounts.b1,250);assert.equal(m.derive(s).b.amounts.b2,100);
 s.b[2].own=0;assert.equal(m.derive(s).b.amounts.b3,0); // Explicit zero stays zero.
 s.b[2].own=80;assert.equal(m.derive(s).b.amounts.b3,80);
});
check('third starter is modest with other auto B rows',()=>{
 const s=m.defaults();s.b.push({uid:'b2',ingredient:'cauliflower',autoChoice:false,own:null},{uid:'b3',ingredient:'celeriac',autoChoice:false,own:null});s.nextId=4;
 const d=m.derive(s);assert.equal(d.bTotal,d.b.target);
 assert.ok(d.b.amounts.b3>0&&d.b.amounts.b3<=100);
 assert.ok(d.b.amounts.b3<=Math.max(25,Math.round(s.primary.grams*.14/25)*25));
 s.primary.grams=1800;assert.equal(m.derive(s).b.amounts.b3,100);
});
check('salt and black pepper remain qualitative through all outputs',()=>{
 const s=m.defaults(),r=m.buildRecipe(s);
 const pepper=r.seasonings.find(i=>i.name==='Mustapippuri, jauhettu');
 const salt=r.seasonings.find(i=>i.name==='Suola');
 assert.equal(pepper.amount,'oman maun mukaan');
 assert.ok(salt.amount.startsWith('oman maun mukaan'));
 assert.ok(salt.amount.includes('kasvisliemen suola'));
 assert.ok(!('salt' in m.derive(s))&&!('pepper' in m.derive(s)));
 for(const text of [m.recipeText(r),r.steps.map(i=>i.text).join(' '),r.measureNote]){
  assert.ok(!text.includes('0,6 %'));
  assert.ok(!text.includes('Suolan viitteellinen'));
  assert.ok(!text.includes('maustemitta'));
 }
 const waterBefore=r.seasonings;s.water.own=2500;
 assert.deepEqual(m.buildRecipe(s).seasonings,waterBefore);
 assert.ok(!m.recipeText(m.buildRecipe(s)).includes('Sopivaa keittoa ei tarvitse'));
 assert.ok(m.buildRecipe(s).steps.at(-1).text.includes('kasvisliemen, fondin'));
 assert.equal(m.spoonMeasure(.5,'vinegar'),'muutama tippa');
});
check('browning batches occupy one layer, without a total browning time',()=>{
 for(const caseId of ['carrot','swede','cabbage']){
  const s=m.defaults();s.primary.id=caseId;
  const browning=m.buildRecipe(s).steps.find(st=>st.title==='Rakenna paahteinen pohja').text;
  assert.ok(browning.includes('yhteen kerrokseen'));
  assert.ok(browning.includes('Eriä voi olla niin monta kuin tarvitaan'));
  assert.ok(!browning.includes('10–25 minuuttia'));
 }
 const s=m.defaults();s.primary.id='sweetpotato';s.b=[];
 const browning=m.buildRecipe(s).steps.find(st=>st.title==='Rakenna paahteinen pohja').text;
 assert.ok(browning.includes('yhteen kerrokseen'));
});
check('brown fond instructions are conditional and warn about burnt black residue',()=>{
 let s=m.defaults(),r=m.buildRecipe(s);
 const x=r.steps.find(st=>st.title==='Lisää valitun maustelinjan mausteet ja vesi').text;
 assert.ok(x.includes('Jos astian pohjassa on ruskeita paistojäämiä'));
 assert.ok(x.indexOf('aivan mustia')<x.indexOf('aloitusvesi'));
 s.primary.id='cauliflower';s.b=[];s.onion.own=0;s.potato.own=0;
 r=m.buildRecipe(s);
 const t=r.steps.find(st=>st.title==='Lisää valitun maustelinjan mausteet ja vesi').text;
 assert.ok(!t.includes('ruskeita paistojäämiä'));
});
check('deterministic combination matrix',()=>{
 for(const primary of Object.keys(m.PRIMARY))for(const b of [null,...Object.keys(m.VEG)])for(const onion of Object.keys(m.ONIONS))for(const profile of Object.keys(m.PROFILES))for(const size of [100,550,2000])for(const potato of [null,0]){
  const s=m.defaults();s.primary={id:primary,grams:size};s.b=b?[{uid:'b1',ingredient:b,autoChoice:false,own:null}]:[];s.onion.id=onion;s.potato.own=potato;s.profile=profile;
  const before=JSON.stringify(s);assert.ok(m.validState(s));const d=m.derive(s),r=m.buildRecipe(s),text=m.recipeText(r);recipes++;
  assert.equal(JSON.stringify(s),before);assert.ok(Number.isFinite(d.total)&&d.total>0);assert.ok(d.water>=50);assert.ok(!/NaN|undefined|\[object Object\]/.test(text));
  assert.equal(d.total,Object.values(d.byId).reduce((a,b)=>a+b,0)+d.onion+d.potato);
  if(potato===0)assert.ok(!r.steps.map(x=>x.text).join(' ').toLowerCase().includes('peruna'));
  for(const [id,amount] of Object.entries(d.byId))assert.ok(r.ingredients.some(i=>i.name===m.VEG[id].name&&i.amount===m.grams(amount)));
 }
});


check('legacy schema 2/3 garlic grams migrate once to explicit schema 4 tsp',()=>{
 for(const schema of [2,3]){
  const old=m.defaults();old.schema=schema;old.garlic.own=19;
  if(schema===2){delete old.water;delete old.profile;delete old.userNotes;}
  const n=m.normalizeState(old);assert.equal(n.schema,4);assert.equal(n.garlic.own,3.8);
  assert.equal(m.normalizeState(n).garlic.own,3.8);
  old.garlic.own=-1;assert.equal(m.normalizeState(old),null);
 }
 const s=m.defaults();s.garlic.own=.25;assert.ok(m.validState(s));
 for(const n of [-1,NaN,Infinity,.123,4001,'2']){s.garlic.own=n;assert.equal(m.validState(s),false);}
});
check('user cauliflower example retains vegetables and water; spices are volumes',()=>{
 const s=m.defaults();s.primary={id:'cauliflower',grams:900};
 s.b=[{uid:'b1',ingredient:'carrot',autoChoice:false,own:250},{uid:'b2',ingredient:'celeriac',autoChoice:false,own:100}];s.nextId=3;s.potato.own=0;s.profile='smoky';
 const d=m.derive(s),r=m.buildRecipe(s),text=m.recipeText(r);
 assert.equal(d.total,1475);assert.equal(d.onion,225);assert.equal(d.water,750);assert.equal(d.garlic,4);
 assert.ok(r.ingredients.some(x=>x.name.includes('murska')&&x.amount==='noin 4 tl'));
 assert.ok(r.seasonings.some(x=>x.name==='Kuivattu timjami'&&x.amount==='aloita noin 1 ½ tl'));
 assert.ok(r.seasonings.some(x=>x.name.includes('etikka')&&x.amount==='tarvittaessa aluksi noin ¼ tl'));
 assert.ok(text.includes('kiehumisen palaamisesta'));
 assert.equal((r.steps.map(x=>x.text).join(' ').match(/aloitusvesi \(/g)||[]).length,1);
 assert.ok(r.seasonings.every(x=>!/\d\s*g\b/.test(x.amount)));
 assert.equal(r.seasonings.find(x=>x.name==='Suola').amount,'oman maun mukaan; huomioi kasvisliemen suola');
 assert.equal(r.seasonings.find(x=>x.name==='Mustapippuri, jauhettu').amount,'oman maun mukaan');
 assert.ok(text.includes('tl = 5 ml'));assert.ok(!text.includes('19 g'));
});
check('ingredient and final seasoning quantities share a single formatted source',()=>{
 for(const profile of Object.keys(m.PROFILES))for(const size of [1,100,550,900,2000,20000]){
  const s=m.defaults();s.primary.grams=size;s.profile=profile;const r=m.buildRecipe(s),finish=r.steps.at(-1).text;
  for(const [name,pre] of [['Dijon-sinappi','aloita noin '],['Väkiviinaetikka 10 %','tarvittaessa aluksi noin ']]){
   const measure=r.seasonings.find(x=>x.name===name).amount.replace(pre,'');assert.ok(finish.includes(measure));
  }
  assert.ok(!r.seasonings.some(x=>/\b(?:NaN|undefined)\b/.test(x.amount)));
  assert.ok(r.seasonings.every(x=>!/\d\s*g\b/.test(x.amount)));
 }
});
check('all 0–3 vegetable baskets: timing branches, omitted ingredients, single water, volume spices',()=>{
 const vegIds=Object.keys(m.VEG), baskets=[[]];
 function add(start,sofar){if(sofar.length===3)return;for(let i=start;i<vegIds.length;i++){const b=[...sofar,vegIds[i]];baskets.push(b);add(i+1,b);}}
 add(0,[]);assert.equal(baskets.length,130);
 for(const primary of Object.keys(m.PRIMARY))for(const basket of baskets)for(const onion of [null,...Object.keys(m.ONIONS)])for(const potato of [0,175])for(const garlic of [0,2.5])for(const profile of Object.keys(m.PROFILES)){
  const s=m.defaults();s.primary={id:primary,grams:900};s.b=basket.map((ingredient,i)=>({uid:'b'+(i+1),ingredient,autoChoice:false,own:100}));s.nextId=Math.max(2,s.b.length+1);
  s.onion={id:onion||'onion',own:onion?150:0};s.potato.own=potato;s.garlic.own=garlic;s.profile=profile;
  assert.ok(m.validState(s));const d=m.derive(s),r=m.buildRecipe(s);recipes++;
  const texts=r.steps.map(x=>x.text),all=texts.join(' '),start=r.steps.find(x=>x.title==='Lisää valitun maustelinjan mausteet ja vesi').text;
  assert.equal((all.match(/aloitusvesi \(/g)||[]).length,1);
  assert.ok(!all.includes('kaada vesi heti perään. Lisää'));
  assert.ok(!/undefined|NaN|\[object Object\]/.test(all));
  assert.ok(r.seasonings.every(x=>!/\d\s*g\b/.test(x.amount)));
 assert.equal(r.seasonings.find(x=>x.name==='Suola').amount,'oman maun mukaan; huomioi kasvisliemen suola');
 assert.equal(r.seasonings.find(x=>x.name==='Mustapippuri, jauhettu').amount,'oman maun mukaan');
  if(!potato)assert.ok(!/peruna/i.test(all));
  if(!garlic)assert.ok(!all.includes('valkosipulimurska'));
  if(!onion)assert.ok(!/keltasipuli|punasipuli|purjo/.test(all));
  for(const id of vegIds)if(!d.byId[id])assert.ok(!all.includes(m.VEG[id].acc),id+' is absent');
  if(potato){assert.ok(texts[0].includes('Pidä peruna erillään'));assert.ok(start.includes('Lisää peruna.'));}
  if(profile==='smoky')assert.ok(/Lisää savupaprika, sekoita muutaman sekunnin ajan ja kaada heti perään aloitusvesi/.test(start));
  const early=potato>0||Object.keys(d.byId).some(id=>m.VEG[id].prep==='root'||id==='cabbage');
  const cook=r.steps.find(x=>x.title.startsWith('Lisää ')&&x.title.endsWith(' myöhemmin')||x.title==='Kypsennä aidosti pehmeäksi').text;
  assert.ok(cook.includes('Laita kansi päälle ja kuumenna hiljaiseen kiehumiseen.'));
  assert.ok(cook.includes('Pidä kansi päällä'));
  if(d.byId.cauliflower&&early){
   assert.ok(cook.includes('kukkakaali')&&cook.includes('. Laita kansi takaisin ja kuumenna uudelleen hiljaiseen kiehumiseen.'));
   assert.ok(cook.includes('kiehumisen palaamisesta'));
   assert.ok(!start.includes('Lisää kukkakaali nyt.'));
  }else if(d.byId.cauliflower){assert.ok(start.includes('Lisää kukkakaali nyt.'));assert.ok(!cook.includes('uudelleen'));}
 }
});
check('bataatti as primary: sweet-body no extra potato, adaptive late stage',()=>{
 const s=m.defaults();s.primary.id='sweetpotato';s.b[0].ingredient='cauliflower';
 assert.ok(m.validState(s));assert.equal(m.PRIMARY.sweetpotato.other,'cauliflower');
 const d=m.derive(s),r=m.buildRecipe(s),text=m.recipeText(r);
 assert.equal(d.potato,0);assert.ok(d.water>0);
 assert.ok(r.ingredients.some(i=>i.name==='Bataatti'));assert.ok(r.ingredients.some(i=>i.name==='Kukkakaali'));
 assert.ok(text.includes('Bataatti'));assert.ok(text.includes('Laakerinlehti (valinnainen)'));
 assert.ok(text.includes('Poista mahdolliset laakerinlehdet.'));
 assert.ok(r.steps.map(x=>x.text).join(' ').includes('Lisää kukkakaali nyt.'));
 assert.ok(r.steps.map(x=>x.text).join(' ').includes('Tarkista kukkakaalin ja bataatin kypsyys'));
});
check('bataatti as B vegetable: user chosen amount stays; delayed with hard roots',()=>{
 const s=m.defaults();s.primary={id:'carrot',grams:550};s.b=[{uid:'b1',ingredient:'sweetpotato',autoChoice:false,own:350}];s.potato.own=0;
 const d=m.derive(s),r=m.buildRecipe(s),text=m.recipeText(r);
 assert.equal(d.b.amounts.b1,350);assert.ok(d.suggested.potato<200);
 assert.ok(r.ingredients.some(i=>i.name==='Bataatti'&&i.amount==='350 g'));
 assert.ok(text.includes('Lisää bataatti. Laita kansi takaisin ja'));
 assert.ok(!r.steps.find(x=>x.title==='Lisää valitun maustelinjan mausteet ja vesi').text.includes('Kokoa porkkana, bataatti'));
 assert.ok(text.includes('bataatin lisäämistä'));
});
check('sweet potato, cauliflower and slow root: both late; no phantom ingredients',()=>{
 const s=m.defaults();s.primary={id:'sweetpotato',grams:700};
 s.b=[{uid:'b1',ingredient:'carrot',autoChoice:false,own:200},{uid:'b2',ingredient:'cauliflower',autoChoice:false,own:250}];s.nextId=3;s.potato.own=0;
 const r=m.buildRecipe(s),text=m.recipeText(r),cook=r.steps.find(x=>x.title.includes('myöhemmin'));
 assert.ok(cook);assert.ok(cook.title.includes('bataatti'));assert.ok(cook.title.includes('kukkakaali'));
 assert.ok(cook.text.includes('Lisää bataatti ja kukkakaali. Laita kansi takaisin ja'));
 assert.ok(cook.text.includes('Ennen bataatin ja kukkakaalin lisäämistä porkkana saa olla'));
 assert.equal((text.match(/aloitusvesi \(/g)||[]).length,1);
});
check('unconstrained cooking philosophy is shown, with no invented result from user test',()=>{
 const s=m.defaults();s.primary.id='cauliflower';s.b=[];s.potato.own=0;s.profile='smoky';
 const r=m.buildRecipe(s);assert.ok(r.provenance.includes('myönteistä kotikokeilua'));
 assert.ok(r.provenance.includes('muita yhdistelmiä ei ole järjestelmällisesti testattu'));
});
console.log(JSON.stringify({passed:checks,recipes},null,2));
