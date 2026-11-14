"""Browser regression tests. Requires Playwright + Chromium; no external HTTP services."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'evidence').mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text()
results=[]

def record(name):
    results.append(name); print('OK',name,flush=True)
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')
    browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='fi-FI',accept_downloads=True)
    page=ctx.new_page(); errors=[];requests=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.on('request',lambda r:requests.append(r.url))
    page.set_content(html,wait_until='load');page.wait_for_function('!!window.SoupModel');page.set_default_timeout(5000)
    assert not errors,errors
    assert page.locator('#primary-grams').input_value()=='550'
    assert page.locator('#water-dl').input_value()=='7'
    assert page.locator('#controls h2').count()==7
    record('Standalone HTML content loads default recipe without runtime errors')
    assert requests==[],requests
    assert 'document.cookie' not in (ROOT/'src/app.js').read_text()
    assert 'localStorage' not in (ROOT/'src/app.js').read_text()
    record('No network requests observed; no cookie or localStorage use in app source')
    ctx.set_offline(True)
    def reset(): page.evaluate('SoupModel.setState(SoupModel.defaults())')
    def amount(selector,text):
        page.locator(selector).fill(text);page.locator(selector).press('Enter')
    def state(): return page.evaluate('SoupModel.getState()')
    def recipe(): return page.evaluate('SoupModel.getRecipe()')
    amount('#b1-grams','250');amount('#water-dl','7,5')
    page.locator('#primary-id').select_option('cauliflower')
    amount('#primary-grams','800')
    assert state()['b'][0]['ingredient']=='swede' and state()['b'][0]['own']==250
    assert state()['water']['own']==750 and recipe()['water']==750
    assert '7,5 dl' in page.locator('#valmis-ohje').inner_text()
    record('Own B amount and Finnish-comma water survive primary changes offline')
    page.locator('[data-auto="water"]').click()
    assert state()['water']['own'] is None
    assert recipe()['water']==page.evaluate('SoupCore.derive(SoupModel.getState()).suggested.water')
    record('Water returns to automatic estimate explicitly')
    reset();amount('#water-dl','8.2')
    assert state()['water']['own']==820
    page.locator('#profile-id').select_option('smoky')
    assert state()['water']['own']==820
    assert 'Savupaprika, mieto' in page.locator('#valmis-ohje').inner_text()
    assert 'Herbes de Provence' not in page.locator('#valmis-ohje').inner_text()
    page.locator('#profile-id').select_option('mustard')
    assert 'Kuivattu meirami' in page.locator('#valmis-ohje').inner_text()
    assert 'Savupaprika, mieto' not in page.locator('#valmis-ohje').inner_text()
    assert 'ennen muuta happoa' in page.locator('#valmis-ohje').inner_text()
    record('All three profiles update ingredients and cooking instructions')
    reset()
    amount('#garlic-tsp','2,75')
    assert state()['garlic']['own']==2.75
    assert '2 ¾ tl' in page.locator('#valmis-ohje').inner_text()
    page.locator('#primary-id').select_option('cauliflower')
    amount('#primary-grams','900')
    assert state()['garlic']['own']==2.75
    assert page.locator('#garlic-tsp').input_value()=='2,75'
    record('Own garlic teaspoons accept Finnish decimals and survive recipe changes')
    amount('#garlic-tsp','-1')
    assert page.locator('#garlic-tsp').get_attribute('aria-invalid')=='true'
    assert state()['garlic']['own']==2.75
    amount('#garlic-tsp','0.25')
    assert state()['garlic']['own']==.25
    page.locator('[data-auto="garlic"]').click()
    assert state()['garlic']['own'] is None
    assert page.evaluate('document.activeElement.id')=='garlic-tsp'
    record('Garlic validates invalid values, accepts decimal point, restores suggestion and focus')
    reset()
    for profile in ['provencal','smoky','mustard']:
        page.locator('#profile-id').select_option(profile)
        r=recipe()
        assert all(' g' not in i['amount'] for i in r['seasonings'])
        assert next(i['amount'] for i in r['seasonings'] if i['name']=='Suola').startswith('oman maun mukaan')
        assert next(i['amount'] for i in r['seasonings'] if i['name']=='Mustapippuri, jauhettu')=='oman maun mukaan'
        assert 'tl' in next(i['amount'] for i in r['ingredients'] if 'murska' in i['name'])
        assert 'tl = 5 ml' in page.locator('#valmis-ohje').inner_text()
        assert sum(st['text'].count('aloitusvesi (') for st in r['steps'])==1
    record('All profiles show qualitative salt and pepper; other spices as volumes and water exactly once')
    amount('#garlic-tsp','3,75')
    note='Ensi kerralla timjamia.\n</script><script>window.__XSS_HIT=1</script><img src=x onerror="window.__XSS_HIT=2"> & ääkköset 🥕'
    before=recipe()['steps'];page.locator('#user-notes').fill(note)
    assert state()['userNotes']==note
    assert page.locator('#recipe-user-notes-text').inner_text()==note
    assert recipe()['steps']==before
    assert page.evaluate('window.__XSS_HIT === undefined')
    assert page.locator('#recipe-user-notes-text img').count()==0
    record('Notes remain plain text, have no recipe effect, and do not execute HTML')
    page.locator('#undo').click()
    assert state()['userNotes']==''
    assert page.locator('#recipe-user-notes').is_hidden()
    record('Note edit is one undo step')
    page.locator('#user-notes').fill(note)
    # Save without explicitly blurring the notes first: latest edit must be included.
    expected=state()
    with page.expect_download() as dl:
        page.locator('#save').click()
    download=dl.value
    saved=ROOT/'evidence/roundtrip.html'
    download.save_as(saved)
    restored=ctx.new_page();restored.on('pageerror',lambda err:errors.append(str(err)))
    restored.set_content(saved.read_text(),wait_until='load')
    assert restored.evaluate('SoupModel.getState()')==expected
    assert restored.evaluate('window.__XSS_HIT === undefined')
    assert restored.locator('#user-notes').input_value()==note
    assert restored.locator('#undo').is_disabled()
    assert '\\u003c/script' in saved.read_text()
    record('Downloaded standalone HTML restores selections, water, profile and hostile-text notes')
    restored.close()
    # Exercise real fallback by making clipboard unavailable.
    page.evaluate("Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true})")
    page.locator('#copy').click()
    assert page.locator('#copy-dialog').is_visible()
    assert page.locator('#copy-text').input_value()==page.evaluate('SoupModel.recipeText(SoupModel.getRecipe())')
    page.locator('#close-copy').click()
    assert page.evaluate('document.activeElement.id')=='copy'
    record('Clipboard fallback matches the complete current recipe and notes')
    page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copied=t}},configurable:true})")
    page.locator('#copy').click()
    assert page.evaluate('window.__copied')==page.evaluate('SoupModel.recipeText(SoupModel.getRecipe())')
    record('Clipboard success path receives the same recipe text (mocked clipboard API)')
    reset()
    amount('#potato-grams','0');amount('#garlic-tsp','0');amount('#onion-grams','0')
    text=' '.join(st['text'] for st in recipe()['steps']).lower()
    assert 'peruna' not in text and 'valkosipuli' not in text and 'sipuli' not in text
    record('Zero quantities remove ingredients and corresponding steps')
    reset();page.locator('#primary-id').select_option('cauliflower')
    page.locator('[data-remove="b1"]').click();amount('#potato-grams','0');amount('#onion-grams','0');amount('#garlic-tsp','0')
    text=' '.join(st['text'] for st in recipe()['steps'])
    assert 'Lisää kukkakaali nyt.' in text
    assert not any('Rakenna paahteinen' in st['title'] for st in recipe()['steps'])
    record('Cauliflower-only preparation uses the correct early-addition path')
    reset();page.locator('#add-b').click()
    assert page.evaluate('SoupCore.derive(SoupModel.getState()).bTotal')==250
    amount('#b1-grams','400')
    assert state()['b'][0]['own']==400
    assert page.evaluate('SoupCore.derive(SoupModel.getState()).b.amounts.b2')==0
    record('B-budget sharing respects a fixed quantity larger than the suggested budget')
    reset()
    page.evaluate("""() => {
      const s=SoupModel.defaults();s.primary={id:'cauliflower',grams:900};
      s.b=[{uid:'b1',ingredient:'carrot',autoChoice:false,own:250},{uid:'b2',ingredient:'celeriac',autoChoice:false,own:100}];
      s.nextId=3;s.potato.own=0;s.profile='smoky';SoupModel.setState(s);
    }""")
    beforeB=state()['b'][:]
    page.locator('#add-b').click()
    assert len(state()['b'])==3
    b3=state()['b'][2]['uid']
    assert page.evaluate('SoupCore.derive(SoupModel.getState()).b.amounts[SoupModel.getState().b[2].uid]')==100
    assert state()['b'][0]['own']==250 and state()['b'][1]['own']==100
    assert 'ylittää' in page.locator('#notices').inner_text().lower()
    assert '100' in page.locator('#'+b3+'-grams').input_value()
    assert recipe()['total']>=1575
    # The new amounts, including the third B suggestion, carry into the printed recipe.
    page.evaluate('() => {window.__printed=0;window.print=()=>window.__printed++}')
    page.locator('#print').click();assert page.evaluate('window.__printed')==1
    record('Third B suggestion is nonzero above the budget; earlier own quantities persist; print works')
    seasoningsBefore=recipe()['seasonings']
    amount('#water-dl','12,0')
    assert recipe()['seasonings']==seasoningsBefore
    assert 'maustemitta' not in page.locator('#valmis-ohje').inner_text().lower()
    assert 'Sopivaa keittoa ei tarvitse' not in page.locator('#valmis-ohje').inner_text()
    assert 'pohjassa on ruskeita paistojäämiä' in page.locator('#valmis-ohje').inner_text()
    assert '0,6 %' not in page.locator('#valmis-ohje').inner_text()
    assert 'yhteen kerrokseen' in page.locator('#valmis-ohje').inner_text()
    assert '10–25 minuuttia' not in page.locator('#valmis-ohje').inner_text()
    record('Changing water leaves qualitative seasoning unchanged; optional brown residue and no old phrase')
    reset()
    reset();last=recipe()['water'];page.locator('#water-dl').fill('0');page.locator('#water-dl').press('Tab')
    assert page.locator('#water-dl').get_attribute('aria-invalid')=='true'
    assert recipe()['water']==last
    assert page.locator('#invalid-status').inner_text()
    page.locator('#save').click()
    assert page.evaluate('document.activeElement.id')=='water-dl'
    page.locator('#profile-id').select_option('smoky')
    assert state()['profile']=='provencal'
    assert page.locator('#profile-id').input_value()=='provencal'
    amount('#water-dl','7,5')
    assert not page.locator('#invalid-status').inner_text()
    record('Invalid water cannot silently update, export or contaminate a profile change')
    amount('#primary-grams','-20')
    assert state()['primary']['grams']==550
    amount('#primary-grams','600')
    assert state()['primary']['grams']==600
    record('Invalid vegetable amount is rejected and can be corrected')
    reset();page.locator('#primary-grams').fill('650');page.locator('#primary-grams').press('Tab')
    assert state()['primary']['grams']==650
    assert page.evaluate('document.activeElement.id')=='b1-id'
    record('Editing with Tab preserves keyboard navigation')
    page.locator('#user-notes').fill('Muistetaan timjami.')
    page.on('dialog',lambda d:d.accept())
    page.locator('#reset').click();assert state()==page.evaluate('SoupModel.defaults()')
    page.locator('#undo').click();assert state()['userNotes']=='Muistetaan timjami.'
    record('Reset clears notes and can be undone')
    amount('#water-dl','0')
    page.locator('#reset').click()
    assert page.locator('#water-dl').evaluate('el=>el.validity.valid')
    assert page.locator('#water-dl').get_attribute('aria-invalid') is None
    record('Reset clears both error text and native custom validity after invalid input')
    page.locator('#user-notes').fill('Muistetaan timjami.')

    # Real print styling and button action; no PDF produced.
    page.evaluate('() => { window.__prints=0;window.print=()=>{window.__prints++}; }')
    page.locator('#print').click();assert page.evaluate('window.__prints')==1
    page.emulate_media(media='print')
    assert page.locator('#controls').is_hidden()
    assert page.locator('#valmis-ohje').is_visible()
    assert page.locator('#recipe-user-notes-text').is_visible()
    page.screenshot(path=str(ROOT/'evidence/print-layout.png'),full_page=True)
    page.emulate_media(media='screen')
    record('Print action and print CSS retain the recipe and notes, hide selection UI')
    reset()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    page.set_viewport_size({'width':320,'height':900})
    amount('#water-dl','500')
    page.locator('#user-notes').fill('x'*1999)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'long text at 320'
    record('No horizontal overflow at 320/390/768/1440 px or with long notes and water value')
    ids=page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
    assert len(ids)==len(set(ids))
    assert page.locator('main').count()==1
    assert page.evaluate('Array.from(document.querySelectorAll("input,select,textarea")).every(el => el.labels.length>0 || el.getAttribute("aria-label"))')
    record('One main landmark, unique IDs, accessible names for all input controls')
    page.evaluate("""() => {
      const s=SoupModel.defaults();s.primary={id:'cauliflower',grams:900};
      s.b=[{uid:'b1',ingredient:'carrot',autoChoice:false,own:250},{uid:'b2',ingredient:'celeriac',autoChoice:false,own:100}];
      s.nextId=3;s.potato.own=0;s.profile='smoky';SoupModel.setState(s);
    }""")
    assert recipe()['total']==1475 and recipe()['water']==750
    assert 'kiehumisen palaamisesta' in page.locator('#valmis-ohje').inner_text()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('user recipe',width)
    page.evaluate("document.getElementById('toast').textContent=''")
    page.locator('#valmis-ohje').screenshot(path=str(ROOT/'evidence/user-recipe.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("document.getElementById('toast').textContent=''")
    page.locator('#valmis-ohje').screenshot(path=str(ROOT/'evidence/user-recipe-mobile.png'))
    (ROOT/'evidence/user-recipe.txt').write_text(page.evaluate('SoupModel.recipeText(SoupModel.getRecipe())'),encoding='utf-8')
    record('User cauliflower recipe renders corrected instructions at desktop and mobile sizes')
    reset()
    page.locator('#primary-id').select_option('sweetpotato')
    assert state()['primary']['id']=='sweetpotato'
    assert state()['b'][0]['ingredient']=='cauliflower'
    assert page.evaluate('SoupCore.derive(SoupModel.getState()).potato')==0
    assert 'Bataatti' in page.locator('#valmis-ohje').inner_text()
    assert 'Laakerinlehti (valinnainen)' in page.locator('#valmis-ohje').inner_text()
    assert 'Poista mahdolliset laakerinlehdet.' in page.locator('#valmis-ohje').inner_text()
    assert 'Tarkista kukkakaalin ja bataatin kypsyys' in ' '.join(x['text'] for x in recipe()['steps'])
    record('Sweet potato primary suggests cauliflower, no extra potato and correct cooking timing')
    reset()
    page.locator('#b1-id').select_option('sweetpotato')
    amount('#b1-grams','250')
    amount('#potato-grams','0')
    r=recipe()
    assert state()['b'][0]['ingredient']=='sweetpotato'
    assert any(i['name']=='Bataatti' and i['amount']=='250 g' for i in r['ingredients'])
    assert any('Lisää bataatti myöhemmin'==x['title'] for x in r['steps'])
    assert 'Lisää bataatti. Laita kansi takaisin ja' in ' '.join(x['text'] for x in r['steps'])
    page.locator('#primary-id').select_option('cauliflower')
    assert state()['b'][0]['own']==250
    assert state()['b'][0]['ingredient']=='sweetpotato'
    record('Sweet potato B quantity survives changing primary; adaptive stage updates')
    page.locator('#primary-id').select_option('sweetpotato')
    with page.expect_download() as dl:
        page.locator('#save').click()
    restored_file=ROOT/'evidence/sweet-potato-roundtrip.html';dl.value.save_as(restored_file)
    rpage=ctx.new_page();rpage.set_content(restored_file.read_text(),wait_until='load')
    assert rpage.evaluate('SoupModel.getState()')==state()
    assert 'Bataatti' in rpage.locator('#valmis-ohje').inner_text()
    rpage.close()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('sweet potato',width)
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#valmis-ohje').screenshot(path=str(ROOT/'evidence/sweet-potato-mobile.png'))
    record('Sweet potato state saves and restores offline; responsive at 320–1440 px')
    reset()
    ctx.set_offline(False)
    nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    np=nojs.new_page();np.set_content(html,wait_until='load')
    assert np.locator('#valmis-ohje h2').inner_text()=='Porkkana ja lanttu · sosekeitto'
    assert np.locator('#valmis-ohje .steps li').count()==6
    assert np.locator('#save').is_disabled()
    record('Without JavaScript the generated default recipe remains readable')
    nojs.close()
    assert not errors,errors
    reset();page.set_viewport_size({'width':1440,'height':1000})
    page.screenshot(path=str(ROOT/'evidence/desktop-final.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(ROOT/'evidence/mobile-final.png'),full_page=True)
    browser_version=browser.version
    browser.close()
report={'passed':len(results),'checks':results,'runtime_errors':errors,'tested_browser':browser_version,'notes':'Standalone and downloaded HTML content tested offline with Playwright set_content. Actual hosting and browser print pagination not tested. Firefox/Safari not tested.'}
(ROOT/'evidence/browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
