#!/usr/bin/env python3
"""Converte os arquivos data/hist/<comp>.txt (lidos do FGC, formato compacto) em data/historico.csv.

Uso: python tools/converter_hist.py            (usa a lista COMPS abaixo)
Formato de cada linha do .txt:  pista;AAAA-MM-DD;piloto_do_dia;volta_rapida;pole;COD@grid,COD@grid,...
  (ordem de chegada; prefixo x = DNF, d = DSQ, s = DNS; codigos definidos em codes_<comp>.txt)
"""
import csv, os, sys
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "hist")
# (arquivo, temporada, campeonato)
COMPS = [("mundial2024", 2024, "mundial"), ("mundial2025", 2025, "mundial"), ("elite2025", 2025, "elite"),
         ("mundial2026", 2026, "mundial"), ("elite2026", 2026, "elite")]
COMPS += [tuple(a.split(":")[:1]) + (int(a.split(":")[1]), a.split(":")[2]) for a in sys.argv[1:]]
PISTAS = {"Australia":"Austrália","China":"China","Japan":"Japão","Bahrain":"Bahrein","Saudi Arabia":"Arábia Saudita","Miami":"Miami",
 "Emilia Romagna":"Emília-Romanha","Monaco":"Mônaco","Canada":"Canadá","Spain":"Espanha","Austria":"Áustria","Great Britain":"Grã-Bretanha",
 "Hungary":"Hungria","Belgium":"Bélgica","Netherlands":"Holanda","Italy":"Itália","Azerbaijan":"Azerbaijão","Singapore":"Singapura",
 "USA":"Estados Unidos","Mexico":"México","Brazil":"Brasil","Las Vegas":"Las Vegas","Qatar":"Catar","Abu Dhabi":"Abu Dhabi","Madrid":"Madrid",
 "Portugal":"Portugal","France":"França","Singapura":"Singapura"}
def main():
    rows = []
    for arq, temp, camp in COMPS:
        codes = dict(x.split("=", 1) for x in open(os.path.join(BASE, f"codes_{arq}.txt"), encoding="utf-8").read().strip().split(";"))
        for et, l in enumerate(open(os.path.join(BASE, f"{arq}.txt"), encoding="utf-8").read().strip().split("\n"), 1):
            p = l.split(";"); pista, data, dotd, vr, pole, res = p[0], p[1], p[2], p[3], p[4], p[5]
            pos = 0
            for item in res.split(","):
                cod, grid = item.split("@")
                st = ""
                if cod[0] in "xds" and cod not in codes and cod[1:] in codes: st, cod = cod[0], cod[1:]
                nome = codes[cod]
                if nome == "AI-Driver": continue
                if st == "": pos += 1
                rows.append(dict(temporada=temp, campeonato=camp, etapa=et, pista=PISTAS.get(pista, pista), data=data,
                    pos=(pos if st == "" else ""), piloto=nome, grid=grid,
                    volta_rapida=1 if vr == cod else "", pole=1 if pole == cod else "", dotd=1 if dotd == cod else "", status={"":"","x":"DNF","d":"DSQ","s":"DNS"}[st], tipo="corrida"))
    out = os.path.join(BASE, "..", "historico.csv")
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";"); w.writeheader(); w.writerows(rows)
    print(out, len(rows), "linhas")
if __name__ == "__main__": main()
