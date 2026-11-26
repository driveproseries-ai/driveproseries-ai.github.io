#!/usr/bin/env python3
"""Publica as matérias agendadas cuja hora já chegou.

As matérias agendadas ficam em data/agendadas.json. Cada item é uma matéria completa (igual às de
data/noticias.json) com o campo extra "publicar_em" (data e hora com fuso, ex.: "2026-11-26T12:00:00-03:00").
Quando a hora passa, o script move a matéria para o topo de data/noticias.json e tira o "publicar_em".

Quem roda: o GitHub (.github/workflows/publicar-agendadas.yml), de hora em hora, sem precisar do computador.
Uso manual: python tools/publicar_agendadas.py [--agora 2026-11-26T12:00:00-03:00] [--seco]
  --agora  finge que já é essa hora (teste)      --seco  só mostra o que publicaria, sem gravar
Imprime "PUBLICADA: <id>" para cada matéria movida.
"""
import json, os, sys
from datetime import datetime, timezone

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ_N = os.path.join(raiz, "data", "noticias.json")
ARQ_A = os.path.join(raiz, "data", "agendadas.json")


def ler(caminho, padrao):
    try:
        with open(caminho, encoding="utf-8-sig") as f:
            return json.load(f)
    except FileNotFoundError:
        return padrao


def escrever(caminho, dados, original_tinha_quebra_final=False):
    texto = json.dumps(dados, ensure_ascii=False, indent=2)
    if original_tinha_quebra_final:
        texto += "\n"
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        f.write(texto)


def quando(txt):
    d = datetime.fromisoformat(str(txt))
    if d.tzinfo is None:
        raise ValueError(f'"publicar_em" sem fuso horário: {txt} (use por exemplo -03:00)')
    return d.astimezone(timezone.utc)


def main(argv):
    agora = datetime.now(timezone.utc)
    seco = "--seco" in argv
    if "--agora" in argv:
        agora = quando(argv[argv.index("--agora") + 1])
    agendadas = ler(ARQ_A, [])
    if not agendadas:
        print("Nada agendado.")
        return 0
    try:
        original_n = open(ARQ_N, encoding="utf-8-sig").read()
    except FileNotFoundError:
        original_n = "[]"
    noticias = json.loads(original_n)
    ids = {n.get("id") for n in noticias}
    prontas, restantes = [], []
    for a in agendadas:
        if not a.get("id") or not a.get("publicar_em"):
            print(f"ERRO: item agendado sem id ou sem publicar_em: {a.get('titulo')}", file=sys.stderr)
            return 1
        (prontas if quando(a["publicar_em"]) <= agora else restantes).append(a)
    if not prontas:
        proximo = min((quando(a["publicar_em"]) for a in restantes))
        print("Nada na hora. Próxima: " + proximo.astimezone().isoformat())
        return 0
    prontas.sort(key=lambda a: quando(a["publicar_em"]))
    for a in prontas:
        if a["id"] in ids:
            print(f"Já estava no ar, só tirei da fila: {a['id']}")
            continue
        item = {k: v for k, v in a.items() if k != "publicar_em"}
        noticias.insert(0, item)  # a mais nova fica no topo
        ids.add(a["id"])
        print("PUBLICADA: " + a["id"])
    if seco:
        print("(modo seco: nada foi gravado)")
        return 0
    escrever(ARQ_N, noticias, original_n.endswith("\n"))
    escrever(ARQ_A, restantes)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
