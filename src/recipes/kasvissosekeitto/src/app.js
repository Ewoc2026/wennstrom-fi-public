/* Kasvissosekeitto 0.3.4 — browser UI. No remote requests or persistent browser storage. */
(function () {
'use strict';
const {VERSION,VEG,PRIMARY,ONIONS,PROFILES,MAX_GRAMS,MAX_WATER,MAX_NOTES,MAX_GARLIC_TSP,defaults,normalizeState,validState,derive,buildRecipe,recipeText,clone,escapeHtml,fmt,fmtDecimal,grams}=window.SoupCore;
const $=id=>document.getElementById(id);
document.documentElement.classList.remove('no-js');
let state=defaults(), history=[], currentRecipe, toastTimer, initialWarning='', notesGroup=false;
const dirtyFields=new Set();
const errors=new Map();
try{
 const embedded=JSON.parse($('initial-state').textContent);
 const loaded=normalizeState(embedded);
 if(loaded)state=loaded;
 else if(embedded!==null)initialWarning='Tallennettuja valintoja ei voitu lukea. Näytetään oletusyhdistelmä, ei tallennettuja määriä.';
}catch(_){initialWarning='Tallennettu valintatieto on vaurioitunut. Näytetään oletusyhdistelmä.';}
function patchHtml(host, html){
 const template=document.createElement('template');template.innerHTML=html;
 function compatible(a,b){return a&&a.nodeType===b.nodeType&&(a.nodeType!==1||(a.tagName===b.tagName&&a.id===b.id));}
 function children(parent,wanted){
   const nodes=Array.from(wanted.childNodes);
   nodes.forEach((next,i)=>{
     let old=parent.childNodes[i];
     if(!compatible(old,next)){
       const matching=next.nodeType===1&&next.id?Array.from(parent.childNodes).slice(i+1).find(n=>compatible(n,next)):null;
       if(matching){parent.insertBefore(matching,old||null);old=matching;}
       else {const fresh=next.cloneNode(true);if(old)parent.replaceChild(fresh,old);else parent.appendChild(fresh);return;}
     }
     if(next.nodeType===3){if(old.data!==next.data)old.data=next.data;return;}
     if(next.nodeType!==1)return;
     for(const attr of Array.from(old.attributes))if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
     for(const attr of Array.from(next.attributes))if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
     if(next.tagName==='INPUT'){
       if(old.value!==next.value)old.value=next.value;
       old.checked=next.checked;
     }else if(next.tagName==='TEXTAREA'){
       if(old.value!==next.value)old.value=next.value;
       if(old.textContent!==next.textContent)old.textContent=next.textContent;
     }else{
       children(old,next);
       if(next.tagName==='SELECT'&&old.value!==next.value)old.value=next.value;
     }
   });
   while(parent.childNodes.length>nodes.length)parent.lastChild.remove();
 }
 children(host,template.content);
}
function badge(own){return '<span class="badge'+(own!==null?' own':'')+'">'+(own!==null?'Oma määrä · pysyy':'Ehdotus · mukautuu')+'</span>';}
function numInput(id,value,label,min=0){return '<label for="'+id+'">'+label+'</label><div class="amount-line"><input id="'+id+'" class="field-unit-input" type="number" min="'+min+'" max="'+MAX_GRAMS+'" step="1" inputmode="numeric" value="'+value+'" aria-label="'+label+' grammoina" aria-describedby="'+id+'-error"><span class="unit">g</span></div><p class="field-error" id="'+id+'-error"></p>';}
function waterInput(value){return '<label for="water-dl">Aloitusveden määrä</label><div class="amount-line"><input id="water-dl" class="water-input field-unit-input" type="text" inputmode="decimal" autocomplete="off" value="'+fmt(value/100)+'" aria-label="Aloitusveden määrä desilitroina" aria-describedby="water-dl-error water-help"><span class="unit">dl</span></div><p class="field-error" id="water-dl-error"></p>';}
function garlicInput(value){return '<label for="garlic-tsp">Murskan määrä</label><div class="amount-line"><input id="garlic-tsp" class="field-unit-input" type="text" inputmode="decimal" autocomplete="off" value="'+fmtDecimal(value)+'" aria-label="Valkosipulimurskan määrä teelusikkoina" aria-describedby="garlic-tsp-error garlic-help"><span class="unit">tl</span></div><p class="field-error" id="garlic-tsp-error"></p>';}
function selectOptions(items,selected,labelFn){return items.map(id=>'<option value="'+id+'"'+(selected===id?' selected':'')+'>'+escapeHtml(labelFn(id))+'</option>').join('');}
function bOptions(row){
 const taken=state.b.filter(r=>r.uid!==row.uid).map(r=>r.ingredient);
 const rec=PRIMARY[state.primary.id].recommended;
 const ordered=[...rec,...Object.keys(VEG).filter(id=>!rec.includes(id))].filter(id=>!taken.includes(id));
 return ordered.map(id=>'<option value="'+id+'"'+(id===row.ingredient?' selected':'')+'>'+escapeHtml(VEG[id].name+(rec.includes(id)?' · ehdotus':''))+'</option>').join('');
}
function renderControls(d){
 let html='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">A</span><h2>Pääkasvis</h2></div><p class="sub">Tämä on valintojen lähtökohta. Anna se määrä, jonka aiot käyttää.</p><div class="row"><div><label for="primary-id">Pääkasvis</label><select id="primary-id">'+selectOptions(Object.keys(PRIMARY),state.primary.id,id=>VEG[id].name)+'</select></div><div>'+numInput('primary-grams',state.primary.grams,'Pääkasviksen määrä',1)+'</div></div><p class="field-note">'+PRIMARY[state.primary.id].tip+'</p></section>';
 html+='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">B</span><h2>Täydentävät kasvikset</h2></div><p class="sub">Valitse 0–3 kasvista. Kolmannelle ehdotetaan omaa pientä aloitusmäärää, vaikka B-kori olisi täynnä. Itse asettamiasi määriä ei pienennetä.</p><div id="b-rows">';
 if(!state.b.length)html+='<p class="empty">Ei täydentäviä kasviksia. Sekin käy.</p>';
 state.b.forEach((r,i)=>{
  html+='<div class="ingredient-row" id="'+r.uid+'-row"><div class="row"><div><label for="'+r.uid+'-id">Täydentävä kasvis '+(i+1)+'</label><select id="'+r.uid+'-id" data-b="'+r.uid+'">'+bOptions(r)+'</select><p class="field-note">'+(r.autoChoice?'Kasvis vaihtuu pääkasviksen mukana, kunnes teet oman valinnan.':'Valitsemasi kasvis säilyy pääkasvista vaihtaessa.')+'</p></div><div>'+numInput(r.uid+'-grams',d.b.amounts[r.uid],VEG[r.ingredient].name+' — määrä')+badge(r.own)+'</div></div><div class="row-bottom"><button class="link-btn remove" type="button" data-remove="'+r.uid+'">Poista '+VEG[r.ingredient].name.toLowerCase()+'</button>'+(r.own!==null?'<button class="link-btn" type="button" data-auto-b="'+r.uid+'">Palauta määräehdotus</button>':'')+'</div></div>';
 });
 html+='</div><div class="b-foot"><button type="button" class="btn" id="add-b"'+(state.b.length>=3?' disabled':'')+'>+ Lisää kasvis</button><p class="small">B-korissa nyt <strong>'+grams(d.bTotal)+'</strong>. Lähtöehdotus noin '+grams(d.b.target)+' — sitä ei tarvitse täyttää.</p></div></section>';
 html+='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">C</span><h2>Sipuli ja valkosipuli</h2></div><p class="sub">Ehdotukset seuraavat A- ja B-korin yhteismäärää. Oma määrä voi olla myös nolla.</p><div class="row"><div><label for="onion-id">Sipuli</label><select id="onion-id">'+selectOptions(Object.keys(ONIONS),state.onion.id,id=>ONIONS[id])+'</select></div><div>'+numInput('onion-grams',d.onion,'Sipulin määrä')+badge(state.onion.own)+'</div></div>'+(state.onion.own!==null?'<button class="link-btn" type="button" data-auto="onion">Palauta sipulin ehdotus</button>':'');
 html+='<div class="simple-field"><div class="row"><div class="line-label">Valkosipulimurska</div><div>'+garlicInput(d.garlic)+badge(state.garlic.own)+'</div></div>'+(state.garlic.own!==null?'<button class="link-btn" type="button" data-auto="garlic">Palauta murskan ehdotus</button>':'')+'<p class="field-note" id="garlic-help">Anna määrä teelusikkoina, esimerkiksi 2,5. Määräehdotus koskee 70 % valkosipulia sisältävää Valkoliekki-murskaa. Muun tuotteen voimakkuus ja suola voivat poiketa. Lusikkamäärä on arvio, ei tuotteesta mitattu tarkka muunnos.</p></div></section>';
 html+='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">D</span><h2>Peruna</h2></div><p class="sub">Rakenteen tueksi, ei pakolliseksi täytteeksi. Määrä 0 jättää perunan pois myös työohjeesta.</p><div class="row"><div class="line-label">Peruna</div><div>'+numInput('potato-grams',d.potato,'Perunan määrä')+badge(state.potato.own)+'</div></div>'+(state.potato.own!==null?'<button class="link-btn" type="button" data-auto="potato">Palauta perunan ehdotus</button>':'')+'</section><p class="small controls-hint">Muokattu määrä tulee voimaan, kun poistut kentästä tai painat Enter. Kirjoittamasi määrä säilyy; palautuspainike ottaa automaattisen ehdotuksen takaisin käyttöön.</p>';

 html+='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">E</span><h2>Vesi</h2></div><p class="sub" id="water-help">Aloitusarvio kannen alla kypsentämiseen, ei lopullinen tavoite. Oma määrä pysyy, vaikka muuttaisit keittoerää.</p><div class="row"><div><div class="line-label">Automaattinen ehdotus</div><p class="field-note">Nyt noin '+fmt(d.suggested.water/100)+' dl</p></div><div>'+waterInput(d.water)+badge(state.water.own)+'</div></div>'+(state.water.own!==null?'<button class="link-btn" type="button" data-auto="water">Palauta veden ehdotus</button>':'')+'<p class="field-note">Voit kirjoittaa esimerkiksi 7 tai 7,5. Lisää vettä tarvittaessa jo kypsennyksen aikana ja säädä sakeus soseutuksen jälkeen.</p></section>';
 html+='<section class="card"><div class="card-head"><span class="letter" aria-hidden="true">F</span><h2>Maustaminen</h2></div><label for="profile-id">Maustelinja</label><select id="profile-id" aria-describedby="profile-help">'+selectOptions(Object.keys(PROFILES),state.profile,id=>PROFILES[id].name)+'</select><p id="profile-help" class="profile-note">'+escapeHtml(PROFILES[state.profile].description)+'</p><p class="field-note">Vaihto muuttaa mausteluetteloa ja työvaiheita, ei omia kasvis- tai vesimääriäsi. Mausta lopuksi maistamalla.</p></section>';
 html+='<section class="card"><div class="card-head"><h2>Omat muistiinpanot</h2></div><label for="user-notes">Vapaa havainto tai muistutus</label><textarea id="user-notes" rows="4" maxlength="'+MAX_NOTES+'" aria-describedby="notes-help notes-privacy" placeholder="Esimerkiksi: lanttu korostui hieman; muuten hyvä.">'+escapeHtml(state.userNotes)+'</textarea><p class="notes-count" id="notes-count">'+state.userNotes.length+' / '+MAX_NOTES+'</p><p class="small" id="notes-help">Muistiinpano ei muuta laskentaa tai valmistusohjeen vaiheita.</p><p class="privacy-note" id="notes-privacy">Tallennettu HTML, kopioitu ohje ja tuloste sisältävät myös muistiinpanosi. Niitä ei lähetetä palvelimelle. Muista tämä, jos jaat tiedoston.</p></section>';
 patchHtml($('controls'),html);
}
function listHtml(items){return '<ul class="ingredient-list">'+items.map(i=>'<li><span>'+escapeHtml(i.name)+'</span><span class="qty">'+escapeHtml(i.amount)+'</span></li>').join('')+'</ul>';}
function render(){
 const d=derive(state);currentRecipe=buildRecipe(state,d);
 renderControls(d);
 $('summary').innerHTML='<div class="stats"><div><div class="stat-label">Kasviksia yhteensä</div><div class="stat-number">'+grams(d.total)+'</div><div class="stat-note">Raakapaino, ilman murskaa</div></div><div><div class="stat-label">Aloitusvesi</div><div class="stat-number">'+fmt(d.water/100)+' dl</div><div class="stat-note">'+(state.water.own!==null?'Oma määrä · pysyy':'Lähtöehdotus')+'</div></div></div>'+listHtml(currentRecipe.ingredients.filter(i=>i.name!=='Vesi aluksi'))+'<p class="inline-msg"><strong>'+escapeHtml(currentRecipe.profileName)+'</strong><br>Kasvisten yhteispaino ei ole valmiin keiton saanto.</p>';
 $('notices').innerHTML=currentRecipe.notes.length?'<div class="note-box"><strong>Huomio tähän yhdistelmään</strong>'+currentRecipe.notes.map(n=>'<p>'+escapeHtml(n)+'</p>').join('')+'</div>':'';
 patchHtml($('valmis-ohje'),'<div class="recipe-heading"><div><span class="eyebrow">Valittu valmistusohje / '+VERSION+'</span><h2>'+escapeHtml(currentRecipe.title)+'</h2><p class="recipe-title-sub"><strong>'+escapeHtml(currentRecipe.profileName)+'.</strong> Paksuhko kasvissosekeitto esimerkiksi leivän rinnalle. Ohje vastaa hyväksyttyjä valintoja.</p></div><div class="toolbar no-print recipe-actions"><button type="button" class="btn btn-primary" id="copy">Kopioi ohje</button><button type="button" class="btn" id="print">Tulosta</button></div></div><div class="recipe-meta"><span><strong>'+grams(d.total)+'</strong> kasviksia</span><span>Aloitusvesi <strong>'+fmt(d.water/100)+' dl</strong>'+(state.water.own!==null?' · oma määrä':' · ehdotus')+'</span><span>Painot puhdistettuina</span></div><div class="recipe-layout"><div class="recipe-ingredients"><h3>Ainekset</h3>'+listHtml(currentRecipe.ingredients)+'<div class="seasoning"><h3>'+escapeHtml(currentRecipe.profileName)+'</h3>'+listHtml(currentRecipe.seasonings)+'<p class="small seasoning-note">'+escapeHtml(currentRecipe.measureNote)+'</p><p class="small seasoning-note">'+escapeHtml(currentRecipe.ingredientNote)+'</p></div></div><div><h3>Valmistus</h3><ol class="steps">'+currentRecipe.steps.map(st=>'<li><div><h4>'+escapeHtml(st.title)+'</h4><p>'+escapeHtml(st.text)+'</p></div></li>').join('')+'</ol></div></div>'+(currentRecipe.notes.length?'<div class="recipe-notes">'+currentRecipe.notes.map(n=>'<p>'+escapeHtml(n)+'</p>').join('')+'</div>':'')+'<section id="recipe-user-notes" class="user-notes"'+(state.userNotes.trim()?'':' hidden')+'><h3>Omat muistiinpanot</h3><p id="recipe-user-notes-text"></p></section><p class="fineprint">Seuraavalla lämmityskerralla arvioi sakeus lämpimänä ja lisää vettä vain tarvittaessa.</p><p class="fineprint">'+escapeHtml(currentRecipe.provenance)+'</p>');
 // User text is never parsed as HTML. This also applies to exported files.
 $('recipe-user-notes-text').textContent=state.userNotes;
 $('undo').disabled=history.length===0;
 $('save').disabled=false;$('reset').disabled=false;
 renderErrors();
}
function renderErrors(){
 document.querySelectorAll('.field-error').forEach(el=>el.textContent='');
 document.querySelectorAll('#controls input').forEach(el=>{el.removeAttribute('aria-invalid');el.setCustomValidity('');});
 for(const [id,message] of errors){
  const field=$(id),hint=$(id+'-error');
  if(field){field.setAttribute('aria-invalid','true');field.setCustomValidity(message);}
  if(hint)hint.textContent=message;
 }
 $('invalid-status').textContent=errors.size?'Korjaa merkitty määrä. Valmistusohjeessa on edelleen edellinen hyväksytty määrä; tallennus, kopiointi ja tulostus odottavat korjausta.':'';
}
function notify(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').textContent='';},5500);}
function pushHistory(){history.push(clone(state));if(history.length>30)history.shift();}
function commit(fn,message){
 const next=clone(state);fn(next);
 if(!validState(next))throw new Error('Invalid state transition');
 if(JSON.stringify(next)===JSON.stringify(state))return;
 pushHistory();state=next;notesGroup=false;render();
 const d=derive(state);$('live-status').textContent=message+' Kasviksia '+grams(d.total)+', aloitusvettä '+fmt(d.water/100)+' dl.';
}
function preserveFocus(id){const el=$(id);if(el)el.focus({preventScroll:true});}
function readAmount(el){
 const raw=el.value.trim();
 if(el.id==='garlic-tsp'){
  const n=Number(raw.replace(',','.'));
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(raw)||!Number.isFinite(n)||n<0||n>MAX_GARLIC_TSP)return {error:'Anna 0–'+fmt(MAX_GARLIC_TSP)+' tl, enintään kahdella desimaalilla (esimerkiksi 2,5 tai 0,25).'};
  return {value:n};
 }
 if(el.id==='water-dl'){
  const normalized=raw.replace(',','.');
  const dl=Number(normalized);
  if(!/^\d+(?:[.,]\d)?$/.test(raw)||!Number.isFinite(dl)||dl<.5||dl>MAX_WATER/100)return {error:'Anna 0,5–'+fmt(MAX_WATER/100)+' dl, enintään yhdellä desimaalilla (esimerkiksi 7,5).'};
  return {value:Math.round(dl*100)};
 }
 const value=Number(raw),min=Number(el.min||0);
 if(raw===''||!Number.isInteger(value)||value<min||value>MAX_GRAMS)return {error:'Anna kokonaisluku '+min+'–'+MAX_GRAMS+' g.'};
 return {value};
}
function applyAmount(s,id,value){
 if(id==='primary-grams')s.primary.grams=value;
 else if(id==='water-dl')s.water.own=value;
 else if(id==='onion-grams')s.onion.own=value;
 else if(id==='garlic-tsp')s.garlic.own=value;
 else if(id==='potato-grams')s.potato.own=value;
 else{const r=s.b.find(r=>id===r.uid+'-grams');if(r){r.own=value;r.autoChoice=false;}}
}
function flushPending(focusError=false){
 const changes=[];
 for(const id of dirtyFields){
  const el=$(id);if(!el)continue;
  const result=readAmount(el);
  if(result.error)errors.set(id,result.error);
  else {errors.delete(id);el.setCustomValidity('');changes.push([id,result.value]);}
 }
 renderErrors();
 if(errors.size){if(focusError){const first=$(errors.keys().next().value);if(first)first.focus();}return false;}
 if(changes.length){dirtyFields.clear();commit(s=>changes.forEach(([id,n])=>applyAmount(s,id,n)),'Oma määrä otettu käyttöön.');}
 return true;
}
function handlePrimary(id){
 commit(s=>{
  s.primary.id=id;const next=PRIMARY[id].other;
  s.b.forEach(r=>{if(r.autoChoice&&r.own===null&&!s.b.some(other=>other.uid!==r.uid&&other.ingredient===next))r.ingredient=next;});
 },'Pääkasvis vaihdettu. Omat määrät säilyvät.');
 preserveFocus('primary-id');
}
function oldSelectValue(el){
 if(el.id==='primary-id')return state.primary.id;
 if(el.id==='onion-id')return state.onion.id;
 if(el.id==='profile-id')return state.profile;
 if(el.dataset.b)return state.b.find(r=>r.uid===el.dataset.b)?.ingredient;
 return el.value;
}
$('controls').addEventListener('input',e=>{
 const el=e.target;
 if(el.matches('input[type=number],#water-dl,#garlic-tsp')){
  el.setCustomValidity('');errors.delete(el.id);dirtyFields.add(el.id);renderErrors();
 }else if(el.id==='user-notes'){
  if(!notesGroup){pushHistory();notesGroup=true;}
  state.userNotes=el.value.slice(0,MAX_NOTES);
  currentRecipe.userNotes=state.userNotes;
  $('recipe-user-notes-text').textContent=state.userNotes;
  $('recipe-user-notes').hidden=!state.userNotes.trim();
  $('notes-count').textContent=state.userNotes.length+' / '+MAX_NOTES;
  $('undo').disabled=false;
 }
});
$('controls').addEventListener('focusout',e=>{
 if(e.target.matches('input[type=number],#water-dl,#garlic-tsp')&&dirtyFields.has(e.target.id))flushPending();
 if(e.target.id==='user-notes')notesGroup=false;
});
$('controls').addEventListener('change',e=>{
 const el=e.target;
 if(el.matches('input[type=number],#water-dl,#garlic-tsp')){if(dirtyFields.has(el.id))flushPending();return;}
 if(el.tagName!=='SELECT')return;
 const value=el.value;
 if(!flushPending(true)){el.value=oldSelectValue(el);return;}
 if(el.id==='primary-id')handlePrimary(value);
 else if(el.id==='onion-id'){commit(s=>s.onion.id=value,'Sipulilaji vaihdettu.');preserveFocus('onion-id');}
 else if(el.id==='profile-id'){commit(s=>s.profile=value,'Maustelinja vaihdettu.');preserveFocus('profile-id');}
 else if(el.dataset.b){const uid=el.dataset.b;commit(s=>{const r=s.b.find(r=>r.uid===uid);r.ingredient=value;r.autoChoice=false;},'Täydentävä kasvis valittu.');preserveFocus(uid+'-id');}
});
$('controls').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input[type=number],#water-dl,#garlic-tsp')){e.preventDefault();if(flushPending(true))e.target.blur();}});
$('controls').addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn||!flushPending(true))return;
 if(btn.id==='add-b'){
  if(state.b.length>=3)return;
  const options=[...PRIMARY[state.primary.id].recommended,...Object.keys(VEG)];
  const id=options.find(id=>id!==state.primary.id&&!state.b.some(r=>r.ingredient===id));
  const uid='b'+state.nextId;
  commit(s=>{s.b.push({uid,ingredient:id,autoChoice:false,own:null});s.nextId++;},state.b.length===2?'Kolmannelle kasvikselle annettiin pieni lähtömäärä. Keittoerä voi kasvaa.':'Täydentävä kasvis lisätty. Ehdotukset mukautuvat.');preserveFocus(uid+'-id');
 }else if(btn.dataset.remove){const uid=btn.dataset.remove;commit(s=>s.b=s.b.filter(r=>r.uid!==uid),'Kasvis poistettu.');preserveFocus('add-b');}
 else if(btn.dataset.autoB){const uid=btn.dataset.autoB;commit(s=>s.b.find(r=>r.uid===uid).own=null,'Määräehdotus palautettu. Kasvisvalinta säilyy.');preserveFocus(uid+'-grams');}
 else if(btn.dataset.auto){const key=btn.dataset.auto;commit(s=>s[key].own=null,'Automaattinen määräehdotus palautettu.');preserveFocus(key==='water'?'water-dl':key==='garlic'?'garlic-tsp':key+'-grams');}
});
$('undo').addEventListener('click',()=>{
 if(history.length){state=history.pop();notesGroup=false;dirtyFields.clear();errors.clear();render();notify('Edellinen muutos kumottu.');}
});
$('reset').addEventListener('click',()=>{
 if(confirm('Palautetaanko oletusyhdistelmä? Nykyiset valinnat ja muistiinpanot korvataan. Muutoksen voi kumota.')){
  dirtyFields.clear();errors.clear();commit(s=>Object.assign(s,defaults()),'Oletusyhdistelmä palautettu.');render();notify('Oletusyhdistelmä palautettu.');
 }
});
async function copyRecipe(){
 if(!flushPending(true))return;
 const text=recipeText(currentRecipe);
 try{
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(text);notify('Ohje ja mahdolliset omat muistiinpanot kopioitu.');
 }catch(_){
  $('copy-text').value=text;
  if(typeof $('copy-dialog').showModal==='function')$('copy-dialog').showModal();else $('copy-dialog').setAttribute('open','');
  $('copy-text').focus();$('copy-text').select();
 }
}
document.addEventListener('click',e=>{
 const id=e.target.closest('button')?.id;
 if(id==='copy')copyRecipe();
 if(id==='print'&&flushPending(true))window.print();
});
$('select-text').addEventListener('click',()=>{$('copy-text').focus();$('copy-text').select();});
$('close-copy').addEventListener('click',()=>{
 if(typeof $('copy-dialog').close==='function')$('copy-dialog').close();else $('copy-dialog').removeAttribute('open');
 preserveFocus('copy');
});
function exportHtml(){
 // Self-contained export; serializes data, not user-authored HTML or executable text.
 const copy=document.documentElement.cloneNode(true);
 // Website navigation and indexing metadata do not belong to a personal file.
 copy.querySelectorAll('[data-soup-site-only],link[rel="canonical"],link[rel="sitemap"]').forEach(el=>el.remove());
 copy.classList.add('no-js');
 copy.querySelector('#initial-state').textContent=JSON.stringify(state).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 ['toast','live-status','invalid-status'].forEach(id=>copy.querySelector('#'+id).textContent='');
 copy.querySelectorAll('.field-error').forEach(el=>el.textContent='');
 copy.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 copy.querySelector('#copy-dialog').removeAttribute('open');copy.querySelector('#copy-text').textContent='';
 copy.querySelector('#user-notes').textContent=state.userNotes;
 copy.querySelector('#undo').setAttribute('disabled','');
 return '<!doctype html>\n'+copy.outerHTML;
}
$('save').addEventListener('click',()=>{
 if(!flushPending(true))return;
 const blob=new Blob([exportHtml()],{type:'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='kasvissosekeitto-v'+VERSION+'-valinnat.html';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
 notify('Tallennettava HTML sisältää valintasi ja omat muistiinpanosi.');
});
render();
if(initialWarning){$('invalid-status').textContent=initialWarning;notify(initialWarning);}
// Inspectable API for deterministic tests and later integration. No background tasks.
window.SoupModel=Object.freeze({...window.SoupCore,getState:()=>clone(state),getRecipe:()=>clone(currentRecipe),exportHtml,setState:input=>{
 const normalized=normalizeState(input);if(!normalized)throw new Error('Invalid recipe state');
 state=normalized;history=[];notesGroup=false;dirtyFields.clear();errors.clear();render();
}});
})();
