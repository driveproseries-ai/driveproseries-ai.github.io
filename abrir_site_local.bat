@echo off
cd /d "%~dp0"
echo Abrindo o site em http://localhost:8000  (feche esta janela para parar)
start "" http://localhost:8000/index.html?demo=1
python -m http.server 8000
