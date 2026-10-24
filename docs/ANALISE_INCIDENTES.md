# Análise automática de incidentes (tarefa na nuvem)

Este guia é lido pela tarefa agendada "DPS - Análise de incidentes". Regras de fundo: `regulamento/leitura-2027.html`, capítulo 12 (itens 12.1 a 12.28) e Anexo E. Em caso de dúvida, vale o regulamento.

## 1. Onde estão os pedidos
- Os pilotos enviam pela página `pedido.html`. O Drive da conta driveproseries@gmail.com recebe em `DPS - Pedidos de análise / <Grid> / <Pista> / <Piloto A> x <Piloto B> /` (nomes em ordem alfabética), compartilhada como leitor com o Drive conectado a esta tarefa.
- Cada envio gera `acusacao_AAAAMMDD-HHMMSS_<quem envia>_x_<outro>.txt` + `.mp4` (ou `defesa_...`). O .txt tem Grid, Pista, Volta, quem enviou, o outro piloto, o relato e o status. Na subpasta `partes` ficam as partes de 5 MB do vídeo (`<base>.parte001`, `.parte002`...), porque o conector do Drive só entrega arquivos de até ~7 MB por chamada.
- Achar pedidos: `search_files` com `title contains 'acusacao_'` e `title contains 'defesa_'` (paginar com nextPageToken). Filtrar os `.txt` (fileExtension txt) e ler o conteúdo (já vem no contentSnippet ou via read_file_content).
- Remontar o vídeo: buscar `title contains '<base>.parte'`, baixar cada parte com `download_file_content` (uma por chamada, no máx. 4 em paralelo; o resultado vai para um arquivo JSON com `content` em base64), decodificar, concatenar em ordem (parte001, 002, ...) e conferir que o tamanho total é o do `.mp4` (campo fileSize). Rode python com `-I`. Só tratar como válido se o ffprobe abrir o arquivo.
- Pedidos de teste: ignorar os que tiverem relato sem sentido (ex.: "teste", letras soltas) ou piloto "lala/po/dsannkj"; avisar o usuário uma vez e marcar como ignorado.

## 2. Quando analisar um caso
Um caso = mesmo Grid + Pista + par de pilotos. Analisar quando:
- existe a acusação (e/ou o pedido do outro lado) **e** a defesa, ou
- o prazo da defesa venceu: 5 dias depois da data da etapa (calendário em `data/mundial.json` ou `data/elite.json`, campo `calendario[].data` da pista). Sem defesa no prazo, aplicar o item 12.8 (perda de 5 pts por não enviar a defesa) e sinalizar isso ao usuário; analisar só com o vídeo da acusação e baixar a confiança.
- O pedido de análise precisa ter chegado em até 24 h após a corrida (12.1). Se chegou fora, avisar o usuário sem analisar.
Casos já tratados ficam no arquivo de estado (seção 6). Nunca analisar o mesmo caso duas vezes.

## 3. Como analisar
1. Conferir os vídeos (12.3, 12.5): do próprio piloto, tela inteira, horizontal, sem narração. Registrar problemas.
2. Extrair quadros com ffmpeg: primeiro uma folha de contato (1–2 quadros por segundo) para achar o contato, depois quadros a 10–15 fps ao redor dele. Os dois onboards precisam ser sincronizados (usar o relógio/volta, as leituras de velocidade e a distância dos carros no HUD) antes de falar de quem estava à frente.
3. Reunir os fatos: posição dos eixos (dianteiro de um em relação ao traseiro/retrovisor do outro), linha usada, número de mudanças de direção do defensor, quem tinha espaço, velocidade antes e depois, dano, perda de posições, DNF.
4. Comparar com o relato de cada lado (12.2) e registrar contradições.
5. Aplicar os critérios da F1 real (12.28, Diretrizes de Padrões de Condução da FIA v4.1 e as explicações do formula1.com): quem vem atrás só reivindica espaço se o eixo dianteiro estiver ao lado do retrovisor do carro da frente; uma única defesa de posição; deixar um carro de largura de pista; quem está à frente e já passou com o eixo traseiro livre não precisa abrir espaço; toque de corrida (12.13) quando nenhum lado pode ser responsabilizado com clareza.
6. Classificar com a tabela do 12.14: sem punição, leve (4 pts), média (6), grave (10), gravíssima (20, dano grave ou DNF). Pontos de carteira (12.18.2): 3/6/8/10; limite 20 = excluído da próxima etapa. Reincidência (12.19) e demais casos do 12.20 conforme o regulamento. Contar reincidência e carteira a partir de `data/incidentes.json` (entradas já publicadas, campos `punicao`, `carteira_pts` e `categoria`).
7. Dar um nível de confiança: **alta** (contato visível nos dois vídeos, regra clara), **média** ou **baixa** (imagem ruim, contato fora de quadro, vídeo de um lado só, sincronização incerta). Em confiança baixa não sugerir punição (12.27.3).

## 4. Saída
- Dossiê curto para o usuário (celular): casos, quem acusa, resumo em 3-4 linhas, regra aplicada, decisão sugerida, confiança, dúvidas. Linguagem simples, em português do Brasil. Evitar listas longas.
- Rascunho da entrada de `data/incidentes.json`, no formato:
```json
{
  "id": "AAAA-MM-DD-<grid>-<pista>-<pilotoA>-<pilotoB>",
  "campeonato": "mundial" | "elite",
  "etapa": 18,
  "pista": "Singapura",
  "volta": "1",
  "data": "AAAA-MM-DD",
  "titulo": "Piloto A × Piloto B",
  "resumo": "O que aconteceu, em 2-3 frases.",
  "analise": "Análise por IA com os vídeos dos dois pilotos. ...",
  "regra": "Regra aplicada (F1 real + item do regulamento).",
  "decisao": "Incidente de corrida" | "Culpado: <piloto>" | "Sem punição" | "Em análise",
  "punicao": "" | "Grave (−10 pts)",
  "categoria": "" | "leve" | "media" | "grave" | "gravissima",
  "carteira_pts": 0,
  "alerta": ""
}
```
`etapa` vem do calendário (campo `n` da pista). `alerta` só quando houver orientação ao piloto. Não incluir vídeos nem links dos vídeos no site (12.27.4).
- Guardar o dossiê completo e as imagens-chave no Drive do usuário (pasta "DPS - Análises (Claude)"), nunca no repositório (o site é público).

## 5. Publicar
- **Nunca publique sem o usuário responder "publicar"** (12.27.2: a decisão é da Direção). Exceção só se o usuário tiver dito explicitamente na conversa que casos de confiança alta podem ser publicados direto.
- Ao receber "publicar": `git pull --rebase origin main`; acrescentar a entrada em `data/incidentes.json`; `python3 tools/validar.py`; commit e `git push origin main`. Mexer só em `data/incidentes.json`. Se o usuário pedir correção, ajustar e mostrar de novo.
- Depois de publicar, atualizar o estado do caso para "publicado".

## 6. Estado
Arquivo `estado_incidentes.json` na pasta "DPS - Análises (Claude)" do Drive do usuário (criar se não existir): lista de casos com `chave` (grid|pista|par ordenado), `arquivos` (bases vistas), `status` (aguardando_defesa, rascunho_enviado, publicado, ignorado, fora_do_prazo), `atualizado_em`. Ler no início e gravar no fim. Se não conseguir gravar no Drive, avisar o usuário.
