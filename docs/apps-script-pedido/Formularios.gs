/**
 * DPS - Inscrições 2027 e Fale conosco: grava numa planilha do Drive e envia e-mail de aviso.
 * Substitui o FormSubmit. Depende de Code.gs (mesmo projeto): doPost chama formulario(d).
 * Planilha criada automaticamente: "DPS - Inscrições 2027" (abas "Inscrições" e "Contatos").
 */
var NOME_PLANILHA_FORMS = 'DPS - Inscrições 2027';
var EMAILS_FORMS = ['driveproseries@gmail.com'];   // recebem cada inscrição/contato (além do dono da conta)

var COLUNAS_INSCRICAO = ['nome', 'id_jogo', 'plataforma', 'retorno', 'cidade', 'campeonato', 'tempo', 'ligas', 'tempo_bahrein', 'regulamento', 'imagem'];
var COLUNAS_CONTATO = ['assunto', 'nome', 'id_jogo', 'plataforma', 'retorno', 'mensagem'];

function abaForms(nome, colunas) {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('PLANILHA_FORMS'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create(NOME_PLANILHA_FORMS); p.setProperty('PLANILHA_FORMS', ss.getId()); }
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0].setName(nome) : ss.insertSheet(nome);
    sh.appendRow(['recebido_em'].concat(colunas));
    sh.setFrozenRows(1);
  }
  return sh;
}

function txt(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().substring(0, n || 300); }
function celula(v, n) { var t = txt(v, n); return /^[=+\-@]/.test(t) ? "'" + t : t; }   // evita fórmula em planilha

function formulario(d) {
  var tipo = d.tipo === 'contato' ? 'contato' : 'inscricao';
  var cols = tipo === 'contato' ? COLUNAS_CONTATO : COLUNAS_INSCRICAO;
  if (!txt(d.nome) || !txt(d.retorno)) return { ok: false, erro: 'Faltam campos.' };
  if (tipo === 'inscricao' && !txt(d.id_jogo)) return { ok: false, erro: 'Faltam campos.' };
  if (tipo === 'contato' && !txt(d.mensagem)) return { ok: false, erro: 'Faltam campos.' };
  var linha = [Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm')];
  cols.forEach(function (c) { linha.push(celula(d[c], c === 'ligas' || c === 'mensagem' ? 2000 : 200)); });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { abaForms(tipo === 'contato' ? 'Contatos' : 'Inscrições', cols).appendRow(linha); } finally { lock.releaseLock(); }
  try {
    var corpo = cols.map(function (c) { return c + ': ' + txt(d[c], 2000); }).join('\n');
    var assunto = tipo === 'contato' ? 'Portal DPS: ' + txt(d.assunto, 80) : 'Portal DPS: Inscrição 2027 - ' + txt(d.nome, 60);
    var para = EMAILS_FORMS.concat([Session.getEffectiveUser().getEmail()]).filter(function (e, i, a) { return e && a.indexOf(e) === i; }).join(',');
    var opc = { to: para, subject: assunto, body: corpo };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(txt(d.retorno))) opc.replyTo = txt(d.retorno);
    MailApp.sendEmail(opc);
  } catch (e) { Logger.log('ERRO EMAIL: ' + e); }
  return { ok: true };
}

function testar() {
  Logger.log(JSON.stringify(formulario({ tipo: 'inscricao', nome: 'Teste', id_jogo: 'teste123', retorno: 'teste@teste.com', campeonato: 'Mundial DPS' })));
}
