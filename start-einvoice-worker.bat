@echo off
title UGA BURGER - E-Fatura Otomatik Worker
echo ================================================
echo   E-FATURA OTOMATIK WORKER
echo ================================================
echo.
echo  Bu pencere acik kaldigi surece her 30 saniyede
echo  bir Railway DB'si kontrol edilir, odenmis yeni
echo  siparislere otomatik fatura mail'i gonderilir.
echo.
echo  Durdurmak icin: Ctrl+C
echo  Kapatmak icin : Bu pencereyi kapatin
echo ================================================
echo.

cd /d "%~dp0server"
node scripts\einvoiceWorker.js

echo.
echo Worker durdu. Cikmak icin bir tusa basin...
pause >nul
