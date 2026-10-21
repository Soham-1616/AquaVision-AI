@echo off
echo ============================================================
echo   AquaVision AI - Starting Application
echo ============================================================
echo.
echo Starting backend (FastAPI) on http://localhost:8000 ...
start "AquaVision Backend" cmd /k "cd /d %~dp0backend && python main.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend (Vite dev server) on http://localhost:5173 ...
start "AquaVision Frontend" cmd /k "cd /d %~dp0github_ui_repo && npm run dev"

echo.
echo ============================================================
echo   AquaVision AI is starting!
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================================
echo.
echo Press any key to open the browser...
pause >nul
start http://localhost:5173
