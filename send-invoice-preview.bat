@echo off
REM Lokal -> Railway DB -> Aktif Donusum -> Musteri Mail
REM Kullanim:
REM   send-invoice-preview.bat              -> son odenen siparis
REM   send-invoice-preview.bat 152          -> belirli siparis
REM   send-invoice-preview.bat 152 mail@x   -> mail override

cd /d "%~dp0server"
node scripts\sendPreviewForOrder.js %1 %2
pause
