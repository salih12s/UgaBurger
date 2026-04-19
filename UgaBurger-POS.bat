@echo off
title Uga Burger POS
echo ============================================
echo    UGA BURGER - POS SISTEMI
echo ============================================
echo.
echo  Yazici popup'siz mod ile aciliyor...
echo  Chrome kapandiktan sonra bu pencere kapanir.
echo.

REM Chrome'un kurulu oldugu yollar (hangisi varsa onu kullan)
set CHROME_PATH=

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if %CHROME_PATH%=="" (
    echo [HATA] Chrome bulunamadi! Lutfen Chrome yukleyin.
    pause
    exit /b 1
)

REM --kiosk-printing = print popup'i ENGELLER, direkt default yaziciya basar
REM --app = adres cubugu olmadan temiz pencere acar (POS gorunumu)
start "" %CHROME_PATH% --kiosk-printing --app=https://www.ugaburger.com/admin --disable-features=PrintPreview
