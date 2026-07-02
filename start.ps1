# Start both API Portal servers
Write-Host "Starting API Portal..." -ForegroundColor Green
Write-Host ""

# Kill existing node processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# Start Backend
Write-Host "Starting Backend on http://localhost:4010..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\api-portal\backend'; npm run start" -WindowStyle Normal

# Wait for backend to initialize
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "Starting Frontend on http://localhost:3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\api-portal\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both servers are starting!" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Backend:   http://localhost:4010" -ForegroundColor Green
Write-Host ""
