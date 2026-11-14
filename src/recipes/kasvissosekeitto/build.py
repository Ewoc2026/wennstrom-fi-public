#!/usr/bin/env python3
"""Build one offline-capable HTML file. Python 3 + Node; no third-party packages."""
from pathlib import Path
import html, json, subprocess
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'src'

def static_recipe(recipe):
    esc=html.escape
    def listing(items):
        return '<ul class="ingredient-list">'+''.join('<li><span>'+esc(i['name'])+'</span><span class="qty">'+esc(i['amount'])+'</span></li>' for i in items)+'</ul>'
    return ('<span class="eyebrow">Oletusyhdistelmä / 0.3.4</span><h2>'+esc(recipe['title'])+'</h2><p>'+esc(recipe['profileName'])+'</p>'
       +'<h3>Ainekset</h3>'+listing(recipe['ingredients'])+'<div class="seasoning"><h3>Maustamisen lähtöehdotus</h3>'+listing(recipe['seasonings'])+'<p class="small seasoning-note">'+esc(recipe['measureNote'])+'</p></div>'
       +'<h3>Valmistus</h3><ol class="steps">'+''.join('<li><div><h4>'+esc(s['title'])+'</h4><p>'+esc(s['text'])+'</p></div></li>' for s in recipe['steps'])+'</ol>'
       +'<p class="fineprint">'+esc(recipe['ingredientNote'])+'</p><p class="fineprint">'+esc(recipe['provenance'])+'</p>')

page=(SRC/'page.html').read_text(encoding='utf-8')
code="const m=require(process.argv[1]); console.log(JSON.stringify(m.buildRecipe(m.defaults())));"
recipe=json.loads(subprocess.check_output(['node','-e',code,str(SRC/'model.js')],text=True))
for marker,name in [('/*__SOUP_CSS__*/','style.css'),('/*__SOUP_MODEL__*/','model.js'),('/*__SOUP_APP__*/','app.js')]:
    data=(SRC/name).read_text(encoding='utf-8')
    if name.endswith('.js') and '</script' in data.lower():
        raise ValueError(f'{name} contains an unsafe inline-script closing tag')
    page=page.replace(marker,data)
page=page.replace('<!--__STATIC_RECIPE__-->',static_recipe(recipe))
(ROOT/'index.html').write_text(page,encoding='utf-8')
print(ROOT/'index.html')
