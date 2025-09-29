@echo off
echo Stopping Smart Chalk Apex Services...
echo.

echo Stopping production services...
docker-compose down

echo.
echo Stopping development services...
docker-compose -f docker-compose.dev.yml down

echo.
echo All services stopped.
echo.
echo To remove all data (WARNING: This will delete your database):
echo   docker-compose down -v
echo   docker-compose -f docker-compose.dev.yml down -v
echo.
pause