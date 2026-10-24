#!/usr/bin/env python3
"""Gera data/stats.json a partir do histórico de resultados.

Uso:  python tools/gerar_stats.py data/historico.csv [data/titulos.csv] [-o data/stats.json]

historico.csv (separador ';', UTF-8, uma linha por piloto por corrida):
  temporada;campeonato;etapa;pista;pos;piloto;grid;volta_rapida;pole;tipo
  - pos: posição final (número). Quem não terminou: deixe vazio ou 0 (conta como corrida, sem pódio).
  - volta_rapida e pole: 1 ou vazio.
  - tipo: corrida (padrão) ou sprint. Sprints não entram nas estatísticas.
titulos.csv (opcional): temporada;campeonato;piloto
"""
import csv, json, sys, datetime, collections

def ler(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

def num(v):
    try: return int(str(v).strip())
    except Exception: return 0

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-o")]
    out = "data/stats.json"
    if "-o" in sys.argv: out = sys.argv[sys.argv.index("-o") + 1]; args = [a for a in args if a != out]
    if not args: print(__doc__); sys.exit(1)
    rows = [r for r in ler(args[0]) if (r.get("tipo") or "corrida").strip().lower() == "corrida"]
    LAB = {"mundial": "Mundial", "elite": "Elite", "carreira1": "Modo Carreira 1", "carreira2": "Modo Carreira 2"}
    def agg(rs):
        pil = collections.defaultdict(lambda: collections.Counter())
        pistas = {}
        for r in rs:
            nome = r["piloto"].strip(); p = pil[nome]; pos = num(r.get("pos"))
            p["corridas"] += 1
            if pos == 1: p["vitorias"] += 1
            if 1 <= pos <= 3: p["podios"] += 1
            if num(r.get("pole")): p["poles"] += 1
            if num(r.get("volta_rapida")): p["voltas_rapidas"] += 1
            pista = r["pista"].strip()
            d = pistas.setdefault(pista, {"eventos": set(), "venc": collections.Counter()})
            d["eventos"].add((r["temporada"], r["campeonato"], r["etapa"]))
            if pos == 1: d["venc"][nome] += 1
        return pil, pistas
    titulos = ler(args[1]) if len(args) > 1 else []
    def montar(rs, tit):
        pil, pistas = agg(rs)
        for t in tit: pil[t["piloto"].strip()]["titulos"] += 1
        return {
            "pilotos": [dict(nome=n, **{k: c.get(k, 0) for k in ("corridas", "vitorias", "podios", "poles", "voltas_rapidas", "titulos")}) for n, c in pil.items()],
            "pistas": [{"pista": k, "corridas": len(v["eventos"]), "vencedores": [{"piloto": n, "vitorias": q} for n, q in v["venc"].most_common()]} for k, v in pistas.items()],
        }
    saida = {"pronto": True, "gerado_em": datetime.date.today().isoformat()}
    saida.update(montar(rows, titulos))
    rec = {}
    chaves = sorted({(r["temporada"], r["campeonato"]) for r in rows})
    for t, c in chaves:
        rec[f"{c}-{t}"] = {"rotulo": f"{LAB.get(c, c)} {t}", **montar([r for r in rows if r["temporada"] == t and r["campeonato"] == c], [x for x in titulos if x["temporada"] == t and x["campeonato"] == c])}
    saida["recortes"] = rec
    saida["campeoes"] = [{"temporada": t["temporada"], "campeonato": LAB.get(t["campeonato"], t["campeonato"]), "piloto": t["piloto"], "equipe": t.get("equipe", ""), "construtores": t.get("construtores", ""), "nota": t.get("nota", "")} for t in titulos]
    with open(out, "w", encoding="utf-8") as f: json.dump(saida, f, ensure_ascii=False, indent=1)
    print(f"{out}: {len(saida['pilotos'])} pilotos, {len(saida['pistas'])} pistas, {len(rows)} resultados, {len(rec)} recortes")

if __name__ == "__main__": main()
