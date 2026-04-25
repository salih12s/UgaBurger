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
echo # JWT Configuration
echo JWT_SECRET=ugaburger_super_secret_key_2024_x7k9m2
echo.
echo # Server Configuration
echo PORT=5000
echo CLIENT_URL=http://localhost:5173
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
echo # E-Fatura / E-Arsiv Aktif Donusum
echo EINVOICE_PROVIDER=aktifdonusum
REM REST modu: portaltest.aktifdonusum.com/edonusum (ReDoc'taki spec).
REM SOAP'a donmek icin EINVOICE_API_MODE=soap yap.
echo EINVOICE_API_MODE=rest
echo EINVOICE_REST_BASE_URL=https://portaltest.aktifdonusum.com/edonusum
echo EINVOICE_API_URL=https://service.aktifdonusum.com/InvoiceService/InvoiceWS
echo EINVOICE_WSDL_URL=https://service.aktifdonusum.com/InvoiceService/InvoiceWS?wsdl
echo EARCHIVE_API_URL=https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS
echo EARCHIVE_WSDL_URL=https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS?wsdl
REM Aktif Donusum demo hesabi (REST tarafinda dogrulandi, kontor: 6).
echo EINVOICE_USERNAME=admin_008712
echo EINVOICE_PASSWORD=Ohs^&hi8d
REM Demo hesaba atanmis prefix ve gonderici alias (REST'ten cekildi).
echo EINVOICE_PREFIX=AEA
echo EINVOICE_SOURCE_URN=urn:mail:defaultgb@aktif.com.tr
REM Demo hesabin gercek TCKN'si queryDocumentList ile dogrulandi (sourceIdentifier).
REM Canli firma VKN 0102365158 ile TEST YAPMA (resmi kayit olusur).
echo EINVOICE_SENDER_VKN=29357033844
echo EINVOICE_SENDER_TITLE=DEMO_AKTF DEMO_AKTF
echo EINVOICE_SENDER_TAX_OFFICE=Test Vergi Dairesi
echo EINVOICE_SENDER_ADDRESS=Demo Adres
echo EINVOICE_SENDER_CITY=Mersin
echo EINVOICE_SENDER_DISTRICT=Yenisehir
echo EINVOICE_SENDER_POSTCODE=33000
echo EINVOICE_SENDER_EMAIL=demo@example.com
echo EINVOICE_SENDER_PHONE=+905555555555
echo EINVOICE_TEST_MODE=true
echo EINVOICE_AUTO_SEND=true
REM MOCK kapali: gercek REST entegrasyonu kullaniliyor. Kontor yetersizse
REM otomatik olarak resmi sablon PDF'i musterinin mailine gonderilir.
echo EINVOICE_MOCK_MODE=false
echo EINVOICE_PREVIEW_EMAIL_FALLBACK=true
echo EINVOICE_VAT_RATE=10
echo.
echo # DEV: PayTR bypass - sadece local
echo PAYTR_BYPASS=true
) > .env

REM Client .env.development dosyasini ayarla (Vite proxy kullanir)
(
echo # API URL - Local Development ^(bos = Vite proxy kullanir^)
echo VITE_API_URL=
echo VITE_GOOGLE_CLIENT_ID=631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com
) > client\.env.development

REM Client .env.production dosyasini production olarak birak
(
echo # API URL - Production
echo VITE_API_URL=https://ugaburger.com
echo VITE_GOOGLE_CLIENT_ID=631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com
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
