@echo off
echo Production Ortami Ayarlaniyor...

REM Root .env dosyasini production ayarlara cevir
(
echo # Environment
echo NODE_ENV=production
echo.
echo # Database Configuration - Railway PostgreSQL
echo DATABASE_URL=postgresql://postgres:HmdmzcJDIIEUrcxldSMNYkWmHxMGgIGi@mainline.proxy.rlwy.net:35625/railway
echo.
echo # JWT Configuration
echo JWT_SECRET=8f4d2c9b7e1a6f3d0c5e8b2a9f7d1c4e6b3a8d0f2c7e9a1b5d4f8c2e7a6b1d9
echo.
echo # Server Configuration
echo PORT=3000
echo CLIENT_URL=https://mintcream-wasp-984519.hostingersite.com
) > .env

REM Client .env dosyalarini ayarla
(
echo # API URL - Local Development ^(bos = Vite proxy kullanir^)
echo VITE_API_URL=
) > client\.env.development

(
echo # API URL - Production
echo VITE_API_URL=https://ugaburger-production.up.railway.app
) > client\.env.production

echo.
echo ================================================
echo   PRODUCTION ORTAMI AYARLANDI!
echo ================================================
echo.
echo Backend API  : https://ugaburger-production.up.railway.app
echo Database     : Railway PostgreSQL
echo Frontend     : https://mintcream-wasp-984519.hostingersite.com
echo.
echo Deployment Adimlari:
echo   1. cd client ^&^& npm run build
echo   2. client/dist klasorunu zipleyip yukle
echo   3. git add . ^&^& git commit -m "mesaj" ^&^& git push
echo.
echo ================================================
pause
