"""Publication rehearsal: enforce hash-only CSP via meta in an isolated browser.
Requires Playwright+Chromium; does NOT change any public website.
"""
from pathlib import Path
import importlib.util, json, html as pyhtml
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('soup_csp_hashes',str(ROOT/'csp_hashes.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
html=(ROOT/'index.html').read_text(encoding='utf8')
policy=module.build_policy(html)

# The sandbox may block loopback HTTP. A CSP meta tag still exercises the browser's
# script/style hash enforcement. Server-header directives are checked at deployment.
meta_policy=policy.replace("; frame-ancestors 'none'",'')
injected=html.replace('<head>','<head>\n<meta http-equiv="Content-Security-Policy" content="'+pyhtml.escape(meta_policy,quote=True)+'">',1)

checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(locale='fi-FI',viewport={'width':1280,'height':900},accept_downloads=True)
    page=context.new_page()
    errors=[];console_errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda msg:console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content(injected,wait_until='load')
    assert page.evaluate('typeof window.SoupModel')=='object'
    assert page.locator('#primary-id').is_visible()
    assert not errors and not console_errors,(errors,console_errors)
    checks.append('Standalone HTML loads under hash-only CSP meta policy without violations')
    page.keyboard.press('Tab')
    assert page.evaluate('document.activeElement.classList.contains("skip")')
    page.keyboard.press('Enter')
    assert page.evaluate('location.hash')=='#valmis-ohje'
    assert page.locator('#valmis-ohje').is_visible()
    checks.append('Skip link is keyboard reachable and jumps to the recipe')
    # Updated ingredient selection, then verify the generated content.
    page.locator('#primary-id').select_option('cauliflower')
    assert 'Kukkakaali' in page.locator('#valmis-ohje h2').inner_text()
    assert 'onnistui ilman perunaa' in page.locator('#controls').inner_text()
    checks.append('Dynamic model and revised cauliflower message work with CSP enabled')
    page.locator('#profile-id').select_option('smoky')
    recipe=page.evaluate('SoupModel.getRecipe()')
    assert recipe['seasonings'][-1]['amount'].startswith('oman maun mukaan')
    assert next(x['amount'] for x in recipe['seasonings'] if x['name']=='Mustapippuri, jauhettu')=='oman maun mukaan'
    assert not any(' g' in x['amount'] for x in recipe['seasonings'])
    assert not any('10–25 minuuttia' in x['text'] for x in recipe['steps'])
    assert any('yhteen kerrokseen' in x['text'] for x in recipe['steps'])
    checks.append('Published recipe content reflects qualitative seasonings and single-layer browning')
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('horizontal overflow',width)
    page.set_viewport_size({'width':1280,'height':900})
    page.evaluate("document.documentElement.style.fontSize='200%'")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow at doubled root font size'
    page.evaluate("document.documentElement.style.fontSize=''")
    checks.append('320–1280 px reflow and a basic 200% root-font-size check')
    page.locator('#user-notes').fill('<img src=x onerror=alert(1)> reseptini')
    assert not page.locator('#recipe-user-notes-text img').count()
    with page.expect_download() as down:
        page.locator('#save').click()
    dst=ROOT/'evidence'/'csp-save-roundtrip.html';dst.parent.mkdir(exist_ok=True)
    down.value.save_as(dst)
    saved=dst.read_text(encoding='utf8')
    restored=context.new_page();restored.set_content(saved,wait_until='load')
    assert restored.evaluate('SoupModel.getState().userNotes')=='<img src=x onerror=alert(1)> reseptini'
    assert restored.locator('#recipe-user-notes-text img').count()==0
    restored.close()
    checks.append('Saved recipe remains self-contained and treats text notes as text')
    assert not errors and not console_errors,(errors,console_errors)
    browser.close()

report={'passed':len(checks),'checks':checks,'csp_meta_tested':True,'browser':'Chromium headless','notes':'This enforces a local CSP meta policy with computed hashes, not actual HTTP response headers, wennström.fi settings or WCAG conformance.'}
(ROOT/'evidence'/'publication-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for c in checks:print('OK',c)
print(json.dumps({'passed':len(checks)},ensure_ascii=False))
