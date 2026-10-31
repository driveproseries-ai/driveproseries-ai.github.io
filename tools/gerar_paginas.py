#!/usr/bin/env python3
"""Gera as páginas fixas das matérias (m/<id>.html), sitemap.xml, feed.xml e robots.txt.

Por que: o texto fica escrito no HTML (bom para Google e AdSense), sem depender de JavaScript.
Uso: python tools/gerar_paginas.py   (o publicar.bat já chama este script)
"""
import html, json, os, re, sys
from datetime import datetime, timezone, timedelta

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://driveproseries-ai.github.io"


def ler(nome, padrao):
    try:
        with open(os.path.join(raiz, "data", nome + ".json"), encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception:
        return padrao


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def data_br(d):
    try:
        a, m, dia = d.split("-")
        return f"{dia}/{m}/{a}"
    except Exception:
        return d or ""


def escrever(caminho, texto):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)


site = ler("site", {})
camps = {c["id"]: c for c in ler("campeonatos", [])}
noticias = sorted(ler("noticias", []), key=lambda n: n.get("data", ""), reverse=True)
f1 = sorted(ler("f1", []), key=lambda n: n.get("data", ""), reverse=True)
ads = (site.get("adsense") or {}).get("cliente", "")
nome_site = site.get("nome", "Portal DPS")

# apaga páginas de matérias que não existem mais
pasta = os.path.join(raiz, "m")
ids = {n["id"] for n in noticias if n.get("id")}
if os.path.isdir(pasta):
    for f in os.listdir(pasta):
        if f.endswith(".html") and f[:-5] not in ids:
            os.remove(os.path.join(pasta, f))

FONTES = ("https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&amp;family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700;1,800"
          "&amp;family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&amp;display=swap")


def pagina(n):
    cor = camps.get(n.get("campeonato"), {}).get("cor", "#10231c")
    camp = camps.get(n.get("campeonato"), {}).get("curto", "DPS")
    selo = camp + (" · Expectativa" if n.get("tipo") == "expectativa" else "")
    url = f"{BASE}/m/{n['id']}.html"
    desc = n.get("linha_fina") or (n.get("corpo") or [""])[0][:160]
    titulo = f"{n['titulo']} · {nome_site}"
    corpo = "".join(f"<p>{esc(p)}</p>" for p in n.get("corpo", []))
    res = ""
    if n.get("resultado"):
        linhas = "".join(
            f'<tr><td class="p">{esc(r.get("pos"))}</td><td>{esc(r.get("piloto"))}</td><td>{esc(r.get("equipe", ""))}</td></tr>'
            for r in n["resultado"])
        res = ('<div class="res"><h3>Resultado</h3><div class="rolagem"><table style="min-width:0"><thead><tr>'
               f"<th>Pos</th><th>Piloto</th><th>Equipe</th></tr></thead><tbody>{linhas}</tbody></table></div></div>")
    ld = {
        "@context": "https://schema.org", "@type": "NewsArticle",
        "headline": n["titulo"], "description": desc, "datePublished": n.get("data"),
        "author": {"@type": "Organization", "name": n.get("autor", "Redação DPS")},
        "publisher": {"@type": "Organization", "name": nome_site},
        "mainEntityOfPage": url, "inLanguage": "pt-BR",
    }
    wa = "https://wa.me/?text=" + html.escape(
        __import__("urllib.parse").parse.quote(n["titulo"] + " " + url), quote=True)
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>{esc(titulo)}</title>
{f'<meta name="google-adsense-account" content="{esc(ads)}">' if ads else ''}
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(url)}">
<meta property="og:title" content="{esc(n['titulo'])}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{esc(url)}">
<meta property="og:locale" content="pt_BR">
<meta name="theme-color" content="#10231c">
<link rel="alternate" type="application/rss+xml" title="{esc(nome_site)}" href="feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTES}" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body data-page="materia-fixa">
<a class="skip" href="#app">Ir para o conteúdo</a>
<div id="topo"></div>
<main id="app"><div class="wrap"><article class="materia" style="--camp:{cor};--c:{cor}"><span class="selo">{esc(selo)}</span> <span class="meta">{data_br(n.get('data'))} · {esc(n.get('autor', 'Redação DPS'))}</span><h1>{esc(n['titulo'])}</h1><p class="fina">{esc(n.get('linha_fina', ''))}</p><div class="corpo">{corpo}</div>{res}<div class="compart"><a class="botao" href="{wa}" rel="noopener">Compartilhar no WhatsApp</a><a class="botao claro" href="jornal.html">Mais matérias</a></div></article></div></main>
<div id="rodape"></div>
<script src="js/app.js" defer></script>
</body>
</html>
"""


for n in noticias:
    if n.get("id"):
        escrever(os.path.join(raiz, "m", n["id"] + ".html"), pagina(n))

# ---------- sitemap ----------
fixas = ["index.html", "jornal.html", "tabelas.html", "calendario.html", "lastro.html", "regulamento.html",
         "inscricoes.html", "contato.html", "f1.html", "estatisticas.html", "halldafama.html",
         "incidentes.html", "sorteio.html", "videos.html", "avisos.html", "loja.html", "sobre.html", "privacidade.html"]
urls = []
for p in fixas:
    if os.path.exists(os.path.join(raiz, p)):
        urls.append((f"{BASE}/" if p == "index.html" else f"{BASE}/{p}", None))
for n in noticias:
    urls.append((f"{BASE}/m/{n['id']}.html", n.get("data")))
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u, d in urls:
    sm.append(f"<url><loc>{esc(u)}</loc>" + (f"<lastmod>{esc(d)}</lastmod>" if d else "") + "</url>")
sm.append("</urlset>")
escrever(os.path.join(raiz, "sitemap.xml"), "\n".join(sm) + "\n")
escrever(os.path.join(raiz, "robots.txt"), f"User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n")

# ---------- feed RSS (matérias da liga + F1 real) ----------
BR = timezone(timedelta(hours=-3))


def rfc822(d):
    try:
        return datetime.strptime(d, "%Y-%m-%d").replace(hour=12, tzinfo=BR).strftime("%a, %d %b %Y %H:%M:%S %z")
    except Exception:
        return ""


itens = []
for n in noticias[:30]:
    link = f"{BASE}/m/{n['id']}.html"
    itens.append(f"<item><title>{esc(n['titulo'])}</title><link>{esc(link)}</link><guid isPermaLink=\"true\">{esc(link)}</guid>"
                 f"<pubDate>{rfc822(n.get('data'))}</pubDate><description>{esc(n.get('linha_fina', ''))}</description></item>")
feed = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
        f"<title>{esc(nome_site)}</title><link>{BASE}/</link><language>pt-BR</language>"
        f"<description>{esc(site.get('descricao', ''))}</description>" + "".join(itens) + "</channel></rss>\n")
escrever(os.path.join(raiz, "feed.xml"), feed)

print(f"Páginas fixas: {len(noticias)} · sitemap: {len(urls)} endereços · feed.xml ok")
