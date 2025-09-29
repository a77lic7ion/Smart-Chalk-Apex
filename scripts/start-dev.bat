@echo off
echo Starting Smart Chalk Apex Development Environment...
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ERROR: .env.local file not found!
    echo Please copy .env.example to .env.local and add your API keys.
    pause
    exit /b 1
)

echo Starting database and backend services...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak > nul

echo.
echo Services Status:
docker-compose -f docker-compose.dev.yml ps

echo.
echo Development environment is ready!
echo.
echo Database: localhost:5432
echo Backend API: http://localhost:3001
echo.
echo To start the frontend, run:
echo   npm install
echo   npm run dev
echo.
echo To view logs: docker-compose -f docker-compose.dev.yml logs -f
echo To stop: docker-compose -f docker-compose.dev.yml down
echo.
pause