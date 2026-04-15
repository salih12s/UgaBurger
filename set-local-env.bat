@echo off
echo Gelistirme Ortami Ayarlaniyor...

REM Root .env dosyasini local ayarlara cevir
(
echo # Environment
echo NODE_ENV=development
echo.
echo # Database Configuration - Local PostgreSQL
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=UgaBurger
echo DB_USER=postgres
echo DB_PASSWORD=12345
echo DB_SSL=false
echo.
echo # Database Configuration - Production ^(Plesk MariaDB^)
echo # DB_HOST=localhost
echo # DB_PORT=3306
echo # DB_NAME=UgaBurger
echo # DB_USER=ugaburger
echo # DB_PASSWORD=ugaburger33
echo.
echo # JWT Configuration
echo JWT_SECRET=ugaburger_super_secret_key_2024_x7k9m2
echo.
echo # Server Configuration
echo PORT=5000
echo CLIENT_URL=http://localhost:5173
) > .env

REM Client .env.development dosyasini ayarla (Vite proxy kullanir)
(
echo # API URL - Local Development ^(bos = Vite proxy kullanir^)
echo VITE_API_URL=
) > client\.env.development

REM Client .env.production dosyasini production olarak birak
(
echo # API URL - Production
echo VITE_API_URL=https://ugaburger.com
) > client\.env.production

echo.
echo ================================================
echo   GELISTIRME ORTAMI AYARLANDI!
echo ================================================
echo.
echo Backend API  : http://localhost:5000
echo Frontend     : http://localhost:5173
echo Database     : PostgreSQL localhost:5432/UgaBurger
echo.
echo Calisma Adimlari:
echo   1. npm run dev       ^(backend + frontend birlikte^)
echo   2. npm run server:dev ^(sadece backend^)
echo   3. npm run client     ^(sadece frontend^)
echo.
echo ================================================
pause
