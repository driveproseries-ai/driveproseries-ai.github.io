/**
 * DPS - Avisos por e-mail (sem WhatsApp): pilotos se inscrevem no site e recebem um resumo
 * quando sai matéria nova, para voltarem ao site. Usa o feed.xml do site.
 * Guia: docs/GUIA_AVISOS.md
 *
 * Depende de Code.gs (mesmo projeto): doPost chama inscrever(d) e doGet chama sair(e).
 */
var FEED_URL = ORIGEM_SITE + '/feed.xml';
var NOME_PLANILHA = 'DPS - Inscritos nos avisos';
var MAX_POR_ENVIO = 90;            // cota do Gmail comum: 100 destinatários por dia

function planilha() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('PLANILHA_AVISOS');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  var ss = SpreadsheetApp.create(NOME_PLANILHA);
  ss.getSheets()[0].appendRow(['email', 'inscrito_em', 'ativo']);
  p.setProperty('PLANILHA_AVISOS', ss.getId());
  return ss.getSheets()[0];
}
function segredo() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SEGREDO', s); }
  return s;
}
function token(email) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(email.toLowerCase(), segredo())).substring(0, 22);
}
function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120; }

function inscrever(d) {
  var email = String(d.email || '').trim().toLowerCase();
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (!d.aceite) return { ok: false, erro: 'Marque o aceite para receber os avisos.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = planilha(), v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][0]).toLowerCase() === email) { sh.getRange(i + 1, 3).setValue('sim'); return { ok: true }; }
    }
    sh.appendRow([email, Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm'), 'sim']);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

function sair(e) {
  var email = String((e.parameter || {}).sair || '').toLowerCase(), t = (e.parameter || {}).t || '';
  var msg = 'Link inválido.';
  if (emailValido(email) && t === token(email)) {
    var sh = planilha(), v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) if (String(v[i][0]).toLowerCase() === email) sh.getRange(i + 1, 3).setValue('nao');
    msg = 'Pronto: você não receberá mais avisos da DPS.';
  }
  return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;font-size:18px;padding:24px">' + msg + '</p>');
}

// Cria o gatilho: roda a cada hora e só envia se houver matéria nova.
function ativarAvisos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'enviarAvisos') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('enviarAvisos').timeBased().everyHours(1).create();
  enviarAvisos(true); // primeira vez: só marca o que já existe, sem enviar
}

function lerFeed() {
  var r = UrlFetchApp.fetch(FEED_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return [];
  var x = r.getContentText(), out = [], re = /<item><title>([\s\S]*?)<\/title><link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description><\/item>/g, m;
  function d(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&'); }
  while ((m = re.exec(x))) out.push({ titulo: d(m[1]), link: d(m[2]), resumo: d(m[3]) });
  return out;
}

function enviarAvisos(soMarcar) {
  var p = PropertiesService.getScriptProperties();
  var vistos = JSON.parse(p.getProperty('AVISADOS') || '[]');
  var itens = lerFeed();
  var novos = itens.filter(function (i) { return vistos.indexOf(i.link) < 0; });
  if (!novos.length) return;
  if (!soMarcar) {
    var v = planilha().getDataRange().getValues(), dest = [];
    for (var i = 1; i < v.length; i++) if (String(v[i][2]) === 'sim') dest.push(String(v[i][0]));
    dest = dest.slice(0, MAX_POR_ENVIO);
    var url = ScriptApp.getService().getUrl();
    dest.forEach(function (email) {
      var corpo = novos.slice(0, 5).map(function (n) { return n.titulo + '\n' + n.resumo + '\n' + n.link; }).join('\n\n');
      corpo += '\n\nTodas as matérias: ' + ORIGEM_SITE + '/jornal.html\n\nPara não receber mais: ' + url + '?sair=' + encodeURIComponent(email) + '&t=' + token(email);
      try { MailApp.sendEmail({ to: email, subject: 'DPS: ' + (novos.length === 1 ? novos[0].titulo : novos.length + ' matérias novas no Portal DPS'), body: corpo, name: 'Portal DPS' }); } catch (e) {}
    });
  }
  p.setProperty('AVISADOS', JSON.stringify(itens.map(function (i) { return i.link; }).concat(vistos).slice(0, 200)));
}
