#!/usr/bin/env python3
"""Calculate CSP hashes for self-contained index.html's executable inline assets.

Hashes change with each build. The deployment's effective policy may require other
sources and directives for the rest of the website; this is NOT a complete site CSP.
"""
from pathlib import Path
import base64, hashlib, re

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'index.html'

def extract_hashes(html):
    parts=[]
    for tag, ident, kind in [('style','soup-style','style'),('script','soup-model','script'),('script','soup-app','script')]:
        regex=rf'<{tag}\b[^>]*\bid="{ident}"[^>]*>(.*?)</{tag}>'
        matches=re.findall(regex,html,re.S|re.I)
        if len(matches)!=1:raise ValueError(f'Expected one {ident}, found {len(matches)}')
        text=matches[0]
        digest=base64.b64encode(hashlib.sha256(text.encode('utf-8')).digest()).decode('ascii')
        parts.append((ident,kind,"'sha256-"+digest+"'"))
    return parts

def build_policy(html):
    h=extract_hashes(html)
    script=" ".join(x[2] for x in h if x[1]=='script')
    style=" ".join(x[2] for x in h if x[1]=='style')
    return ("default-src 'self'; script-src 'self' "+script+"; style-src 'self' "+style+
            "; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")

if __name__=='__main__':
    html=HTML.read_text(encoding='utf-8')
    print('Version: '+re.search(r'<title>(.*?)</title>',html,re.S).group(1))
    for name,kind,value in extract_hashes(html):print(name+': '+value)
    print('\nExample application-only CSP (adapt to whole website):\n'+build_policy(html))
