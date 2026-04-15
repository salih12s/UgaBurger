@echo off
echo Production Ortami Ayarlaniyor...

REM Root .env dosyasini production ayarlara cevir
(
echo # Environment
echo NODE_ENV=production
echo.
echo # Database Configuration - Local PostgreSQL
echo # DB_HOST=localhost
echo # DB_PORT=5432
echo # DB_NAME=UgaBurger
echo # DB_USER=postgres
echo # DB_PASSWORD=12345
echo # DB_SSL=false
echo.
echo # Database Configuration - Production ^(Plesk MariaDB^)
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_NAME=UgaBurger
echo DB_USER=ugaburger
echo DB_PASSWORD=ugaburger33
echo.
echo # JWT Configuration
echo JWT_SECRET=ugaburger_super_secret_key_2024_x7k9m2
echo.
echo # Server Configuration
echo PORT=3000
echo CLIENT_URL=https://ugaburger.com
) > .env

REM Client .env.development dosyasini local olarak birak
(
echo # API URL - Local Development ^(bos = Vite proxy kullanir^)
echo VITE_API_URL=
) > client\.env.development

REM Client .env.production dosyasini production ayarla
(
echo # API URL - Production
echo VITE_API_URL=https://ugaburger.com
) > client\.env.production

echo.
echo ================================================
echo   PRODUCTION ORTAMI AYARLANDI!
echo ================================================
echo.
echo Backend API  : https://ugaburger.com
echo Database     : MariaDB localhost:3306/UgaBurger ^(Plesk^)
echo Frontend     : Build alinip Plesk'e yuklenecek
echo.
echo Deployment Adimlari:
echo   1. cd client ^&^& npm run build
echo   2. client/dist klasorunu zipleyip Plesk'e yukle
echo   3. git add . ^&^& git commit -m "mesaj" ^&^& git push
echo.
echo ================================================
pause
