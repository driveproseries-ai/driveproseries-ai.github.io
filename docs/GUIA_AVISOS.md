# Avisos por e-mail (sem WhatsApp)

Objetivo: levar os pilotos de volta ao site (mais visitas para o AdSense) avisando por e-mail quando sai matéria nova.

## Como funciona
1. O piloto se inscreve em `avisos.html` (e-mail + aceite).
2. O Apps Script guarda o e-mail na planilha "DPS - Inscritos nos avisos" (criada no seu Drive).
3. A cada hora o script lê `feed.xml` do site. Se houver matéria nova, envia um e-mail (um por inscrito, com link para descadastrar).
4. O `feed.xml` é gerado por `tools/gerar_paginas.py` (o `publicar.bat` já roda).

## Ativação (uma vez só, ~5 minutos)
1. Abra o projeto Apps Script dos pedidos de análise (o mesmo do Code.gs).
2. Substitua o conteúdo de `Code.gs` pelo arquivo `docs/apps-script-pedido/Code.gs` e crie um arquivo novo `Avisos.gs` com o conteúdo de `docs/apps-script-pedido/Avisos.gs`.
3. Execute a função `ativarAvisos` (autorize quando o Google pedir). Ela cria o gatilho de hora em hora e marca as matérias atuais como já avisadas, sem enviar nada.
4. Implantar > Gerenciar implantações > editar a implantação do app da Web > Nova versão > Implantar. A URL continua a mesma.
5. Teste: abra `avisos.html` no site, inscreva seu e-mail e confira a planilha no Drive.

## Limites
- Gmail comum: 100 e-mails por dia pelo Apps Script (o script envia no máximo 90 por rodada). Para mais inscritos, usar Google Workspace ou um serviço de newsletter.
- Os avisos são enviados em um e-mail por inscrito e trazem o link para sair da lista.
- Quem preferir pode assinar o `feed.xml` (RSS).
