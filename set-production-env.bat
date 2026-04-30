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
echo.
echo # SMTP Configuration
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USER=ugaburger33@gmail.com
echo SMTP_PASS=clkwyrzjtyjbiedc
echo.
echo # Google OAuth
echo GOOGLE_CLIENT_ID=631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com
echo.
echo # E-Fatura / E-Arsiv Aktif Donusum (CANLI)
echo EINVOICE_PROVIDER=aktifdonusum
echo EINVOICE_API_MODE=rest
echo EINVOICE_REST_BASE_URL=https://portal.aktifdonusum.com/edonusum
echo EINVOICE_API_URL=https://service.aktifdonusum.com/InvoiceService/InvoiceWS
echo EINVOICE_WSDL_URL=https://service.aktifdonusum.com/InvoiceService/InvoiceWS?wsdl
echo EARCHIVE_API_URL=https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS
echo EARCHIVE_WSDL_URL=https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS?wsdl
echo EINVOICE_USERNAME=admin_001742
echo EINVOICE_PASSWORD=z6GU^&DS4
echo EINVOICE_PREFIX=AEA
echo EINVOICE_SOURCE_URN=urn:mail:defaultgb@aktif.com.tr
echo EINVOICE_SENDER_VKN=0102365158
echo EINVOICE_SENDER_TITLE=AHMET MUHITTIN ARK VE ULAS KANTARCI ADI ORTAKLIGI
echo EINVOICE_SENDER_TAX_OFFICE=Uray
echo EINVOICE_SENDER_ADDRESS=Inonu Mah. 1405 Sk. Murat Apt. No:2/B
echo EINVOICE_SENDER_CITY=Mersin
echo EINVOICE_SENDER_DISTRICT=Yenisehir
echo EINVOICE_SENDER_POSTCODE=33060
echo EINVOICE_SENDER_EMAIL=info@ugaburger.com
echo EINVOICE_SENDER_PHONE=+905050469382
echo EINVOICE_TEST_MODE=false
echo EINVOICE_AUTO_SEND=true
echo EINVOICE_MOCK_MODE=false
echo EINVOICE_PREVIEW_EMAIL_FALLBACK=true
echo EINVOICE_VAT_RATE=10
) > .env

REM Client .env dosyalarini ayarla
(
echo # API URL - Local Development ^(bos = Vite proxy kullanir^)
echo VITE_API_URL=
echo VITE_GOOGLE_CLIENT_ID=631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com
) > client\.env.development

(
echo # API URL - Production
echo VITE_API_URL=https://ugaburger-production.up.railway.app
echo VITE_GOOGLE_CLIENT_ID=631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com
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
