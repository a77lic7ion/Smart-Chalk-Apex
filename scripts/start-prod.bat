@echo off
echo Starting SmartChalk Production Environment...
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ERROR: .env.local file not found!
    echo Please copy .env.example to .env.local and add your API keys.
    pause
    exit /b 1
)

echo Building and starting all services...
docker-compose up -d --build

echo.
echo Waiting for services to start...
timeout /t 15 /nobreak > nul

echo.
echo Services Status:
docker-compose ps

echo.
echo Production environment is ready!
echo.
echo Frontend: http://localhost
echo Backend API: http://localhost:3001
echo Database: localhost:5432
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo.
pause