#!/usr/bin/env python3
"""Liga o Google AdSense no site.
Uso:  python tools/configurar_adsense.py ca-pub-1234567890123456 [--meio ID_DO_BLOCO] [--fim ID_DO_BLOCO]

- grava o ID em data/site.json (o site passa a mostrar o aviso de cookies e os anúncios);
- cria ads.txt na raiz;
- coloca <meta name="google-adsense-account"> no <head> de todas as páginas .html (usado na verificação do site).
Os IDs dos blocos (slots) são opcionais: sem eles valem os anúncios automáticos ligados no painel do AdSense.
Para desligar: python tools/configurar_adsense.py --desligar
"""
import argparse, glob, json, os, re, sys
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("cliente", nargs="?", help="ID do editor, ex.: ca-pub-1234567890123456")
ap.add_argument("--meio"); ap.add_argument("--fim"); ap.add_argument("--desligar", action="store_true")
a = ap.parse_args()
if not a.desligar and not (a.cliente and re.fullmatch(r"ca-pub-\d{8,20}", a.cliente)):
    sys.exit("Informe o ID no formato ca-pub-1234567890123456 (painel do AdSense > Conta > Informações da conta).")

cam = os.path.join(raiz, "data", "site.json")
d = json.load(open(cam, encoding="utf-8"))
ad = d.get("adsense") or {"cliente": "", "slots": {}}
ad["cliente"] = "" if a.desligar else a.cliente
ad.setdefault("slots", {})
if a.meio: ad["slots"]["meio"] = a.meio
if a.fim: ad["slots"]["fim"] = a.fim
d["adsense"] = ad
open(cam, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2))

meta_re = re.compile(r'\s*<meta name="google-adsense-account"[^>]*>')
for f in glob.glob(os.path.join(raiz, "*.html")):
    t = open(f, encoding="utf-8").read()
    t = meta_re.sub("", t)
    if not a.desligar:
        t = t.replace("</title>", '</title>\n<meta name="google-adsense-account" content="%s">' % a.cliente, 1)
    open(f, "w", encoding="utf-8", newline="").write(t)

ads = os.path.join(raiz, "ads.txt")
if a.desligar:
    if os.path.exists(ads): os.remove(ads)
else:
    open(ads, "w", encoding="utf-8").write("google.com, pub-%s, DIRECT, f08c47fec0942fa0\n" % a.cliente.split("-")[-1])
print("AdSense desligado." if a.desligar else "AdSense ligado: %s. Rode tools\\validar.py e publique." % a.cliente)
