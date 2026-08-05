#!/bin/bash
echo "========================================"
echo "  POS Retail UMKM - Local Server"
echo "========================================"
echo ""
echo "Server sedang dijalankan..."
echo "Buka browser dan ketik: http://localhost:8000"
echo ""
echo "Tekan Ctrl+C untuk stop server."
echo "========================================"
echo ""

# Coba Python 3
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo ""
    echo "[ERROR] Python tidak terinstall!"
    echo ""
    echo "Install Python dulu:"
    echo "  Ubuntu/Debian: sudo apt install python3"
    echo "  macOS: brew install python3"
    echo ""
    read -p "Tekan Enter untuk keluar..."
fi
