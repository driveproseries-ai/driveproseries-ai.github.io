#!/usr/bin/env python3
"""Confere os JSON do site antes de publicar. Uso: python tools/validar.py"""
import json, os, sys
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
erros = []
def ler(n):
    try:
        with open(os.path.join(raiz, "data", n + ".json"), encoding="utf-8") as f: return json.load(f)
    except Exception as e:
        erros.append(f"{n}.json: {e}"); return None
camps = ler("campeonatos") or []
for c in camps:
    d = ler(c["id"])
    if not d: continue
    for p in d.get("pilotos", []):
        for k in ("nome", "pts", "pun"):
            if k not in p: erros.append(f'{c["id"]}: piloto sem "{k}": {p}')
        if p.get("pun", 0) > 0: erros.append(f'{c["id"]}: punição deve ser negativa ou zero ({p["nome"]})')
    for e in d.get("calendario", []):
        if e.get("status") not in ("realizada", "proxima", "futura"): erros.append(f'{c["id"]}: status inválido em {e.get("pista")}')
ids = set()
for n in ler("noticias") or []:
    for k in ("id", "titulo", "data", "corpo"):
        if k not in n: erros.append(f'noticias: item sem "{k}": {n.get("titulo")}')
    if n.get("id") in ids: erros.append(f'noticias: id repetido {n.get("id")}')
    ids.add(n.get("id"))
for n in ler("f1") or []:
    for k in ("titulo", "resumo", "fonte", "url", "data"):
        if not n.get(k): erros.append(f'f1: item sem "{k}": {n.get("titulo")}')
for n in ler("videos") or []:
    for k in ("id", "titulo", "data", "campeonato"):
        if not n.get(k): erros.append(f'videos: item sem "{k}": {n.get("id")}')
for n in ler("noticias") or []:
    if not os.path.exists(os.path.join(raiz, "m", str(n.get("id")) + ".html")): erros.append(f'noticias: falta a pagina fixa de {n.get("id")} (rode tools/gerar_paginas.py)')
site = ler("site"); ler("stats")
import re as _re
cli = ((site or {}).get("adsense") or {}).get("cliente", "")
if cli and not _re.fullmatch(r"ca-pub-\d{8,20}", cli): erros.append(f"site.json: adsense.cliente inválido ({cli})")
print("\n".join(erros) if erros else "Tudo certo.")
sys.exit(1 if erros else 0)
