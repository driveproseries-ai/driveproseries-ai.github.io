# Portal DPS — guia de publicação e manutenção

Site 100% estático: sem servidor, sem banco de dados, sem mensalidade. Todo o conteúdo fica em `data/*.json`; as páginas só leem esses arquivos.

## 1. Ver no seu computador
Dê dois cliques em `abrir_site_local.bat` (precisa do Python, que você já usa). Abre `http://localhost:8000` em **modo demonstração** (`?demo=1`), com matérias, notícias e estatísticas de exemplo. Sem `?demo=1` você vê o site como o público verá. Não abra o `index.html` direto do disco: o navegador bloqueia a leitura dos JSON.

## 2. Publicar no GitHub Pages (grátis)
1. Crie uma conta em github.com e um repositório **público** (ex.: `dps-portal`).
2. Instale o Git for Windows e, na pasta do site, rode uma vez: `git init`, `git branch -M main`, `git remote add origin https://github.com/SEU-USUARIO/dps-portal.git`, e `publicar.bat`. O Git pede o login do GitHub na primeira vez e guarda.
3. No repositório: **Settings → Pages → Deploy from a branch → main / (root)**. Em ~1 minuto o site abre em `https://SEU-USUARIO.github.io/dps-portal/`.
4. Domínio próprio é opcional (Settings → Pages → Custom domain).

Depois disso, publicar = rodar `publicar.bat` (valida os dados, faz commit e push).

## 3. Contador de visitas
Já está ligado ao serviço gratuito CounterAPI (`api.counterapi.dev`), sem cadastro. Conta uma visita por sessão do navegador; ignora `localhost` e modo demonstração. O nome do contador está em `data/site.json` → `contador` (troque `namespace` por algo único seu). Se o serviço sair do ar, o contador some do rodapé sem quebrar o site. Alternativa com painel: GoatCounter (goatcounter.com).

## 4. Fale conosco
1. Crie conta grátis em formspree.io e um formulário novo apontando para o e-mail da liga.
2. Copie o código do formulário (o trecho depois de `/f/`) e cole em `data/site.json` → `formspree_id`.
3. Preencha também `whatsapp`, `discord` e `instagram` se quiser os botões de contato rápido (links completos, com `https://`).
O plano gratuito do Formspree tem limite mensal de mensagens (cerca de 50); basta para recrutamento.

## 5. Equipe parceira (IRT)
Em `data/site.json` → `parceiros`, preencha `instagram` com o link do perfil (ex.: `https://www.instagram.com/...`). Para mais parceiras, copie o bloco.

## 6. Novo campeonato (ex.: Modo Carreira)
1. Copie `data/mundial.json` para `data/carreira.json` e ajuste nome, pilotos, calendário. `grupo` e `equipe` são opcionais; sem construtores, a aba mostra "em breve".
2. Acrescente em `data/campeonatos.json`: `{"id":"carreira","nome":"Modo Carreira","curto":"Carreira","cor":"#1d4ed8"}`.
Tabelas, calendário, home e Jornal passam a incluí-lo sozinhos.

## 7. Estatísticas históricas (fase 2)
1. Reúna os resultados antigos do FGC em `data/historico.csv` (formato no topo de `tools/gerar_stats.py`) e, se quiser, `data/titulos.csv`.
2. Rode `python tools/gerar_stats.py data/historico.csv data/titulos.csv`.
3. `data/stats.json` é gerado e a página Estatísticas passa a mostrar maiores vencedores, pistas mais usadas, vencedores por pista e perfil de piloto.

## 8. Estrutura de dados
| Arquivo | Conteúdo |
|---|---|
| `site.json` | nome, contador, formulário, redes, parceiros |
| `campeonatos.json` | lista e cor de cada campeonato |
| `<id>.json` | pilotos (`pts`, `pun` negativo), construtores, calendário |
| `noticias.json` | matérias de corrida e Jornal DPS (as mais novas vêm da data) |
| `f1.json` | notícias da F1 real, sempre com `fonte` e `url` |
| `stats.json` | gerado por `tools/gerar_stats.py` |

Calendário: `status` = `realizada`, `proxima` ou `futura`; `tipos` aceita `sprint`, `cpd`, `invertido`, `desempenho_igual`, `surpresa`.

Matéria de corrida (`noticias.json`):
```json
{"id":"2026-10-18-mundial-singapura","tipo":"corrida","campeonato":"mundial","data":"2026-10-18",
 "autor":"Redação DPS","titulo":"...","linha_fina":"...","corpo":["parágrafo 1","parágrafo 2"],
 "resultado":[{"pos":1,"piloto":"...","equipe":"..."}]}
```

## 9. Segurança e manutenção
- O site não guarda dados de visitantes; o formulário envia direto ao Formspree.
- Textos vêm do JSON e são escapados na tela.
- Nada para atualizar: sem frameworks nem dependências. As fontes vêm do Google Fonts (há fallback se falhar).
- Antes de publicar, rode `python tools/validar.py` (o `publicar.bat` já faz isso).
