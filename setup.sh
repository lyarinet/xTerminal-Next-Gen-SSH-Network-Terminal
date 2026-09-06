#!/usr/bin/env bash
# =====================================================================
# xTerminal - Automated Fresh Machine Setup for Linux & macOS
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}=====================================================================${NC}"
echo -e "${GREEN}${BOLD}    __   _______                   _             _                   ${NC}"
echo -e "${GREEN}${BOLD}    \\ \\ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  ${NC}"
echo -e "${GREEN}${BOLD}     \\ V /  | |/ _ \\ '__| '_ \` _ \\| | '_ \\ / _\` | |                  ${NC}"
echo -e "${GREEN}${BOLD}      | |   | |  __/ |  | | | | | | | | | | (_| | |                  ${NC}"
echo -e "${GREEN}${BOLD}      |_|   |_|\\___|_|  |_| |_| |_|_|_| |_|\\__,_|_| PRO              ${NC}"
echo -e "${CYAN}=====================================================================${NC}"
echo -e "   Automated Fresh PC Setup (Linux & macOS)"
echo -e "${CYAN}=====================================================================${NC}\n"

OS="$(uname -s)"
echo -e "${BOLD}[1/4] Detecting Operating System: ${CYAN}${OS} ($(uname -m))${NC}"

# Function to check command presence
has_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Install prerequisites if missing
if [ "$OS" = "Darwin" ]; then
    # macOS
    if ! has_cmd brew; then
        echo -e "  ${YELLOW}[!] Homebrew not detected.${NC}"
        read -p "  Install Homebrew package manager? (Y/n) " ans
        if [ "$ans" != "n" ] && [ "$ans" != "N" ]; then
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
    fi

    if ! has_cmd node; then
        echo -e "  ${YELLOW}[!] Node.js not detected.${NC}"
        read -p "  Install Node.js via Homebrew? (Y/n) " ans
        if [ "$ans" != "n" ] && [ "$ans" != "N" ]; then
            brew install node
        fi
    fi

    if ! has_cmd git; then
        brew install git || true
    fi

elif [ "$OS" = "Linux" ]; then
    # Linux (Ubuntu, Debian, Fedora, Arch)
    if ! has_cmd node || ! has_cmd npm || ! has_cmd git; then
        echo -e "  ${YELLOW}[!] Required build tools missing.${NC}"
        read -p "  Automatically install Node.js, npm, git & build essentials via sudo? (Y/n) " ans
        if [ "$ans" != "n" ] && [ "$ans" != "N" ]; then
            if has_cmd apt-get; then
                sudo apt-get update
                sudo apt-get install -y curl git build-essential python3 libusb-1.0-0-dev libudev-dev
                # If node still missing, install via nodesource
                if ! has_cmd node; then
                    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                fi
            elif has_cmd dnf; then
                sudo dnf install -y curl git gcc-c++ make python3 nodejs npm
            elif has_cmd pacman; then
                sudo pacman -S --needed curl git base-devel python nodejs npm
            else
                echo -e "  ${RED}Please install Node.js (v20+), npm, and git using your system package manager.${NC}"
                exit 1
            fi
        fi
    fi
fi

# Print versions
echo -e "  ${GREEN}✔ Node.js:${NC} $(node -v)"
echo -e "  ${GREEN}✔ npm:${NC} v$(npm -v)"
if has_cmd git; then
    echo -e "  ${GREEN}✔ Git:${NC} $(git --version)"
fi

# 2. Setup .env file
echo -e "\n${BOLD}[2/4] Setting up Environment (.env)...${NC}"
if [ -f ".env" ]; then
    echo -e "  ${GREEN}✔ Existing .env found.${NC}"
elif [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "  ${GREEN}✔ Created default .env from .env.example.${NC}"
else
    echo -e "PORT=3000\nHTTPS_PORT=3443\nNODE_ENV=development" > .env
    echo -e "  ${GREEN}✔ Generated minimal .env.${NC}"
fi

# 3. Install npm dependencies
echo -e "\n${BOLD}[3/4] Installing Project Dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✔ 'node_modules' directory present.${NC}"
    read -p "  Re-run npm install to ensure up-to-date packages? (y/N) " reinstall
    if [ "$reinstall" = "y" ] || [ "$reinstall" = "Y" ]; then
        npm install
    fi
else
    echo -e "  ${CYAN}Running npm install...${NC}"
    npm install || npm install --legacy-peer-deps
fi

# 4. Verify Build
echo -e "\n${BOLD}[4/4] Verifying Project Build...${NC}"
npm run build

echo -e "\n${CYAN}=====================================================================${NC}"
echo -e "${GREEN}${BOLD} [SUCCESS] xTerminal Environment Ready!${NC}"
echo -e "${CYAN}=====================================================================${NC}"
echo -e "Choose action:"
echo -e "  1) Start Development Server (${CYAN}npm run dev${NC})"
echo -e "  2) Start Production Server  (${CYAN}npm start${NC})"
echo -e "  3) Build Desktop Binary     (${CYAN}AppImage / .deb / .dmg${NC})"
echo -e "  4) Exit\n"

read -p "Select option [1-4] (Default: 1): " choice
case "$choice" in
    2)
        npm start
        ;;
    3)
        if [ "$OS" = "Darwin" ]; then
            npm run build:electron:mac
        else
            npm run build:electron:linux
        fi
        ;;
    4)
        exit 0
        ;;
    *)
        npm run dev
        ;;
esac
