/* Portal DPS — site estático. Todo conteúdo vem de /data/*.json */
(function () {
  "use strict";
  var qs = new URLSearchParams(location.search);
  var DEMO = false;
  try {
    if (qs.get("demo") === "1") sessionStorage.setItem("dpsDemo", "1");
    if (qs.get("demo") === "0") sessionStorage.removeItem("dpsDemo");
    DEMO = sessionStorage.getItem("dpsDemo") === "1";
  } catch (e) { DEMO = qs.get("demo") === "1"; }
  var PAGE = document.body.getAttribute("data-page") || (document.querySelector("[data-page]") || document.body).getAttribute("data-page");

  var TIPOS = { sprint: "Sprint", cpd: "CPD", invertido: "Grid invertido", desempenho_igual: "Desempenho igual", surpresa: "Etapa surpresa" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function $(s, r) { return (r || document).querySelector(s); }

  function getJSON(name, demoable) {
    var tryReal = function () {
      return fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { return null; });
    };
    if (DEMO && demoable) {
      return fetch("data/demo/" + name + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(tryReal);
    }
    return tryReal();
  }

  var fmtData = function (iso, longo) {
    if (!iso) return "data a confirmar";
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return "data a confirmar";
    return d.toLocaleDateString("pt-BR", longo ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "short" }).replace(".", "");
  };
  var diasAte = function (iso) {
    if (!iso) return null;
    var hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    return Math.round((new Date(iso + "T12:00:00") - hoje) / 86400000);
  };
  var codigo = function (nome) { return nome.replace(/[^A-Za-zÀ-ú ]/g, "").trim().split(/\s+/).pop().slice(0, 3).toUpperCase(); };

  /* ---------- dados globais ---------- */
  var S = {}; // site, camps, dados por campeonato
  function carregar() {
    return Promise.all([getJSON("site"), getJSON("campeonatos")]).then(function (r) {
      S.site = r[0] || {}; S.camps = r[1] || [];
      return Promise.all(S.camps.map(function (c) { return getJSON(c.id).then(function (d) { c.dados = d || { pilotos: [], construtores: [], calendario: [] }; }); }));
    });
  }
  function campCor(id) { var c = S.camps.filter(function (x) { return x.id === id; })[0]; return c ? c.cor : "#10231c"; }
  function campNome(id) { var c = S.camps.filter(function (x) { return x.id === id; })[0]; return c ? c.curto : ""; }
  function real(p) { return (p.pts || 0) + (p.pun || 0); }
  function ordenarFGC(lista) { return lista.slice().sort(function (a, b) { return (b.pts || 0) - (a.pts || 0); }); }
  function ordenar(lista) { return lista.slice().sort(function (a, b) { return real(b) - real(a) || b.pts - a.pts; }); }

  /* ---------- estrutura ---------- */
  var MENU = [["index.html", "Início", "home"], ["jornal.html", "Jornal DPS", "jornal"], ["tabelas.html", "Tabelas", "tabelas"], ["calendario.html", "Próximas etapas", "calendario"], ["f1.html", "F1 real", "f1"], ["estatisticas.html", "Estatísticas", "estatisticas"], ["halldafama.html", "Hall da Fama", "halldafama"], ["contato.html", "Fale conosco", "contato"]];
  MENU.splice(1, 0, ["contato.html?assunto=2027", "Mundiais 2027", "mundiais2027"]);
  function montarTopo(noticias) {
    var nav = MENU.map(function (m) { return '<a href="' + m[0] + '"' + (m[2] === PAGE || (PAGE === "materia" && m[2] === "jornal") ? ' aria-current="page"' : "") + ">" + m[1] + "</a>"; }).join("");
    var ult = noticias[0];
    var plantao = ult ? '<div class="plantao"><div class="wrap"><b>ÚLTIMA</b><a href="materia.html?id=' + encodeURIComponent(ult.id) + '">' + esc(ult.titulo) + "</a></div></div>" : "";
    var demo = DEMO ? '<div class="demo-aviso">Modo demonstração: textos, notícias e estatísticas desta visualização são de exemplo. <a href="?demo=0" style="color:#fff">Sair</a></div>' : "";
    $("#topo").innerHTML = demo + '<header class="topo"><div class="wrap"><a class="marca" href="index.html">DPS<span>.</span>Portal</a><nav class="menu" aria-label="Principal">' + nav + "</nav></div></header>" + plantao;
  }
  function montarRodape() {
    var s = S.site, links = [];
    if (s.youtube) links.push('<a href="' + esc(safeUrl(s.youtube)) + '" rel="noopener">YouTube da DPS</a>');
    if (s.instagram) links.push('<a href="' + esc(safeUrl(s.instagram)) + '" rel="noopener">Instagram</a>');
    $("#rodape").innerHTML = '<footer class="rodape"><div class="wrap"><div><strong style="font-family:var(--head);font-size:22px;color:#fff">' + esc(s.nome || "Portal DPS") + "</strong><br>" + esc(s.slogan || "") + "<br>" + links.join(" · ") + '</div><div class="visitas">Visitas <b id="visitas">…</b></div></div></footer>';
  }
  function contador() {
    var c = S.site.contador, el = $("#visitas");
    if (!c || !el) { if (el) el.parentNode.style.display = "none"; return; }
    var base = "https://api.counterapi.dev/v1/" + encodeURIComponent(c.namespace) + "/" + encodeURIComponent(c.chave);
    var local = /^(localhost|127\.0\.0\.1|)$/.test(location.hostname);
    var jaContou = false; try { jaContou = sessionStorage.getItem("dpsVisita") === "1"; } catch (e) {}
    var url = (local || jaContou || DEMO) ? base : base + "/up";
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (j && typeof j.count === "number") { el.textContent = j.count.toLocaleString("pt-BR"); try { sessionStorage.setItem("dpsVisita", "1"); } catch (e) {} }
      else el.parentNode.style.display = "none";
    }).catch(function () { el.parentNode.style.display = "none"; });
  }

  /* ---------- blocos ---------- */
  function torre(c, n) {
    var l = ordenarFGC(c.dados.pilotos).slice(0, n || 10);
    if (!l.length) return '<div class="vazio">Sem pilotos cadastrados.</div>';
    return '<ol>' + l.map(function (p, i) { return '<li><span class="pos">' + (i + 1) + '</span><span class="gr" title="Grupo ' + esc(p.grupo || "") + '">' + esc(p.grupo || "–") + '</span><span class="nm">' + esc(p.nome) + '</span><span class="pt">' + p.pts + "</span></li>"; }).join("") + "</ol>";
  }
  function etapaCard(c, e) {
    var d = diasAte(e.data), quando = fmtData(e.data, true);
    var falta = d == null ? "" : d === 0 ? "<small>hoje</small>" : d > 0 ? "<small>em " + d + (d === 1 ? " dia" : " dias") + "</small>" : "";
    var tags = (e.tipos || []).map(function (t) { return '<span class="tag">' + esc(TIPOS[t] || t) + "</span>"; }).join("");
    return '<article class="etapa" style="--c:' + c.cor + '"><div class="camp">' + esc(c.nome) + (e.n ? " · etapa " + e.n : "") + "</div><h3>" + esc(e.pista) + '</h3><div class="quando">' + esc(quando) + (e.hora ? ", " + esc(e.hora) : "") + falta + "</div>" + (tags ? '<div class="tags">' + tags + "</div>" : "") + (e.observacao ? "<p>" + esc(e.observacao) + "</p>" : "") + "</article>";
  }
  function proximaEtapa(c) {
    var cal = c.dados.calendario || [];
    return cal.filter(function (e) { return e.status === "proxima"; })[0] || cal.filter(function (e) { return e.status !== "realizada"; })[0];
  }
  function cardNoticia(n) {
    var cor = n.campeonato ? campCor(n.campeonato) : "#10231c";
    var selo = n.campeonato ? '<span class="selo" style="--c:' + cor + '">' + esc(campNome(n.campeonato)) + "</span> " : '<span class="selo" style="--c:#10231c">DPS</span> ';
    return '<a class="card" style="--c:' + cor + '" href="materia.html?id=' + encodeURIComponent(n.id) + '">' + selo + '<span class="meta">' + esc(fmtData(n.data)) + "</span><h3>" + esc(n.titulo) + "</h3><p>" + esc(n.linha_fina || "") + "</p></a>";
  }
  function tabelaF1(tb) {
    if (!tb || !tb.linhas) return "";
    var l = safeUrl(tb.url);
    return '<details class="mini"><summary>' + esc(tb.titulo || "Ver tabela") + '</summary><div class="rolagem"><table style="min-width:0"><thead><tr>' + tb.colunas.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + tb.linhas.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" + (l ? '<p class="nota"><a href="' + esc(l) + '" rel="noopener">' + esc(tb.fonte || l) + "</a></p>" : "") + "</details>";
  }
  function linhaF1(n) {
    var u = safeUrl(n.url);
    return '<div class="linha"><time>' + esc(fmtData(n.data)) + '</time><div><h3>' + (u ? '<a href="' + esc(u) + '" rel="noopener" style="text-decoration:none">' + esc(n.titulo) + "</a>" : esc(n.titulo)) + "</h3><p>" + esc(n.resumo || "") + "</p>" + tabelaF1(n.tabela) + '<div class="fonte">Fonte: ' + (u ? '<a href="' + esc(u) + '" rel="noopener">' + esc(n.fonte || u) + "</a>" : esc(n.fonte || "")) + "</div></div></div>";
  }
  function vazio(t, msg) { return '<div class="vazio"><b>' + esc(t) + "</b>" + esc(msg) + "</div>"; }
  function abasCamp(sel, onChange, extraId) {
    var el = document.createElement("div"); el.className = "abas"; el.setAttribute("role", "group"); el.setAttribute("aria-label", "Campeonato");
    el.innerHTML = S.camps.map(function (c) { return '<button type="button" data-id="' + esc(c.id) + '" style="--c:' + c.cor + '" aria-pressed="' + (c.id === sel) + '">' + esc(c.nome) + "</button>"; }).join("");
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      [].forEach.call(el.children, function (x) { x.setAttribute("aria-pressed", x === b); });
      onChange(b.getAttribute("data-id"));
    });
    return el;
  }
  function parceirosHTML() {
    var l = (S.site.parceiros || []);
    if (!l.length) return "";
    return '<div class="parceiros">' + l.map(function (p) {
      var ig = safeUrl(p.instagram);
      return '<div class="parceiro"><h3>' + esc(p.nome) + "</h3><div>" + esc(p.descricao || "") + "</div>" + (ig ? '<a class="botao" href="' + esc(ig) + '" rel="noopener">Ver no Instagram</a>' : '<span class="meta">Perfil no Instagram em breve.</span>') + "</div>";
    }).join("") + "</div>";
  }

  /* ---------- páginas ---------- */
  var paginas = {
    home: function (ctx) {
      var n = ctx.noticias, main = $("#app");
      var dest = n[0], cp = S.camps[0];
      var capa = dest
        ? '<a class="destaque" style="--c:' + (dest.campeonato ? campCor(dest.campeonato) : "#10231c") + '" href="materia.html?id=' + encodeURIComponent(dest.id) + '"><span class="selo">' + esc(dest.campeonato ? campNome(dest.campeonato) : "DPS") + '</span> <span class="meta">' + esc(fmtData(dest.data, true)) + "</span><h1>" + esc(dest.titulo) + "</h1><p>" + esc(dest.linha_fina || "") + "</p></a>"
        : '<div class="capa-vazia"><h1>A cobertura da DPS começa aqui.</h1><p>A matéria de cada corrida entra no ar logo depois da etapa. Enquanto isso, confira as tabelas e a próxima largada.</p></div>';
      var ch = S.site.chamada, chamada = ch ? '<section class="chamada" aria-label="Convite"><div><h2>' + esc(ch.titulo) + '</h2><p>' + esc(ch.texto || "") + '</p></div><a class="botao" href="' + esc(ch.link || "contato.html") + '">' + esc(ch.botao || "Quero participar") + "</a></section>" : "";
      var html = '<div class="wrap">' + chamada + '<div class="capa">' + capa + '<aside class="torre" id="torre" aria-label="Classificação"></aside></div>';
      var prox = []; S.camps.forEach(function (c) { var e = proximaEtapa(c); if (e) prox.push(etapaCard(c, e)); });
      html += '<section class="sec"><div class="sec-topo"><h2>Próximas etapas</h2><a href="calendario.html">Calendário completo</a></div>' + (prox.length ? '<div class="prox">' + prox.join("") + "</div>" : vazio("Sem etapas marcadas", "O calendário aparece aqui assim que a próxima data for confirmada.")) + "</section>";
      var resto = n.slice(1, 7);
      html += '<section class="sec"><div class="sec-topo"><h2>Jornal DPS</h2><a href="jornal.html">Todas as matérias</a></div>' + (resto.length ? '<div class="cards">' + resto.map(cardNoticia).join("") + "</div>" : vazio("Nada por aqui ainda", "As próximas matérias e avisos da liga aparecem nesta área.")) + "</section>";
      html += '<section class="sec"><div class="sec-topo"><h2>F1 real</h2><a href="f1.html">Mais notícias</a></div>' + (ctx.f1.length ? '<div class="linhas">' + ctx.f1.slice(0, 4).map(linhaF1).join("") + "</div>" : vazio("Sem notícias da F1 por enquanto", "As notícias do campeonato real entram aqui, sempre com a fonte.")) + "</section>";
      var par = parceirosHTML();
      if (par) html += '<section class="sec"><div class="sec-topo"><h2>Equipes parceiras</h2></div>' + par + "</section>";
      html += '<section class="sec"><div class="faixa"><div><h2>Quer correr na DPS?</h2><p>Conte seu nível e sua plataforma. A comissão avalia cada inscrição.</p></div><a class="botao" href="contato.html">Falar com a liga</a></div></section></div>';
      main.innerHTML = html;
      var t = $("#torre"), atual = S.camps[0];
      function pinta(id) {
        var c = S.camps.filter(function (x) { return x.id === id; })[0]; if (!c) return;
        t.style.setProperty("--c", c.cor);
        t.innerHTML = '<div class="torre-topo"><h2>' + esc(c.nome) + "</h2></div>" + torre(c, 10) + '<div class="torre-pe">Pontos do FGC. <a href="tabelas.html?c=' + esc(c.id) + '">Tabela completa</a></div>';
      }
      if (cp) {
        var ab = abasCamp(cp.id, pinta); ab.style.margin = "0"; ab.style.padding = "8px 10px"; ab.style.background = "#fff";
        t.innerHTML = ""; pinta(cp.id);
        t.insertBefore(ab, t.firstChild);
      }
    },

    tabelas: function () {
      var main = $("#app"), cur = qs.get("c") || (S.camps[0] && S.camps[0].id), vis = "geral";
      main.innerHTML = '<div class="wrap"><h1>Tabelas</h1><p class="meta" id="atual"></p><div id="ab"></div><div id="sub"></div><div id="tb"></div></div>';
      var VIS = [["geral", "Pilotos"], ["grupos", "Grupos"], ["construtores", "Construtores"]];
      function desenha() {
        var c = S.camps.filter(function (x) { return x.id === cur; })[0]; if (!c) { $("#tb").innerHTML = vazio("Sem campeonato", "Nenhum campeonato cadastrado."); return; }
        main.style.setProperty("--camp", c.cor);
        var d = c.dados;
        $("#atual").textContent = d.atualizado_em ? "Atualizada em " + fmtData(d.atualizado_em, true) : "";
        $("#sub").innerHTML = '<div class="abas sub">' + VIS.map(function (v) { return '<button type="button" data-v="' + v[0] + '" aria-pressed="' + (v[0] === vis) + '">' + v[1] + "</button>"; }).join("") + "</div>";
        var out = "";
        if (vis === "geral") {
          var l = ordenarFGC(d.pilotos);
          out = l.length ? '<div class="rolagem"><table><thead><tr><th>Pos</th><th>Piloto</th><th>Grupo</th><th>Equipe</th><th class="n">Pontos</th><th class="n">Punições</th></tr></thead><tbody>' + l.map(function (p, i) { return '<tr><td class="p">' + (i + 1) + "</td><td><strong>" + esc(p.nome) + "</strong></td><td>" + esc(p.grupo || "–") + "</td><td>" + esc(p.equipe || "–") + '</td><td class="n"><strong>' + p.pts + '</strong></td><td class="n ' + (p.pun ? "neg" : "") + '">' + (p.pun || "–") + "</td></tr>"; }).join("") + "</tbody></table></div>" : vazio("Sem pilotos", "A tabela aparece depois da primeira etapa lançada.");
        } else if (vis === "grupos") {
          var gs = {}; d.pilotos.forEach(function (p) { var g = p.grupo || "–"; (gs[g] = gs[g] || []).push(p); });
          var ks = Object.keys(gs).sort();
          out = ks.length ? '<div class="grupos">' + ks.map(function (g) {
            return "<section><h3>Grupo " + esc(g) + '</h3><div class="rolagem"><table style="min-width:0"><thead><tr><th>Pos</th><th>Piloto</th><th class="n">Pts</th></tr></thead><tbody>' + ordenar(gs[g]).map(function (p, i) { return '<tr><td class="p">' + (i + 1) + "</td><td>" + esc(p.nome) + '</td><td class="n"><strong>' + real(p) + "</strong></td></tr>"; }).join("") + "</tbody></table></div></section>";
          }).join("") + "</div>" : vazio("Sem grupos", "Este campeonato não tem divisão por grupos.");
        } else {
          var ct = (d.construtores || []).slice().sort(function (a, b) { return real(b) - real(a); });
          out = ct.length ? '<div class="rolagem"><table><thead><tr><th>Pos</th><th>Equipe</th><th class="n">Pts</th><th class="n">Punição</th><th class="n">Total</th></tr></thead><tbody>' + ct.map(function (t, i) { return '<tr><td class="p">' + (i + 1) + "</td><td><strong>" + esc(t.equipe) + '</strong></td><td class="n">' + t.pts + '</td><td class="n ' + (t.pun ? "neg" : "") + '">' + (t.pun || "–") + '</td><td class="n"><strong>' + real(t) + "</strong></td></tr>"; }).join("") + "</tbody></table></div>" : vazio("Construtores em breve", "Este campeonato ainda não tem tabela de equipes.");
        }
        $("#tb").innerHTML = out + '<p class="nota">' + (vis === "geral" ? "Pontos oficiais do Formula Game Companion. As punições são descontadas na última etapa, conforme o regulamento (item 12.9)." : vis === "grupos" ? "Classificação dos grupos: pontos do FGC menos punições." : "Construtores: pontos do FGC menos as punições dos pilotos titulares.") + "</p>";
      }
      var ab = abasCamp(cur, function (id) { cur = id; desenha(); });
      $("#ab").appendChild(ab);
      $("#sub").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; vis = b.getAttribute("data-v"); desenha(); });
      desenha();
    },

    calendario: function () {
      var html = '<div class="wrap"><h1>Próximas etapas</h1>';
      S.camps.forEach(function (c) {
        var cal = (c.dados.calendario || []).slice().sort(function (a, b) { return (a.data || "9999").localeCompare(b.data || "9999"); });
        var fut = cal.filter(function (e) { return e.status !== "realizada"; }), pas = cal.filter(function (e) { return e.status === "realizada"; });
        html += '<section class="sec"><div class="sec-topo"><h2>' + esc(c.nome) + "</h2></div>" + (fut.length ? '<div class="prox">' + fut.map(function (e) { return etapaCard(c, e); }).join("") + "</div>" : vazio("Sem etapas pendentes", "Temporada encerrada ou calendário ainda não divulgado."));
        if (pas.length) html += '<p class="nota"><strong>Já disputadas:</strong> ' + pas.map(function (e) { return esc(e.pista) + " (" + esc(fmtData(e.data)) + ")"; }).join(", ") + ".</p>";
        html += "</section>";
      });
      $("#app").innerHTML = html + "</div>";
    },

    jornal: function (ctx) {
      var n = ctx.noticias, f = "todas";
      $("#app").innerHTML = '<div class="wrap"><h1>Jornal DPS</h1><p class="meta">Matérias das corridas, avisos e bastidores da liga.</p><div id="ab"></div><div id="lista"></div></div>';
      var el = document.createElement("div"); el.className = "abas";
      var opts = [["todas", "Todas"]].concat(S.camps.map(function (c) { return [c.id, c.curto]; }));
      el.innerHTML = opts.map(function (o) { return '<button type="button" data-id="' + o[0] + '" aria-pressed="' + (o[0] === f) + '">' + esc(o[1]) + "</button>"; }).join("");
      $("#ab").appendChild(el);
      function desenha() {
        var l = n.filter(function (x) { return f === "todas" || x.campeonato === f; });
        $("#lista").innerHTML = l.length ? '<div class="cards">' + l.map(cardNoticia).join("") + "</div>" : vazio("Nenhuma matéria ainda", "A cobertura de cada corrida entra aqui depois da etapa.");
      }
      el.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; f = b.getAttribute("data-id"); [].forEach.call(el.children, function (x) { x.setAttribute("aria-pressed", x === b); }); desenha(); });
      desenha();
    },

    f1: function (ctx) {
      $("#app").innerHTML = '<div class="wrap"><h1>F1 real</h1><p class="meta">Resumo das notícias do campeonato de verdade, sempre com link para a fonte original.</p><div class="sec">' + (ctx.f1.length ? '<div class="linhas">' + ctx.f1.map(linhaF1).join("") + "</div>" : vazio("Sem notícias por enquanto", "Quando algo novo sair na F1, o resumo e a fonte aparecem aqui.")) + "</div></div>";
    },

    materia: function (ctx) {
      var id = qs.get("id"), n = ctx.noticias.filter(function (x) { return x.id === id; })[0];
      if (!n) { $("#app").innerHTML = '<div class="wrap">' + vazio("Matéria não encontrada", "O link pode estar incorreto.") + '<p style="text-align:center"><a class="botao" href="jornal.html">Ver o Jornal DPS</a></p></div>'; return; }
      document.title = n.titulo + " · " + (S.site.nome || "Portal DPS");
      var cor = n.campeonato ? campCor(n.campeonato) : "#10231c";
      var res = "";
      if (n.resultado && n.resultado.length) {
        res = '<div class="res"><h3>Resultado</h3><div class="rolagem"><table style="min-width:0"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th></tr></thead><tbody>' + n.resultado.map(function (r) { return '<tr><td class="p">' + esc(r.pos) + "</td><td>" + esc(r.piloto) + "</td><td>" + esc(r.equipe || "") + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
      }
      var link = location.href.split("#")[0];
      $("#app").innerHTML = '<div class="wrap"><article class="materia" style="--camp:' + cor + ";--c:" + cor + '"><span class="selo">' + esc(n.campeonato ? campNome(n.campeonato) : "DPS") + '</span> <span class="meta">' + esc(fmtData(n.data, true)) + " · " + esc(n.autor || "Redação DPS") + "</span><h1>" + esc(n.titulo) + '</h1><p class="fina">' + esc(n.linha_fina || "") + '</p><div class="corpo">' + (n.corpo || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" + res +
        '<div class="compart"><a class="botao" href="https://wa.me/?text=' + encodeURIComponent(n.titulo + " " + link) + '" rel="noopener">Compartilhar no WhatsApp</a><a class="botao claro" href="jornal.html">Mais matérias</a></div></article></div>';
    },

    estatisticas: function (ctx) {
      var st0 = ctx.stats, main = $("#app");
      var head = '<div class="wrap"><h1>Estatísticas</h1><p class="meta">Histórico da liga, a partir dos resultados registrados no Formula Game Companion.</p>';
      if (!st0 || !st0.pronto) { main.innerHTML = head + '<div class="sec">' + vazio("Histórico em construção", "Estamos reunindo os resultados de todas as temporadas. Em breve: maiores vencedores, pistas mais usadas e vencedores por pista.") + "</div></div>"; return; }
      var rec = st0.recortes || {}, st = st0;
      var bar = function (rot, v, max) { return '<div class="barra"><span>' + esc(rot) + '</span><i style="width:' + Math.round(v / max * 100) + '%"></i><b>' + v + "</b></div>"; };
      var seletor = '<label>Recorte <select id="selrec"><option value="">Todas as temporadas</option>' + Object.keys(rec).map(function (k) { return '<option value="' + esc(k) + '">' + esc(rec[k].rotulo) + "</option>"; }).join("") + "</select></label>";
      main.innerHTML = head + '<p>' + seletor + '</p><div id="corpo"></div>' + (st0.gerado_em ? '<p class="nota">Dados até ' + esc(fmtData(st0.gerado_em, true)) + ". Corridas sprint não entram. <a href=\"halldafama.html\">Hall da Fama</a></p>" : "") + "</div>";
      function desenhar() {
        var maxV = Math.max.apply(null, (st.pilotos || []).map(function (p) { return p.vitorias; }).concat([1]));
        var topV = (st.pilotos || []).slice().sort(function (a, b) { return b.vitorias - a.vitorias; }).slice(0, 10);
        var maxP = Math.max.apply(null, (st.pistas || []).map(function (p) { return p.corridas; }).concat([1]));
        var topP = (st.pistas || []).slice().sort(function (a, b) { return b.corridas - a.corridas; }).slice(0, 10);
        var h = '<div class="sec stat-grid">';
        h += '<div class="painel"><h3>Maiores vencedores</h3>' + topV.map(function (p) { return bar(p.nome, p.vitorias, maxV); }).join("") + "</div>";
        h += '<div class="painel"><h3>Pistas mais usadas</h3>' + topP.map(function (p) { return bar(p.pista, p.corridas, maxP); }).join("") + "</div>";
        h += '<div class="painel"><h3>Vencedores por pista</h3><label>Pista <select id="selp">' + (st.pistas || []).map(function (p) { return "<option>" + esc(p.pista) + "</option>"; }).join("") + '</select></label><div id="vp" style="margin-top:12px"></div></div>';
        h += '<div class="painel"><h3>Perfil do piloto</h3><label>Piloto <select id="selpil">' + (st.pilotos || []).slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (p) { return "<option>" + esc(p.nome) + "</option>"; }).join("") + '</select></label><div id="pf" style="margin-top:12px"></div></div></div>';
        $("#corpo").innerHTML = h;
        $("#selp").addEventListener("change", vp); $("#selpil").addEventListener("change", pf); vp(); pf();
      }
      function vp() {
        var p = (st.pistas || []).filter(function (x) { return x.pista === $("#selp").value; })[0]; if (!p) return;
        var m = Math.max.apply(null, p.vencedores.map(function (v) { return v.vitorias; }).concat([1]));
        $("#vp").innerHTML = '<div class="meta">' + p.corridas + " corridas disputadas</div>" + p.vencedores.slice(0, 8).map(function (v) { return bar(v.piloto, v.vitorias, m); }).join("");
      }
      function pf() {
        var p = (st.pilotos || []).filter(function (x) { return x.nome === $("#selpil").value; })[0]; if (!p) return;
        var campos = [["Corridas", p.corridas], ["Vitórias", p.vitorias], ["Pódios", p.podios], ["Poles", p.poles], ["Voltas rápidas", p.voltas_rapidas], ["Títulos", p.titulos]];
        $("#pf").innerHTML = '<table style="min-width:0"><tbody>' + campos.map(function (c) { return "<tr><td>" + c[0] + '</td><td class="n"><strong>' + (c[1] == null ? "–" : c[1]) + "</strong></td></tr>"; }).join("") + "</tbody></table>";
      }
      $("#selrec").addEventListener("change", function () { st = this.value ? rec[this.value] : st0; desenhar(); });
      desenhar();
    },

    halldafama: function (ctx) {
      var st = ctx.stats, main = $("#app");
      var head = '<div class="wrap"><h1>Hall da Fama</h1><p class="meta">Campeões e recordes de todos os tempos da DPS, segundo o Formula Game Companion.</p>';
      if (!st || !st.pronto) { main.innerHTML = head + '<div class="sec">' + vazio("Em construção", "O histórico está sendo reunido.") + "</div></div>"; return; }
      var camp = (st.campeoes || []).slice().sort(function (a, b) { return b.temporada.localeCompare(a.temporada); });
      var h = head + '<section class="sec"><h2>Campeões</h2><div class="rolagem"><table><thead><tr><th>Temporada</th><th>Campeonato</th><th>Piloto</th><th>Equipe do piloto</th><th>Construtores</th></tr></thead><tbody>' + camp.map(function (c) { return "<tr><td>" + esc(c.temporada) + "</td><td>" + esc(c.campeonato) + "</td><td><strong>" + esc(c.piloto) + "</strong></td><td>" + esc(c.equipe || "–") + "</td><td>" + esc(c.construtores || "–") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
      var ord = function (k) { return (st.pilotos || []).slice().sort(function (a, b) { return b[k] - a[k] || b.vitorias - a.vitorias; }).filter(function (p) { return p[k] > 0; }).slice(0, 10); };
      var bar = function (rot, v, max) { return '<div class="barra"><span>' + esc(rot) + '</span><i style="width:' + Math.round(v / max * 100) + '%"></i><b>' + v + "</b></div>"; };
      h += '<section class="sec"><h2>Recordes (Mundial e Elite, 2024 a 2026)</h2><div class="stat-grid">' + [["vitorias", "Vitórias"], ["podios", "Pódios"], ["poles", "Poles"], ["voltas_rapidas", "Voltas mais rápidas"]].map(function (k) { var l = ord(k[0]); var m = l.length ? l[0][k[0]] : 1; return '<div class="painel"><h3>' + k[1] + "</h3>" + l.map(function (p) { return bar(p.nome, p[k[0]], m); }).join("") + "</div>"; }).join("") + "</div></section>";
      h += '<p class="nota">Modo Carreira 1 e 2 entram só com campeão e tabela final; o detalhe etapa a etapa dos Mundiais e Elite está em <a href="estatisticas.html">Estatísticas</a>.</p></div>';
      main.innerHTML = h;
    },

    contato: function () {
      var s = S.site, canais = [];
      if (s.whatsapp) canais.push('<a class="botao" href="' + esc(safeUrl(s.whatsapp)) + '" rel="noopener">WhatsApp</a>');
      if (s.discord) canais.push('<a class="botao" href="' + esc(safeUrl(s.discord)) + '" rel="noopener">Discord</a>');
      if (s.email_contato) canais.push('<a class="botao claro" href="mailto:' + esc(s.email_contato) + '">E-mail</a>');
      if (s.instagram) canais.push('<a class="botao claro" href="' + esc(safeUrl(s.instagram)) + '" rel="noopener">Instagram</a>');
      if (s.youtube) canais.push('<a class="botao claro" href="' + esc(safeUrl(s.youtube)) + '" rel="noopener">YouTube</a>');
      var form = (s.formspree_id || s.formsubmit)
        ? '<form class="form" id="f" novalidate><label>Assunto<select name="assunto"><option>Mundiais DPS 2027: quero participar</option><option>Quero correr na DPS</option><option>Parceria ou patrocínio</option><option>Dúvida sobre os campeonatos</option><option>Outro assunto</option></select></label><label>Seu nome<input name="nome" required autocomplete="name"></label><label>Seu ID no jogo<input name="id_jogo" autocomplete="off"><span class="dica">PSN, Xbox ou o nome que aparece no F1 25.</span></label><label>Plataforma<select name="plataforma"><option>PlayStation</option><option>Xbox</option><option>PC</option></select></label><label>E-mail ou WhatsApp para retorno<input name="retorno" required></label><label>Mensagem<textarea name="mensagem" rows="5" required></textarea><span class="dica">Se quer correr, conte seu nível e há quanto tempo joga online.</span></label><input class="oculto" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true"><div><button class="botao" type="submit">Enviar mensagem</button></div><div id="msg" role="status"></div></form>'
        : '<div class="aviso erro"><strong>Formulário ainda não configurado.</strong> Preencha <code>formsubmit</code> (e-mail) ou <code>formspree_id</code> em <code>data/site.json</code> (veja o guia). Enquanto isso, use os botões acima.</div>';
      var e27 = qs.get("assunto") === "2027";
      $("#app").innerHTML = '<div class="wrap"><div style="max-width:700px"><h1>' + (e27 ? "Mundiais DPS 2027" : "Fale conosco") + '</h1><p style="font-family:var(--body);font-size:20px">' + (e27 ? "Quer entrar no grid de 2027? Conte quem você é e como corre, e a liga responde com os próximos passos." : "Quer correr na Drive Pro Series, propor uma parceria ou tirar uma dúvida? Escreva para a liga.") + "</p>" + (canais.length ? '<div class="canais">' + canais.join("") + "</div>" : "") + form + "</div></div>";
      var f = $("#f"); if (!f) return;
      if (qs.get("assunto") === "2027") { var sel = f.querySelector("select[name=assunto]"); if (sel) sel.selectedIndex = 0; }
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var m = $("#msg"), dados = {}; new FormData(f).forEach(function (v, k) { dados[k] = v; });
        if (dados._gotcha) return;
        if (!dados.nome || !dados.retorno || !dados.mensagem) { m.className = "aviso erro"; m.textContent = "Preencha nome, contato para retorno e mensagem."; return; }
        m.className = "aviso"; m.textContent = "Enviando…";
        (s.formspree_id ? fetch("https://formspree.io/f/" + encodeURIComponent(s.formspree_id), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(dados) })
          : fetch("https://formsubmit.co/ajax/" + s.formsubmit, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.assign({ _subject: "Portal DPS: " + (dados.assunto || "novo contato"), _captcha: "false", _template: "table" }, dados)) }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === "false" || j.success === false) throw 0; return r; }); }))
          .then(function (r) { if (!r.ok) throw 0; f.reset(); m.className = "aviso"; m.textContent = "Mensagem enviada. A liga responde pelo contato que você informou."; })
          .catch(function () { m.className = "aviso erro"; m.textContent = "Não foi possível enviar agora. Tente de novo ou use um dos botões acima."; });
      });
    }
  };

  /* ---------- início ---------- */
  carregar().then(function () {
    return Promise.all([getJSON("noticias", true), getJSON("f1", true), (PAGE === "estatisticas" || PAGE === "halldafama") ? getJSON("stats", true) : null]);
  }).then(function (r) {
    var ctx = { noticias: (r[0] || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }), f1: (r[1] || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }), stats: r[2] };
    montarTopo(ctx.noticias); montarRodape();
    if (paginas[PAGE]) paginas[PAGE](ctx);
    contador();
  }).catch(function (e) { $("#app").innerHTML = '<div class="wrap">' + vazio("Não foi possível carregar o site", "Se você abriu o arquivo direto do computador, use o abrir_site_local.bat.") + "</div>"; if (window.console) console.error(e); });
})();
