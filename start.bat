@echo off
REM Start both frontend and backend servers

echo Starting API Portal...
echo.

REM Kill any existing node processes
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Stopping existing node processes...
    taskkill /F /IM node.exe >NUL 2>&1
    timeout /T 2 /NOBREAK
)

REM Start backend in new window
echo Starting Backend on http://localhost:4010...
start "API Portal Backend" cmd /k "cd backend && npm run start"

REM Wait for backend to start
timeout /T 5 /NOBREAK

REM Start frontend in new window
echo Starting Frontend on http://localhost:3000...
start "API Portal Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting!
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4010
echo.
pause
