@echo off
rem Publica o site: valida os dados e envia para o GitHub Pages.
cd /d "%~dp0"
python tools\gerar_paginas.py
if errorlevel 1 (echo Erro ao gerar as paginas das materias. & exit /b 1)
python tools\validar.py
if errorlevel 1 (echo Corrija os erros acima antes de publicar. & exit /b 1)
git add -A
git diff --cached --quiet && (echo Nada novo para publicar. & exit /b 0)
git commit -m "Atualizacao do site %date% %time%"
git push
