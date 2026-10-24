/**
 * DPS - Recebimento de pedidos de análise (vídeo + relato) no Google Drive.
 * Implantar como Aplicativo da Web: executar como "Eu", acesso "Qualquer pessoa".
 * Guia: docs/GUIA_PEDIDO_ANALISE.md
 */
var PASTA_RAIZ = 'DPS - Pedidos de análise';   // pasta criada no seu Drive
var ORIGEM_SITE = 'https://driveproseries-ai.github.io'; // endereço do site (sem barra no fim)
var MAX_MB = 600;                               // tamanho máximo do vídeo
var EMAIL_AVISO = '';                           // vazio = avisa o dono da conta

function doGet() { return ContentService.createTextOutput('DPS pedidos: ativo'); }

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.acao === 'iniciar') return saida(iniciar(d));
    if (d.acao === 'concluir') return saida(concluir(d));
    return saida({ ok: false, erro: 'acao invalida' });
  } catch (err) {
    return saida({ ok: false, erro: String(err) });
  }
}

function saida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function limpa(s, n) { return String(s || '').replace(/[^\wÀ-ÿ .\-]/g, '').trim().substring(0, n || 40); }
function pasta(pai, nome) { var it = pai.getFoldersByName(nome); return it.hasNext() ? it.next() : pai.createFolder(nome); }

function iniciar(d) {
  var camp = limpa(d.campeonato, 30), pista = limpa(d.pista, 40), tipo = d.tipo === 'defesa' ? 'defesa' : 'acusacao';
  var solic = limpa(d.solicitante, 30), env = limpa(d.envolvido, 30);
  if (!camp || !pista || !solic || !env || solic === env) return { ok: false, erro: 'Faltam campos.' };
  if (!/^video\//.test(d.mime || '')) return { ok: false, erro: 'O arquivo precisa ser um vídeo.' };
  var tamanho = Number(d.size || 0);
  if (!tamanho || tamanho > MAX_MB * 1024 * 1024) return { ok: false, erro: 'Vídeo acima de ' + MAX_MB + ' MB.' };

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var alvo, base;
  try {
    var raiz = pasta(DriveApp.getRootFolder(), PASTA_RAIZ);
    var par = [solic, env].sort().join(' x ');
    alvo = pasta(pasta(pasta(raiz, camp), pista), par);
    var carimbo = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd-HHmmss');
    base = tipo + '_' + carimbo + '_' + solic + '_x_' + env;
  } finally { lock.releaseLock(); }

  var ext = (String(d.nome || '').match(/\.(\w{2,4})$/) || [0, 'mp4'])[1].toLowerCase();
  alvo.createFile(base + '.txt', relatorio(d, tipo, 'AGUARDANDO O VÍDEO (upload em andamento)', ''), MimeType.PLAIN_TEXT);

  var r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': d.mime, 'X-Upload-Content-Length': String(tamanho), Origin: ORIGEM_SITE },
    payload: JSON.stringify({ name: base + '.' + ext, parents: [alvo.getId()] })
  });
  var h = r.getHeaders(), uri = h['Location'] || h['location'];
  if (!uri) return { ok: false, erro: 'Drive recusou iniciar o upload (' + r.getResponseCode() + ').' };
  return { ok: true, uri: uri, base: base, pasta: alvo.getId() };
}

function concluir(d) {
  var alvo = DriveApp.getFolderById(String(d.pasta));
  var base = limpa(d.base, 120);
  var video = null, it = alvo.getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(base + '.') === 0 && !/\.txt$/.test(f.getName())) video = f; }
  var txts = alvo.getFilesByName(base + '.txt');
  var tipo = d.tipo === 'defesa' ? 'defesa' : 'acusacao';
  var status = video ? 'RECEBIDO (vídeo ' + Math.round(video.getSize() / 1048576) + ' MB)' : 'VÍDEO NÃO CHEGOU (peça para reenviar)';
  var texto = relatorio(d, tipo, status, video ? video.getUrl() : '');
  if (txts.hasNext()) txts.next().setContent(texto); else alvo.createFile(base + '.txt', texto, MimeType.PLAIN_TEXT);
  try {
    MailApp.sendEmail(EMAIL_AVISO || Session.getEffectiveUser().getEmail(),
      'DPS: ' + (tipo === 'defesa' ? 'DEFESA' : 'PEDIDO') + ' ' + limpa(d.campeonato, 30) + ' ' + limpa(d.pista, 40) + ' - ' + d.solicitante + ' x ' + d.envolvido, texto + '\n\nPasta: ' + alvo.getUrl());
  } catch (e) {}
  return { ok: !!video, erro: video ? '' : 'Vídeo não encontrado no Drive.' };
}

function relatorio(d, tipo, status, link) {
  return ['PEDIDO DE ANÁLISE - DPS', 'Tipo: ' + (tipo === 'defesa' ? 'DEFESA' : 'ACUSAÇÃO / PEDIDO'), 'Status: ' + status,
    'Grid: ' + limpa(d.campeonato, 30), 'Pista: ' + limpa(d.pista, 40), 'Volta: ' + limpa(d.volta, 6),
    'Piloto que enviou: ' + limpa(d.solicitante, 30), 'Outro piloto envolvido: ' + limpa(d.envolvido, 30),
    'Enviado em: ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
    'Arquivo original: ' + limpa(d.nome, 80), link ? 'Vídeo: ' + link : '', '', 'RELATO:', String(d.relato || '').substring(0, 1500)].join('\n');
}
