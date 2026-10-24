# Pedido de análise pelo site (upload para o Google Drive)

A página `pedido.html` recebe o relato e o vídeo e guarda tudo no seu Drive, em
`DPS - Pedidos de análise / <campeonato> / Etapa NN / Incidente <ID> x <ID> /`.
Cada envio gera dois arquivos com o mesmo nome base: o vídeo e um `.txt` com o relato e os dados.
Você recebe um e-mail a cada pedido ou defesa.

## Ativar (uma vez, uns 10 minutos)
1. Entre em https://script.google.com com a conta do Drive da liga e clique em **Novo projeto**.
2. Apague o conteúdo do `Code.gs` e cole o conteúdo de `docs/apps-script-pedido/Code.gs`.
3. Ative **Configurações do projeto > Mostrar arquivo de manifesto "appsscript.json"**, abra esse arquivo e cole o conteúdo de `docs/apps-script-pedido/appsscript.json`.
4. Confira no topo do `Code.gs` o endereço do site (`ORIGEM_SITE`) e o tamanho máximo.
5. **Implantar > Nova implantação > Aplicativo da Web**: Executar como **Eu**; Quem tem acesso: **Qualquer pessoa**. Autorize quando o Google pedir (aparece "app não verificado": Avançado > Acessar).
6. Copie o **URL do aplicativo da Web** (termina em `/exec`).
7. Em `data/site.json`, no bloco `pedido`, cole o URL em `apps_script_url`. Publique o site.
8. Teste: envie um pedido de teste com um vídeo grande (30 MB ou mais) e confira o vídeo, o `.txt` e o e-mail.

Se mudar o `Code.gs` depois, use **Implantar > Gerenciar implantações > editar > Nova versão**.

## Limites e cuidados
- O endereço do script fica público no site. Quem o achar consegue enviar arquivos, mas só para a pasta de pedidos (que é privada) e só vídeo até 300 MB. Se virar abuso, troque a implantação (gera novo URL).
- Depois do envio, o script divide o vídeo em partes de 5 MB na subpasta `partes`. É para a análise automática (o conector do Drive usado pela IA só baixa até 10 MB por arquivo). O vídeo inteiro continua na pasta principal.
- O vídeo vai direto do navegador do piloto para o Drive (upload retomável do Google), sem passar pelo script, por isso aguenta arquivos grandes.
- O piloto precisa deixar a página aberta até aparecer "Pedido enviado".
