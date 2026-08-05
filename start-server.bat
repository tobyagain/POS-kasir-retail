@echo off
echo ========================================
echo   POS Retail UMKM - Local Server
echo ========================================
echo.
echo Server sedang dijalankan...
echo Buka browser dan ketik: http://localhost:8000
echo.
echo Tekan Ctrl+C untuk stop server.
echo ========================================
echo.

REM Coba Python 3 dulu
python -m http.server 8000 2>nul
if %errorlevel% == 0 goto :end

REM Kalau gagal, coba python (alias lama)
py -m http.server 8000 2>nul
if %errorlevel% == 0 goto :end

REM Kalau Python tidak ada
echo.
echo [ERROR] Python tidak terinstall!
echo.
echo Install Python dulu dari: https://www.python.org/downloads/
echo Centang "Add Python to PATH" saat install.
echo.
pause
goto :end

:end
