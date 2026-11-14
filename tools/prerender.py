#!/usr/bin/env python3
"""Grava no HTML o conteúdo que o app.js monta (topo, página e rodapé).

Assim o texto existe no arquivo mesmo para quem não roda JavaScript (robôs do Google/AdSense).
No navegador nada muda: o app.js redesenha a página por cima ao carregar.

Uso: python tools/prerender.py   (o publicar.bat já roda)
Precisa do Microsoft Edge ou Google Chrome instalado (usa o modo headless).
"""
import functools, http.server, os, re, shutil, socketserver, subprocess, sys, threading

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINAS = ["index.html", "sobre.html", "regulamento.html", "tabelas.html", "calendario.html", "jornal.html",
           "f1.html", "halldafama.html", "estatisticas.html", "incidentes.html", "lastro.html", "videos.html",
           "privacidade.html", "contato.html", "inscricoes.html"]
BLOCOS = [("div", "topo"), ("main", "app"), ("div", "rodape")]
NAVEGADORES = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
               r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
               r"C:\Program Files\Google\Chrome\Application\chrome.exe",
               shutil.which("msedge") or "", shutil.which("chrome") or "", shutil.which("chromium") or ""]


def navegador():
    for n in NAVEGADORES:
        if n and os.path.exists(n):
            return n
    return None


def bloco(html, tag, id_):
    """Conteúdo de <tag id="id_">...</tag> (o fechamento certo, contando aninhamento)."""
    ini = re.search(rf'<{tag} id="{id_}"[^>]*>', html)
    if not ini:
        return None
    pos, nivel = ini.end(), 1
    abre, fecha = re.compile(rf"<{tag}[\s>]"), f"</{tag}>"
    while nivel:
        f = html.find(fecha, pos)
        if f < 0:
            return None
        a = abre.search(html, pos, f)
        if a:
            nivel, pos = nivel + 1, a.end()
        else:
            nivel, pos = nivel - 1, f + len(fecha)
    return ini.end(), pos - len(fecha)


def main():
    nav = navegador()
    if not nav:
        print("prerender: Edge/Chrome não encontrado; páginas ficam só com JavaScript (site continua funcionando).")
        return 0
    class Quieto(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quieto, directory=RAIZ)
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as srv:
        porta = srv.server_address[1]
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        ok = 0
        for p in PAGINAS:
            arq = os.path.join(RAIZ, p)
            if not os.path.exists(arq):
                continue
            try:
                r = subprocess.run([nav, "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
                                    "--virtual-time-budget=8000", "--dump-dom", f"http://127.0.0.1:{porta}/{p}"],
                                   capture_output=True, timeout=60)
                dom = r.stdout.decode("utf-8", "replace")
            except Exception as e:
                print(f"prerender: {p} falhou ({e})")
                continue
            fonte = open(arq, encoding="utf-8").read()
            novo, mudou = fonte, True
            for tag, id_ in BLOCOS:
                b_dom, b_src = bloco(dom, tag, id_), bloco(novo, tag, id_)
                if not b_dom or not b_src:
                    mudou = False
                    break
                conteudo = dom[b_dom[0]:b_dom[1]]
                if tag == "main" and ("Carregando…" in conteudo and len(conteudo) < 200):
                    mudou = False  # a página não terminou de montar; não grava lixo
                    break
                novo = novo[:b_src[0]] + conteudo + novo[b_src[1]:]
            if not mudou:
                print(f"prerender: {p} não montou a tempo; mantido como estava")
                continue
            if novo != fonte:
                with open(arq, "w", encoding="utf-8", newline="\n") as f:
                    f.write(novo)
            ok += 1
        srv.shutdown()
    print(f"prerender: {ok}/{len(PAGINAS)} páginas com texto fixo")
    return 0


if __name__ == "__main__":
    sys.exit(main())
