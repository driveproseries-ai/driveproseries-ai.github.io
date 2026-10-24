# Automação do site — instruções para o Claude

Este arquivo deve ser lido pela tarefa "DPS - processar etapa" (00:20, seg/qua) e pela tarefa diária de notícias da F1. Fica em `Projeto Claude\automacao\` junto de `INSTRUCOES_CLAUDE.md` (acrescentar lá um "Passo 8 — Site": seguir este arquivo). A pasta do site é `Projeto Claude\site-dps` (repositório Git).

## Quando publicar
O site é atualizado quando acontecer primeiro: (a) uma etapa foi confirmada ("pode salvar"), ou (b) a tarefa diária achou notícia nova e importante da F1 real (contratação, resultado de GP, mudança de regulamento, calendário). Sem novidade relevante, não publicar nada nesse dia.

## Regras gerais
- Só publicar depois do "pode salvar" do usuário (resultado confirmado e lançado no FGC). A tabela do site usa os pontos do FGC (fonte oficial); `pun` vem de `punicoes_pendentes.csv` (valor negativo).
- Nunca publicar conteúdo de demonstração: nada em `data/demo/` vai para fora (a pasta pode ser apagada antes do primeiro push).
- Rodar `python tools\validar.py` antes de publicar; se falhar, corrigir e repetir. Depois `publicar.bat`.

## Como ler o FGC pelo navegador do app (validado em 23/10)
- Abrir web.fgc-app.com; a página é Flutter: rodar no JavaScript da página `document.querySelector('flt-semantics-placeholder').click()` para liberar o texto.
- Ligas > DPS LEAGUE - T18 ATUAL > (rolar a lista) MUNDIAL DPS 2026 / MUNDIAL DPS ELITE 2026. Aba **Race** = calendário (data, hora, status Done/Pending, pódio abreviado); aba **Ranking** = pilotos e construtores. Usar `get_page_text` no Ranking e `read_page` na lista de etapas (rolar para carregar todas).
- Equipes do Elite: a cor do código de 3 letras no ranking de pilotos é a cor da equipe (casar com a cor do nome na tabela de construtores). Reservas não entram.
- Pontos do site = pontos do FGC (sem punição). Punições: `punicoes_pendentes.csv`/planilha (campo `pun`, negativo). Na tabela geral só são informadas; em grupos e construtores são descontadas.

## Depois de cada etapa (após "pode salvar")
1. Atualizar `data/<mundial|elite>.json`: `pilotos` (nome, grupo, equipe, pts do FGC, pun), `construtores` (pontos do FGC; `pun` = soma das punições dos titulares da equipe), `atualizado_em` (data da etapa). No `calendario` (que já traz as 24 etapas, lidas do FGC): etapa disputada vira `realizada`; a seguinte vira `proxima`. Tipos (`sprint`, `cpd`, `invertido`...) vêm de `estado_<camp>.json`; datas conferir no FGC.
2. Escrever a matéria da corrida e inserir no topo de `data/noticias.json` (id = `AAAA-MM-DD-<camp>-<pista>`). Estilo de portal esportivo (tipo ge.globo): título factual e forte, linha fina de uma frase, 4 a 6 parágrafos curtos em ordem: quem venceu e como; largada e primeiras voltas; disputa do pelotão e lastro (o carro sorteado importa); incidentes e punições já definidas; consequência na tabela. Usar apenas fatos do resultado, da telemetria e da transmissão, sem inventar falas. Incluir `resultado` com o top 10 (ou todos). Se a fonte do resultado foi o vídeo ("conferir"), não afirmar detalhes não confirmados.
3. Etapa com punição ainda em análise: citar como "em análise", sem pontos.

## Diariamente — F1 real (`data/f1.json`)
1. Buscar na web notícias novas e relevantes da F1 real (resultados, mudanças de regulamento, contratações, calendário). Preferir fontes originais: fia.com, formula1.com, veículos de imprensa esportiva conhecidos.
2. Para cada item novo: `titulo` próprio, `resumo` de 1 a 2 frases **escrito com palavras próprias** (sem copiar trecho do texto original), `fonte` (nome do veículo), `url` (link direto) e `data`. Sem fonte e link, não publicar. Evitar boatos; marcar como "segundo [veículo]" quando não confirmado oficialmente.
3. Manter no máximo ~40 itens (remover os mais antigos). Não repetir assunto já publicado.

## Jornal DPS (avisos)
Avisos, inscrições e comunicados da liga entram em `noticias.json` com `"tipo":"jornal"` e `"campeonato": null`, somente quando o usuário pedir ou fornecer o texto.

## Sprint, grid invertido, CPD
Mencionar na matéria quando o `calendario` marcar `sprint`, `invertido` ou `cpd` para a etapa.

## Jornal DPS — tipos de matéria
- `"tipo":"corrida"`: resumo pós-etapa (estilo jornal esportivo).
- `"tipo":"expectativa"`: prévia publicada antes da etapa (quem lidera, pista, tipo de etapa, lastro). Só fatos verificados no FGC/planilha; sem prever resultado como certeza.
- `"tipo":"jornal"`: avisos da liga.

## Histórico e Hall da Fama
- Resultados por corrida: `data/hist/*.txt` + `tools/converter_hist.py` → `data/historico.csv`. Campeões: `data/titulos.csv` (temporada;campeonato;piloto;equipe;construtores;nota).
- `python tools/gerar_stats.py data/historico.csv data/titulos.csv` gera `data/stats.json` (geral + recortes por campeonato/ano + campeões). Alimenta Estatísticas e Hall da Fama.
- Ao fim de cada temporada: ler a aba Winner do campeonato no FGC, acrescentar a linha em `titulos.csv`, converter as corridas novas e regerar.
- Modo Carreira 1 (T19) e 2 (T20), ambos encerrados estão em `data/carreira1.json` e `carreira2.json` (tabela e calendário; sem resultados etapa a etapa).

## Páginas 2027 (lastro, sorteio, incidentes, inscrições)

- **Lastro (`lastro.html`, `data/lastro.json`)**: fica oculta até `ativo: true`. Preencher `ordem_ea` com os 11 carros do mais fraco ao mais forte (ordem da EA no jogo). A página distribui os pilotos do `mundial.json` sozinha: líder da tabela (pontos do FGC, sem desconto de punições) no pior carro, 2 pilotos por carro. Se a próxima etapa tiver o tipo `desempenho_igual` no calendário, a página mostra o aviso no lugar da tabela. Atualizar `atualizado_em` a cada etapa.
- **Sorteio (`sorteio.html`, `data/sorteio.json`)**: `pilotos` = lista em ordem de IN (1 a 22) para já vir preenchida; depois do sorteio oficial, colar as duplas em `resultado` (campos `a`, `ia`, `b`, `ib`, `soma`, `min`, `max`) e preencher `realizado_em`.
- **Incidentes (`incidentes.html`, `data/incidentes.json`)**: lista de objetos com `campeonato`, `etapa`, `pista`, `volta`, `titulo`, `resumo`, `analise`, `regra`, `decisao` ("Sem ação" ou "Punição"), `punicao`.
- **Inscrições (`inscricoes.html`)**: usa o mesmo FormSubmit do Fale conosco. `site.json > inscricoes` controla `abertas`, `prazo` e `mensagem` (quando encerradas).
- Teste local com `?demo=1` usa `data/demo/*.json`.
