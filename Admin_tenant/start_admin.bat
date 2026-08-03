@echo off
title SONIC BI - Servidor SuperAdmin (Puerto 8010)
cd /d "%~dp0"

cd backend

if not exist .venv (
    echo Creando entorno virtual .venv...
    python -m venv .venv
)

echo Activando entorno virtual y verificando dependencias...
call .venv\Scripts\activate.bat
pip install -r requirements.txt

echo Iniciando servidor FastAPI en el puerto 8010...
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload

pause
