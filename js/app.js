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
  var MENU = [["index.html", "Início", "home"], ["jornal.html", "Jornal DPS", "jornal"], ["tabelas.html", "Tabelas", "tabelas"], ["calendario.html", "Próximas etapas", "calendario"], ["lastro.html", "Lastro", "lastro"], ["regulamento.html", "Regulamento 2027", "regulamento"], ["inscricoes.html", "Inscrições 2027", "inscricoes"], ["contato.html", "Fale conosco", "contato"]];
  var MAIS = [["f1.html", "F1 real", "f1"], ["estatisticas.html", "Estatísticas", "estatisticas"], ["halldafama.html", "Hall da Fama", "halldafama"], ["incidentes.html", "Decisões de incidentes", "incidentes"], ["sorteio.html", "Sorteio 2027", "sorteio"], ["pedido.html", "Pedido de análise", "pedido"]];
  function montarTopo(noticias) {
    var lnk = function (m) { return '<a href="' + m[0] + '"' + (m[2] === PAGE || (PAGE === "materia" && m[2] === "jornal") ? ' aria-current="page"' : "") + ">" + m[1] + "</a>"; };
    var maisAtivo = MAIS.some(function (m) { return m[2] === PAGE; });
    var nav = MENU.map(lnk).join("") + '<details class="mais"' + (maisAtivo ? ' data-ativo="1"' : "") + "><summary>Mais</summary><div>" + MAIS.map(lnk).join("") + "</div></details>";
    var ult = noticias[0];
    var plantao = ult ? '<div class="plantao"><div class="wrap"><b>ÚLTIMA</b><a href="materia.html?id=' + encodeURIComponent(ult.id) + '">' + esc(ult.titulo) + "</a></div></div>" : "";
    var demo = DEMO ? '<div class="demo-aviso">Modo demonstração: textos, notícias e estatísticas desta visualização são de exemplo. <a href="?demo=0" style="color:#fff">Sair</a></div>' : "";
    $("#topo").innerHTML = demo + '<header class="topo"><div class="wrap"><a class="marca" href="index.html">DPS<span>.</span>Portal</a><nav class="menu" aria-label="Principal">' + nav + "</nav></div></header>" + plantao;
  }
  var IG = '<svg class="ig-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
  function montarRodape() {
    var s = S.site, links = [];
    if (s.youtube) links.push('<a href="' + esc(safeUrl(s.youtube)) + '" rel="noopener">YouTube da DPS</a>');
    if (s.instagram) links.push('<a class="ig" href="' + esc(safeUrl(s.instagram)) + '" rel="noopener" aria-label="Instagram da DPS">' + IG + "Instagram</a>");
    $("#rodape").innerHTML = '<footer class="rodape"><div class="wrap"><div><strong style="font-family:var(--head);font-size:22px;color:#fff">' + esc(s.nome || "Portal DPS") + "</strong><br>" + esc(s.slogan || "") + "<br>" + links.concat(['<a href="privacidade.html">Privacidade</a>']).concat(adsCfg() ? ['<a href="#" id="cookies-pref">Cookies</a>'] : []).join(" · ") + '</div><div class="visitas">Visitas <b id="visitas">…</b></div></div></footer>';
  }
  function contador() {
    var c = S.site.contador, el = $("#visitas");
    if (!c || !el) { if (el) el.parentNode.style.display = "none"; return; }
    var local = /^(localhost|127\.0\.0\.1|)$/.test(location.hostname);
    var jaContou = false; try { jaContou = sessionStorage.getItem("dpsVisita") === "1"; } catch (e) {}
    var soLer = local || jaContou || DEMO;
    var ns = encodeURIComponent(c.namespace), ch = encodeURIComponent(c.chave);
    var fontes = [
      { url: "https://abacus.jasoncameron.dev/" + (soLer ? "get/" : "hit/") + ns + "/" + ch, ler: function (j) { return j && j.value; } },
      { url: "https://api.counterapi.dev/v1/" + ns + "/" + ch + (soLer ? "" : "/up"), ler: function (j) { return j && j.count; } }
    ];
    function tenta(i) {
      if (i >= fontes.length) { el.textContent = "–"; return; }
      fetch(fontes[i].url).then(function (r) { return r.json(); }).then(function (j) {
        var n = fontes[i].ler(j);
        if (typeof n === "number") { el.textContent = n.toLocaleString("pt-BR"); try { sessionStorage.setItem("dpsVisita", "1"); } catch (e) {} }
        else tenta(i + 1);
      }).catch(function () { tenta(i + 1); });
    }
    tenta(0);
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
    var selo = n.campeonato ? '<span class="selo" style="--c:' + cor + '">' + esc(campNome(n.campeonato) + (n.tipo === "expectativa" ? " · Expectativa" : "")) + "</span> " : '<span class="selo" style="--c:#10231c">DPS</span> ';
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

  /* ---------- publicidade (Google AdSense) ---------- */
  /* Só liga quando data/site.json tem adsense.cliente ("ca-pub-..."). O script do Google só é carregado depois da escolha do visitante no aviso de cookies. */
  var ADS_PAGES = { home: 1, jornal: 1, f1: 1, materia: 1 };
  function adsCfg() { var a = (S.site && S.site.adsense) || {}; return /^ca-pub-\d{8,20}$/.test(a.cliente || "") ? a : null; }
  function escolhaCookies() { try { return localStorage.getItem("dps_cookies"); } catch (e) { return null; } }
  function guardaCookies(v) { try { localStorage.setItem("dps_cookies", v); } catch (e) {} }
  function slotAnuncio(a, nome) {
    var slot = (a.slots || {})[nome];
    return '<aside class="anuncio" aria-label="Publicidade"><span>Publicidade</span><ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(a.cliente) + '"' + (slot ? ' data-ad-slot="' + esc(slot) + '" data-ad-format="auto" data-full-width-responsive="true"' : "") + "></ins></aside>";
  }
  function iniciarAds(a, personalizados) {
    if (window.__dpsAds) return; window.__dpsAds = 1;
    window.adsbygoogle = window.adsbygoogle || [];
    if (!personalizados) window.adsbygoogle.requestNonPersonalizedAds = 1;
    var sc = document.createElement("script"); sc.async = true; sc.crossOrigin = "anonymous";
    sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(a.cliente);
    sc.onload = function () { [].forEach.call(document.querySelectorAll("ins.adsbygoogle[data-ad-slot]"), function () { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} }); };
    document.head.appendChild(sc);
  }
  function avisoCookies(a) {
    var b = document.createElement("div"); b.className = "cookies"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Aviso de cookies");
    b.innerHTML = '<p>Este site usa cookies do Google AdSense para mostrar anúncios. Você pode aceitar anúncios personalizados ou ficar só com os não personalizados. <a href="privacidade.html">Política de privacidade</a></p><div><button type="button" class="botao" data-v="sim">Aceitar</button><button type="button" class="botao claro" data-v="nao">Só não personalizados</button></div>';
    b.addEventListener("click", function (ev) { var t = ev.target.closest("button"); if (!t) return; guardaCookies(t.getAttribute("data-v")); b.remove(); iniciarAds(a, t.getAttribute("data-v") === "sim"); });
    document.body.appendChild(b);
  }
  function anuncios() {
    var a = adsCfg(); if (!a || !ADS_PAGES[PAGE]) return; /* só nas páginas de conteúdo: nada em formulários */
    var app = $("#app .wrap"), sl = a.slots || {};
    if (app) { /* blocos manuais só quando o ID do bloco existe; sem ID valem os anúncios automáticos do AdSense */
      if (PAGE === "home" && sl.meio) { var secs = app.querySelectorAll(".sec"); if (secs[2]) secs[2].insertAdjacentHTML("beforebegin", slotAnuncio(a, "meio")); }
      if (sl.fim) app.insertAdjacentHTML("beforeend", slotAnuncio(a, "fim"));
    }
    var e = escolhaCookies();
    if (e) iniciarAds(a, e === "sim"); else avisoCookies(a);
  }

  /* ---------- páginas ---------- */
  var paginas = {
    home: function (ctx) {
      var n = ctx.noticias, main = $("#app");
      var dest = n[0], cp = S.camps[0];
      var capa = dest
        ? '<a class="destaque" style="--c:' + (dest.campeonato ? campCor(dest.campeonato) : "#10231c") + '" href="materia.html?id=' + encodeURIComponent(dest.id) + '"><span class="selo">' + esc((dest.campeonato ? campNome(dest.campeonato) : "DPS") + (dest.tipo === "expectativa" ? " · Expectativa" : "")) + '</span> <span class="meta">' + esc(fmtData(dest.data, true)) + "</span><h1>" + esc(dest.titulo) + "</h1><p>" + esc(dest.linha_fina || "") + "</p></a>"
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
      $("#app").innerHTML = '<div class="wrap"><article class="materia" style="--camp:' + cor + ";--c:" + cor + '"><span class="selo">' + esc((n.campeonato ? campNome(n.campeonato) : "DPS") + (n.tipo === "expectativa" ? " · Expectativa" : "")) + '</span> <span class="meta">' + esc(fmtData(n.data, true)) + " · " + esc(n.autor || "Redação DPS") + "</span><h1>" + esc(n.titulo) + '</h1><p class="fina">' + esc(n.linha_fina || "") + '</p><div class="corpo">' + (n.corpo || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" + res +
        '<div class="compart"><a class="botao" href="https://wa.me/?text=' + encodeURIComponent(n.titulo + " " + link) + '" rel="noopener">Compartilhar no WhatsApp</a><a class="botao claro" href="jornal.html">Mais matérias</a></div></article></div>';
    },

    privacidade: function () {
      var s = S.site, mail = esc(s.email_contato || s.formsubmit || "");
      $("#app").innerHTML = '<div class="wrap"><div class="texto" style="max-width:760px"><h1>Política de privacidade</h1><p class="meta">Atualizada em 28/10/2026</p>' +
        "<p>O Portal DPS é o site da Drive Pro Series (DPS), liga de automobilismo virtual. Esta página explica quais dados o site usa e como falar com a liga sobre eles, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>" +
        "<h2>Quais dados coletamos</h2><ul>" +
        "<li><strong>Formulários</strong> (Fale conosco, Inscrições e Pedido de análise): nome, nome no jogo, contato para retorno, mensagem e, no pedido de análise, o vídeo enviado. Usamos esses dados só para responder, avaliar inscrições e analisar incidentes da liga.</li>" +
        "<li><strong>Contador de visitas</strong>: um número agregado de acessos, sem identificar o visitante.</li>" +
        "<li><strong>Fontes do Google Fonts</strong>: o navegador baixa as fontes dos servidores do Google, que podem registrar o endereço IP.</li></ul>" +
        "<h2>Publicidade e cookies</h2><p>O site pode exibir anúncios do Google AdSense. O Google e seus parceiros usam cookies e identificadores para mostrar e medir anúncios, inclusive anúncios baseados em visitas anteriores a este e a outros sites. Antes de carregar os anúncios, o site pede sua escolha: aceitar anúncios personalizados ou ver apenas não personalizados. Você pode mudar a escolha a qualquer momento no link “Cookies” do rodapé.</p>" +
        '<p>Para saber como o Google usa dados de sites parceiros, veja <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a>. Para desativar a personalização de anúncios, use as <a href="https://adssettings.google.com" rel="noopener">Configurações de anúncios do Google</a>.</p>' +
        "<h2>Com quem compartilhamos</h2><p>Não vendemos dados. Os formulários passam por serviços de envio de e-mail e armazenamento (FormSubmit, Google Apps Script e Google Drive) apenas para chegar à comissão da liga.</p>" +
        "<h2>Seus direitos</h2><p>Você pode pedir acesso, correção ou exclusão dos dados que enviou, e retirar o consentimento quando quiser, escrevendo para <a href=\"mailto:" + mail + '">' + mail + "</a> ou pela página <a href=\"contato.html\">Fale conosco</a>.</p></div></div>";
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

    regulamento: function () {
      var main = $("#app");
      main.innerHTML = '<div class="wrap"><h1>Regulamento 2027</h1><p class="meta">Regras do Mundial DPS 2027: grupos, duplas, calendário, lastro, pontuação e incidentes. Versão em rascunho, em avaliação pelos capitães.</p>' +
        '<p><a class="botao" href="regulamento/Regulamento_Mundial_DPS_2027.pdf" download>Baixar PDF</a> <a class="botao claro" href="regulamento/leitura-2027.html">Abrir em tela cheia</a></p>' +
        '<iframe title="Regulamento Mundial DPS 2027" src="regulamento/leitura-2027.html" style="width:100%;height:80vh;min-height:480px;border:1px solid var(--linha,#ccc);border-radius:6px;background:#0a0a0c" loading="lazy"></iframe></div>';
    },

    lastro: function (ctx) {
      var main = $("#app"), L = ctx.lastro || {}, cfg = L.campeonatos || {};
      var head = '<div class="wrap"><h1>Lastro</h1><p class="meta">' + esc(L.regra || "O líder do campeonato corre com o pior carro e o último colocado com o melhor, dois pilotos por carro.") + "</p>";
      var ids = S.camps.filter(function (c) { return cfg[c.id] && (cfg[c.id].ordem_ea || []).length; }).map(function (c) { return c.id; });
      if (!L.ativo || !ids.length) {
        main.innerHTML = head + '<div class="sec">' + vazio("Tabela de lastro ainda não publicada", "Ela aparece aqui antes de cada etapa, com a ordem dos carros da EA e a distribuição dos pilotos.") + "</div></div>"; return;
      }
      main.innerHTML = head + '<div id="abas"></div><div id="corpo"></div><p class="nota">' + (L.atualizado_em ? "Atualizado em " + esc(fmtData(L.atualizado_em, true)) + ". " : "") + "Pontos do Formula Game Companion, sem desconto de punições (item 12.9)." + (L.fonte ? " Ordem dos carros: " + esc(L.fonte) + "." : "") + ' <a href="regulamento.html">Regulamento 2027</a></p></div>';
      function desenhar(id) {
        var c = S.camps.filter(function (x) { return x.id === id; })[0], k = cfg[id], ordem = k.ordem_ea, extra = {};
        Object.keys(k.las_extra || {}).forEach(function (n) { extra[n.toLowerCase()] = k.las_extra[n]; });
        var pil = (c.dados.pilotos || []).map(function (p) { var e = extra[(p.nome || "").toLowerCase()] || 0; return { nome: p.nome, pts: p.pts || 0, extra: e, las: (p.pts || 0) + e }; })
          .map(function (p, i) { p.i = i; return p; }).sort(function (a, b) { return b.las - a.las || b.pts - a.pts || a.i - b.i; });
        var prox = proximaEtapa(c), igual = prox && (prox.tipos || []).indexOf("desempenho_igual") >= 0;
        var semLastro = prox && (L.sem_lastro || []).indexOf(prox.pista) >= 0;
        var h = "";
        if (prox) h += '<div class="aviso" style="margin:14px 0"><strong>Próxima etapa: ' + esc(prox.pista) + (prox.n ? " (etapa " + prox.n + ")" : "") + "</strong>" + (prox.data ? " · " + esc(fmtData(prox.data, true)) : "") + (igual ? "<br>Etapa de desempenho igual: todos usam o mesmo desempenho." : "") + (semLastro ? "<br>Etapa sem lastro: todos correm com o desempenho igual." : "") + "</div>";
        if (!igual && !semLastro) {
          if (pil.length > ordem.length * 2) h += '<div class="aviso erro">Há mais pilotos do que vagas nos carros. Confira a lista.</div>';
          var temExtra = pil.some(function (p) { return p.extra; });
          h += '<div class="rolagem"><table><thead><tr><th>Carro (do pior ao melhor)</th><th>Piloto</th><th>Pos.</th><th>Pontos' + (temExtra ? " p/ lastro" : "") + "</th></tr></thead><tbody>" +
            ordem.map(function (nome, i) {
              var g = pil.slice(i * 2, i * 2 + 2); if (!g.length) g = [null];
              return g.map(function (p, kx) { return "<tr>" + (kx === 0 ? '<td rowspan="' + g.length + '"><strong>' + (i + 1) + "º · " + esc(nome) + "</strong></td>" : "") + "<td>" + (p ? esc(p.nome) : "–") + "</td><td>" + (p ? (i * 2 + kx + 1) + "º" : "–") + "</td><td>" + (p ? p.las + (p.extra ? ' <small title="' + p.pts + " + " + p.extra + ' extras">(' + p.pts + " + " + p.extra + ")</small>" : "") : "–") + "</td></tr>"; }).join("");
            }).join("") + "</tbody></table></div>";
          if (temExtra) h += '<p class="nota">Pontos extras de lastro: ' + pil.filter(function (p) { return p.extra; }).map(function (p) { return esc(p.nome) + " (+" + p.extra + ")"; }).join(", ") + ".</p>";
        }
        $("#corpo").innerHTML = h;
      }
      var sel = ids[0];
      if (ids.length > 1) {
        var ab = $("#abas"); ab.className = "abas"; ab.setAttribute("role", "group"); ab.setAttribute("aria-label", "Campeonato");
        ab.innerHTML = ids.map(function (id) { var c = S.camps.filter(function (x) { return x.id === id; })[0]; return '<button type="button" data-id="' + esc(id) + '" style="--c:' + c.cor + '" aria-pressed="' + (id === sel) + '">' + esc(c.nome) + "</button>"; }).join("");
        ab.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; [].forEach.call(ab.children, function (x) { x.setAttribute("aria-pressed", x === b); }); desenhar(b.getAttribute("data-id")); });
      }
      desenhar(sel);
    },

    sorteio: function (ctx) {
      var main = $("#app"), D = ctx.sorteio || {}, res = D.resultado;
      var nomesIni = (D.pilotos || []).join("\n");
      var h = '<div class="wrap"><h1>Sorteio das duplas 2027</h1><p class="meta">Cada piloto tem um Índice de Nível (IN), de 1 a 22. Grupo A (IN 1 a 6) forma dupla com D (17 a 22), e B (7 a 11) com C (12 a 16). A soma do IN da dupla precisa ficar entre 20 e 26. Se alguma dupla ficar fora, o sorteio é refeito; depois de 10 sorteios inválidos usa-se o pareamento espelho (Anexo A do regulamento).</p>';
      if (res && res.length) h += '<section class="sec"><h2>Resultado oficial' + (D.realizado_em ? " · " + esc(fmtData(D.realizado_em, true)) : "") + "</h2>" + tabelaDuplas(res) + "</section>";
      h += '<section class="sec"><h2>Sorteio ao vivo</h2><div class="sorteio-grid"><div><label for="nomes"><strong>Pilotos em ordem de IN</strong> (um por linha, do 1 ao 22)</label><textarea id="nomes" rows="22" spellcheck="false" placeholder="1º piloto&#10;2º piloto&#10;…">' + esc(nomesIni) + '</textarea><p class="nota">Cole aqui a lista publicada no ranking de IN. O sorteio roda no seu navegador e não é salvo. O resultado oficial é o que a Direção publica nesta página.</p><div><button type="button" class="botao" id="sortear">Sortear agora</button> <button type="button" class="botao claro" id="copiar" hidden>Copiar resultado</button></div></div><div id="saida" aria-live="polite"><div class="vazio"><b>Aguardando o sorteio</b>Preencha a lista e clique em Sortear agora.</div></div></div></section></div>';
      main.innerHTML = h;
      function rnd(n) { var a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n; do { crypto.getRandomValues(a); } while (a[0] >= lim); return a[0] % n; }
      function emb(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
      function tabelaDuplas(r) {
        return '<div class="rolagem"><table><thead><tr><th>Equipe</th><th>Piloto 1 (IN)</th><th>Piloto 2 (IN)</th><th>Soma</th></tr></thead><tbody>' + r.map(function (d, i) { var ok = d.soma >= d.min && d.soma <= d.max; return "<tr><td>" + (i + 1) + "</td><td>" + esc(d.a) + " (" + d.ia + ")</td><td>" + esc(d.b) + " (" + d.ib + ")</td><td><strong>" + d.soma + '</strong>' + (ok ? "" : " · espelho") + "</td></tr>"; }).join("") + "</tbody></table></div>";
      }
      function calcular(nomes) {
        var n = nomes.length, a = Math.ceil(n / 4), b = n / 2 - a, ideal = n + 1, min = ideal - 3, max = ideal + 3;
        var A = [], B = [], C = [], Dg = [];
        for (var i = 1; i <= n; i++) { if (i <= a) A.push(i); else if (i <= a + b) B.push(i); else if (i <= a + 2 * b) C.push(i); else Dg.push(i); }
        function montar(par) { return par.map(function (p) { return { a: nomes[p[0] - 1], ia: p[0], b: nomes[p[1] - 1], ib: p[1], soma: p[0] + p[1], min: min, max: max }; }); }
        var log = [], tent = 0;
        while (tent < 10) {
          tent++;
          var d = emb(Dg), c = emb(C), par = A.map(function (x, k) { return [x, d[k]]; }).concat(B.map(function (x, k) { return [x, c[k]]; }));
          var falhas = par.filter(function (p) { return p[0] + p[1] < min || p[0] + p[1] > max; });
          if (!falhas.length) { return { res: montar(par), tent: tent, espelho: false, log: log, min: min, max: max }; }
          log.push({ t: tent, falhas: falhas.map(function (p) { return p[0] + "+" + p[1] + "=" + (p[0] + p[1]); }) });
        }
        var esp = A.map(function (x, k) { return [x, Dg[Dg.length - 1 - k]]; }).concat(B.map(function (x, k) { return [x, C[C.length - 1 - k]]; }));
        return { res: montar(esp), tent: 10, espelho: true, log: log, min: min, max: max };
      }
      var txt = "";
      $("#sortear").addEventListener("click", function () {
        var nomes = $("#nomes").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var out = $("#saida"), cp = $("#copiar"); cp.hidden = true;
        if (nomes.length < 4 || nomes.length % 2) { out.innerHTML = '<div class="aviso erro">Informe uma quantidade par de pilotos (mínimo 4). Para 22 pilotos o sorteio usa 11 equipes.</div>'; return; }
        if (new Set(nomes.map(function (s) { return s.toLowerCase(); })).size !== nomes.length) { out.innerHTML = '<div class="aviso erro">Há nomes repetidos na lista.</div>'; return; }
        var r = calcular(nomes), btn = $("#sortear"); btn.disabled = true;
        var reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, passo = reduz ? 0 : 900;
        var linhas = [];
        out.innerHTML = '<p class="meta" id="st">Sorteando…</p><div class="rolagem"><table><thead><tr><th>Equipe</th><th>Piloto 1 (IN)</th><th>Piloto 2 (IN)</th><th>Soma</th></tr></thead><tbody id="tb"></tbody></table></div><div id="fim"></div>';
        var i = 0;
        (function prox() {
          if (i < r.res.length) {
            var d = r.res[i]; $("#tb").insertAdjacentHTML("beforeend", '<tr class="novo"><td>' + (i + 1) + "</td><td>" + esc(d.a) + " (" + d.ia + ")</td><td>" + esc(d.b) + " (" + d.ib + ")</td><td><strong>" + d.soma + "</strong></td></tr>");
            linhas.push("Equipe " + (i + 1) + ": " + d.a + " + " + d.b + " (soma " + d.soma + ")"); i++;
            setTimeout(prox, passo);
          } else {
            var inv = r.log.length;
            $("#st").textContent = r.espelho ? "Pareamento espelho aplicado." : "Sorteio válido.";
            $("#fim").innerHTML = '<div class="aviso">' + (r.espelho ? "Depois de 10 sorteios inválidos seguidos, a Direção usa o pareamento espelho (1+" + nomes.length + ", 2+" + (nomes.length - 1) + " e assim por diante)." : "Sorteio válido na " + r.tent + "ª tentativa" + (inv ? " (" + inv + (inv === 1 ? " sorteio inválido foi descartado" : " sorteios inválidos foram descartados") + ")" : "") + ".") + " Faixa aceita para a soma: " + r.min + " a " + r.max + ".</div>" +
              (inv ? '<details class="mini"><summary>Sorteios descartados</summary><ul>' + r.log.map(function (l) { return "<li>Tentativa " + l.t + ": fora da faixa em " + esc(l.falhas.join(", ")) + "</li>"; }).join("") + "</ul></details>" : "");
            txt = "Sorteio das duplas DPS 2027\n" + linhas.join("\n") + "\n" + (r.espelho ? "Pareamento espelho." : "Sorteio válido na " + r.tent + "ª tentativa.");
            cp.hidden = false; btn.disabled = false;
          }
        })();
      });
      $("#copiar").addEventListener("click", function () {
        var b = this;
        function ok() { b.textContent = "Copiado"; setTimeout(function () { b.textContent = "Copiar resultado"; }, 1800); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { window.prompt("Copie o texto:", txt); });
        else window.prompt("Copie o texto:", txt);
      });
    },

    incidentes: function (ctx) {
      var main = $("#app"), L = (ctx.incidentes || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || "") || (b.etapa || 0) - (a.etapa || 0); });
      var head = '<div class="wrap"><h1>Decisões de incidentes</h1><p class="meta">Análises dos incidentes de cada etapa, com a regra aplicada e a decisão da Direção. A análise é feita com os critérios da F1 real e as punições da DPS (regulamento, item 12). Na fase de teste, a IA apoia a análise e não decide.</p><p><a class="botao" href="pedido.html">Fazer pedido de análise ou enviar defesa</a></p>';
      if (!L.length) { main.innerHTML = head + '<div class="sec">' + vazio("Nenhum incidente publicado ainda", "As decisões aparecem aqui depois de cada etapa em que houver pedido de análise.") + "</div></div>"; return; }
      var campos = Array.from(new Set(L.map(function (x) { return x.campeonato; }).filter(Boolean)));
      var h = head + '<div class="abas" id="fil" role="group" aria-label="Filtrar">' + ['todos'].concat(campos).map(function (k) { return '<button type="button" data-k="' + esc(k) + '" aria-pressed="' + (k === "todos") + '" style="--c:' + (k === "todos" ? "#10231c" : campCor(k)) + '">' + esc(k === "todos" ? "Todos" : (campNome(k) || k)) + "</button>"; }).join("") + '</div><div id="lista"></div><p class="nota">Dúvidas sobre uma decisão: fale com o capitão da sua equipe. Ele leva o assunto ao Diretor do Grid.</p></div>';
      main.innerHTML = h;
      function desenhar(k) {
        $("#lista").innerHTML = L.filter(function (x) { return k === "todos" || x.campeonato === k; }).map(function (x) {
          var punido = x.decisao && !/sem (a[cç][aã]o|puni)/i.test(x.decisao);
          return '<article class="inc ' + (punido ? "pun" : "") + '" style="--c:' + campCor(x.campeonato) + '"><div class="camp">' + esc(campNome(x.campeonato) || x.campeonato || "") + (x.etapa ? " · etapa " + esc(x.etapa) : "") + (x.pista ? " · " + esc(x.pista) : "") + (x.volta ? " · volta " + esc(x.volta) : "") + '</div><h3>' + esc(x.titulo || (x.acusado ? x.acusador + " × " + x.acusado : "Incidente")) + '</h3>' +
            (x.resumo ? "<p>" + esc(x.resumo) + "</p>" : "") + (x.analise ? '<p><strong>Análise:</strong> ' + esc(x.analise) + "</p>" : "") + (x.regra ? '<p class="nota"><strong>Regra:</strong> ' + esc(x.regra) + "</p>" : "") + (x.alerta ? '<div class="aviso" style="margin:10px 0"><strong>Alerta:</strong> ' + esc(x.alerta) + "</div>" : "") +
            '<div class="decisao"><span class="tag">' + esc(x.decisao || "Em análise") + "</span>" + (x.punicao ? " <b>" + esc(x.punicao) + "</b>" : "") + "</div></article>";
        }).join("") || vazio("Nada por aqui", "Nenhum incidente desse campeonato.");
      }
      desenhar("todos");
      $("#fil").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; [].forEach.call($("#fil").children, function (x) { x.setAttribute("aria-pressed", x === b); }); desenhar(b.getAttribute("data-k")); });
    },

    inscricoes: function () {
      var s = S.site, ins = s.inscricoes || {}, main = $("#app");
      var head = '<div class="wrap"><div style="max-width:700px"><h1>Inscrições 2027</h1><p style="font-family:var(--body);font-size:20px">Mundial DPS 2027: 22 vagas, 11 duplas e 24 etapas no calendário da F1 real. Leia o <a href="regulamento.html">regulamento</a> antes de se inscrever. Toda inscrição passa por uma comissão da DPS e pode ser aceita ou recusada.</p>';
      if (ins.abertas === false) { main.innerHTML = head + '<div class="aviso"><strong>Inscrições encerradas.</strong> ' + esc(ins.mensagem || "Fale com a liga para entrar na lista de espera.") + ' <a href="contato.html">Fale conosco</a></div></div></div>'; return; }
      if (!(s.formspree_id || s.formsubmit)) { main.innerHTML = head + '<div class="aviso erro"><strong>Formulário ainda não configurado.</strong> Veja o guia.</div></div></div>'; return; }
      main.innerHTML = head + (ins.prazo ? '<div class="aviso" style="margin:12px 0"><strong>Prazo:</strong> ' + esc(ins.prazo) + "</div>" : "") +
        '<form class="form" id="f" novalidate><label>Nome completo<input name="nome" required autocomplete="name"></label><label>Nome que aparece no jogo<input name="id_jogo" required autocomplete="off"><span class="dica">PSN, Xbox ou o nome que aparece no F1 25.</span></label><label>Plataforma<select name="plataforma"><option>PlayStation</option><option>Xbox</option><option>PC</option></select></label><label>E-mail ou WhatsApp para retorno<input name="retorno" required></label><label>Cidade e estado<input name="cidade" autocomplete="address-level2"></label><label>Campeonato que quer disputar<select name="campeonato"><option>Mundial DPS</option><option>Mundial DPS Elite</option><option>Os dois</option></select></label><label>Há quanto tempo corre online?<select name="tempo"><option>Menos de 1 ano</option><option>1 a 3 anos</option><option>Mais de 3 anos</option></select></label><label>Já correu em outras ligas?<textarea name="ligas" rows="3"></textarea><span class="dica">Cite as ligas, os campeonatos e os resultados que lembrar. Se for da DPS, informe seu grupo em 2026.</span></label><label>Qual seu melhor tempo em Bahrein (se já tiver)?<input name="tempo_bahrein" placeholder="1:32.456"></label><label class="chk"><input type="checkbox" name="regulamento" required> Li o regulamento de 2027 e concordo com ele.</label><label class="chk"><input type="checkbox" name="imagem"> Autorizo o uso da minha imagem nas transmissões da liga (se eu disponibilizar).</label><input class="oculto" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true"><div><button class="botao" type="submit">Enviar inscrição</button></div><div id="msg" role="status"></div></form></div></div>';
      var f = $("#f");
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var m = $("#msg"), dados = {};
        if (f.elements._gotcha.value) return;
        if (!f.nome.value.trim() || !f.id_jogo.value.trim() || !f.retorno.value.trim()) { m.className = "aviso erro"; m.textContent = "Preencha nome, nome no jogo e contato."; return; }
        if (!f.regulamento.checked) { m.className = "aviso erro"; m.textContent = "Marque que leu e concorda com o regulamento."; return; }
        [].forEach.call(f.elements, function (el) { if (el.name && el.name !== "_gotcha") dados[el.name] = el.type === "checkbox" ? (el.checked ? "sim" : "não") : el.value; });
        dados.assunto = "Inscrição Mundial DPS 2027";
        m.className = "aviso"; m.textContent = "Enviando…";
        (s.formspree_id ? fetch("https://formspree.io/f/" + encodeURIComponent(s.formspree_id), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(dados) })
          : fetch("https://formsubmit.co/ajax/" + s.formsubmit, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.assign({ _subject: "Portal DPS: Inscrição 2027 - " + dados.nome, _captcha: "false", _template: "table" }, dados)) }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === "false" || j.success === false) throw 0; return r; }); }))
          .then(function (r) { if (!r.ok) throw 0; f.reset(); m.className = "aviso"; m.textContent = "Inscrição enviada. A comissão da DPS responde pelo contato que você informou."; })
          .catch(function () { m.className = "aviso erro"; m.textContent = "Não foi possível enviar agora. Tente de novo ou fale com a liga pelo WhatsApp."; });
      });
    },

    pedido: function () {
      var s = S.site, p = s.pedido || {}, main = $("#app"), url = p.apps_script_url || "", maxmb = p.max_mb || 600;
      var grids = S.camps.filter(function (c) { return c.id === "mundial" || c.id === "elite"; });
      var head = '<div class="wrap"><div style="max-width:700px"><h1>Pedido de análise</h1><p style="font-family:var(--body);font-size:20px">Envie aqui o pedido de análise de incidente ou o vídeo de defesa. O vídeo e o relato seguem juntos para a Comissão de Análise.</p>' +
        '<div class="aviso" style="margin:12px 0"><strong>Prazos:</strong> pedido de análise em até 24 horas após a corrida; vídeo de defesa em até 5 dias após a corrida (se você não gravou, marque a opção \"não tenho vídeo de defesa\"). Envie o <strong>arquivo</strong> do vídeo (link do YouTube não vale). Veja o <a href="regulamento.html">regulamento</a>, capítulo 12 e Anexo E.</div>';
      if (!url) { main.innerHTML = head + '<div class="aviso erro"><strong>Envio ainda não configurado.</strong> Enquanto isso, mande o pedido ao capitão da sua equipe, como de costume.</div></div></div>'; return; }
      main.innerHTML = head +
        '<form class="form" id="f" novalidate><div class="chk"><label><input type="radio" name="tipo" value="acusacao" checked> Pedido de análise (acusação)</label> <label><input type="radio" name="tipo" value="defesa"> Vídeo de defesa</label></div>' +
        '<label>Grid<select name="grid">' + grids.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.curto) + "</option>"; }).join("") + "</select></label>" +
        '<label>Pista<select name="pista" required></select></label><label>Volta do incidente<input name="volta" inputmode="numeric" required autocomplete="off"></label>' +
        '<label>Você (piloto que está enviando)<select name="solicitante" required></select></label><label>Outro piloto envolvido<select name="envolvido" required></select></label>' +
        '<label>Relato curto do que aconteceu (do seu ponto de vista)<textarea name="relato" rows="4" maxlength="1500" required></textarea></label>' +
        '<label class="chk" id="semv" hidden><input type="checkbox" name="semvideo"> Não gravei / não tenho vídeo de defesa. A análise será feita só com o vídeo da acusação.</label>' +
        '<label id="lvid">Vídeo do trecho (arquivo)<input type="file" name="video" accept="video/*" required><span class="dica">Uns 5 segundos antes e 5 depois do contato, tela inteira, sem narração, celular na horizontal. Máximo ' + maxmb + ' MB.</span></label>' +
        '<label class="chk"><input type="checkbox" name="ok"> Declaro que o vídeo foi gravado por mim, na câmera que usei na corrida.</label>' +
        '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
        '<div id="barra" class="progresso" hidden><div></div></div><button class="botao" type="submit" id="env">Enviar</button><div id="msg" class="aviso" role="status" aria-live="polite" hidden></div></form></div></div>';
      var f = $("#f"), m = $("#msg"), barra = $("#barra"), btn = $("#env"), enviando = false;
      function preencher() {
        var g = grids.filter(function (c) { return c.id === f.grid.value; })[0] || grids[0], dd = (g && g.dados) || {};
        var nomes = (dd.pilotos || []).map(function (x) { return x.nome; }).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        var pistas = []; (dd.calendario || []).forEach(function (c) { if (pistas.indexOf(c.pista) < 0) pistas.push(c.pista); });
        function ops(l) { return '<option value="">Selecione…</option>' + l.map(function (n) { return "<option>" + esc(n) + "</option>"; }).join(""); }
        f.pista.innerHTML = ops(pistas); f.solicitante.innerHTML = ops(nomes); f.envolvido.innerHTML = ops(nomes);
      }
      f.grid.addEventListener("change", preencher); preencher();
      var tipoSel = qs.get("tipo"); if (tipoSel === "defesa") f.tipo.value = "defesa";
      function alternar() {
        var def = f.tipo.value === "defesa"; $("#semv").hidden = !def;
        if (!def) f.semvideo.checked = false;
        var sem = def && f.semvideo.checked; $("#lvid").hidden = sem; f.video.required = !sem; f.ok.parentNode.hidden = sem;
      }
      Array.prototype.forEach.call(f.querySelectorAll('input[name="tipo"]'), function (r) { r.addEventListener("change", alternar); });
      f.semvideo.addEventListener("change", alternar); alternar();
      function aviso(t, erro) { m.hidden = false; m.className = "aviso" + (erro ? " erro" : ""); m.textContent = t; }
      function post(corpo) { return fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corpo) }).then(function (r) { return r.json(); }); }
      window.addEventListener("beforeunload", function (ev) { if (enviando) { ev.preventDefault(); ev.returnValue = ""; } });
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (enviando || f._gotcha.value) return;
        var sem = f.tipo.value === "defesa" && f.semvideo.checked, file = sem ? null : f.video.files[0], d = { acao: "iniciar" };
        ["tipo", "grid", "pista", "volta", "solicitante", "envolvido", "relato"].forEach(function (k) { d[k] = (f.elements[k].value || "").trim(); });
        d.tipo = f.tipo.value; d.campeonato = (grids.filter(function (c) { return c.id === d.grid; })[0] || {}).curto || d.grid;
        if (d.solicitante && d.solicitante === d.envolvido) { aviso("Escolha dois pilotos diferentes.", true); return; }
        if (!d.pista || !d.volta || !d.solicitante || !d.envolvido || !d.relato) { aviso("Preencha todos os campos.", true); return; }
        if (sem) {
          enviando = true; btn.disabled = true; d.acao = "semvideo"; d.semvideo = true; aviso("Enviando…");
          post(d).then(function (r) {
            enviando = false; btn.disabled = false;
            if (!r.ok) throw new Error(r.erro || "Falha ao enviar.");
            f.reset(); alternar(); aviso("Defesa registrada sem vídeo. A análise será feita só com o vídeo da acusação e o seu relato.");
          }).catch(function (e) {
            enviando = false; btn.disabled = false;
            aviso((e && e.message ? e.message : "Não foi possível enviar.") + " Tente de novo; se persistir, avise o capitão ou a Direção.", true);
          });
          return;
        }
        if (!file) { aviso("Anexe o arquivo de vídeo.", true); return; }
        if (!/^video\//.test(file.type)) { aviso("O arquivo precisa ser um vídeo (mp4, mov...).", true); return; }
        if (file.size > maxmb * 1048576) { aviso("O vídeo passa de " + maxmb + " MB. Corte o trecho do incidente e tente de novo.", true); return; }
        if (!f.ok.checked) { aviso("Marque a declaração sobre o vídeo.", true); return; }
        d.mime = file.type; d.size = file.size; d.nome = file.name;
        enviando = true; btn.disabled = true; barra.hidden = false; barra.firstChild.style.width = "0%"; aviso("Preparando o envio…");
        post(d).then(function (r) {
          if (!r.ok) throw new Error(r.erro || "Falha ao iniciar.");
          return new Promise(function (ok, bad) {
            var x = new XMLHttpRequest(); x.open("PUT", r.uri);
            x.setRequestHeader("Content-Type", file.type);
            x.upload.onprogress = function (e) { if (e.lengthComputable) { var pc = Math.round(e.loaded * 100 / e.total); barra.firstChild.style.width = pc + "%"; aviso("Enviando o vídeo: " + pc + "%. Não feche a página."); } };
            x.onload = function () { (x.status >= 200 && x.status < 300) ? ok(r) : bad(new Error("O Drive recusou o vídeo (" + x.status + ").")); };
            x.onerror = function () { bad(new Error("A conexão caiu durante o envio do vídeo.")); };
            x.send(file);
          });
        }).then(function (r) {
          aviso("Finalizando…");
          d.acao = "concluir"; d.base = r.base; d.pasta = r.pasta;
          return post(d);
        }).then(function (r) {
          enviando = false; btn.disabled = false;
          if (!r.ok) throw new Error(r.erro || "O vídeo não chegou ao Drive.");
          f.reset(); alternar(); barra.hidden = true; aviso("Pedido enviado. A Comissão de Análise já recebeu o vídeo e o relato.");
        }).catch(function (e) {
          enviando = false; btn.disabled = false; barra.hidden = true;
          aviso((e && e.message ? e.message : "Não foi possível enviar.") + " Tente de novo; se persistir, avise o capitão ou a Direção.", true);
        });
      });
    },

    contato: function () {
      var s = S.site, canais = [];
      if (s.whatsapp) canais.push('<a class="botao" href="' + esc(safeUrl(s.whatsapp)) + '" rel="noopener">WhatsApp</a>');
      if (s.discord) canais.push('<a class="botao" href="' + esc(safeUrl(s.discord)) + '" rel="noopener">Discord</a>');
      if (s.instagram) canais.push('<a class="botao claro ig" href="' + esc(safeUrl(s.instagram)) + '" rel="noopener">' + IG + "Instagram</a>");
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
    return Promise.all([getJSON("noticias", true), getJSON("f1", true), (PAGE === "estatisticas" || PAGE === "halldafama") ? getJSON("stats", true) : null, PAGE === "lastro" ? getJSON("lastro", true) : null, PAGE === "sorteio" ? getJSON("sorteio", true) : null, PAGE === "incidentes" ? getJSON("incidentes", true) : null]);
  }).then(function (r) {
    var ctx = { noticias: (r[0] || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }), f1: (r[1] || []).slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); }), stats: r[2], lastro: r[3], sorteio: r[4], incidentes: r[5] };
    montarTopo(ctx.noticias); montarRodape();
    if (paginas[PAGE]) paginas[PAGE](ctx);
    anuncios();
    var pref = $("#cookies-pref"); if (pref) pref.addEventListener("click", function (ev) { ev.preventDefault(); try { localStorage.removeItem("dps_cookies"); } catch (e) {} location.reload(); });
    contador();
  }).catch(function (e) { $("#app").innerHTML = '<div class="wrap">' + vazio("Não foi possível carregar o site", "Se você abriu o arquivo direto do computador, use o abrir_site_local.bat.") + "</div>"; if (window.console) console.error(e); });
})();
