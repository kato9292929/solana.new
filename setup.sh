#!/usr/bin/env bash
# =============================================================================
# Solana Development Environment Setup
# https://www.solana.new/setup.sh
#
# Usage:
#   curl -fsSL https://www.solana.new/setup.sh | bash
#   # Skip the confirmation prompt:
#   curl -fsSL https://www.solana.new/setup.sh | SOLANA_SETUP_YES=1 bash
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------
SOLANA_VERSION="${SOLANA_VERSION:-stable}"
ANCHOR_VERSION="${ANCHOR_VERSION:-0.30.1}"
NODE_VERSION="${NODE_VERSION:-20}"
NVM_VERSION="0.39.7"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
print_header() {
    printf "\n"
    printf "${BLUE}${BOLD}╔══════════════════════════════════════════════╗\n${NC}"
    printf "${BLUE}${BOLD}║      Solana Development Environment Setup    ║\n${NC}"
    printf "${BLUE}${BOLD}╚══════════════════════════════════════════════╝\n${NC}"
    printf "\n"
}

step()    { printf "\n${BLUE}${BOLD}==> %s${NC}\n" "$*"; }
ok()      { printf "${GREEN}✓ %s${NC}\n" "$*"; }
warn()    { printf "${YELLOW}⚠ %s${NC}\n" "$*"; }
die()     { printf "${RED}✗ %s${NC}\n" "$*" >&2; exit 1; }

command_exists() { command -v "$1" &>/dev/null; }

# ---------------------------------------------------------------------------
# OS / package-manager detection
# ---------------------------------------------------------------------------
detect_os() {
    step "Detecting operating system"

    case "$OSTYPE" in
        linux-gnu*)
            OS="linux"
            if   command_exists apt-get; then PKG_MANAGER="apt"
            elif command_exists dnf;     then PKG_MANAGER="dnf"
            elif command_exists yum;     then PKG_MANAGER="yum"
            elif command_exists pacman;  then PKG_MANAGER="pacman"
            elif command_exists zypper;  then PKG_MANAGER="zypper"
            else die "Unsupported Linux distribution (no known package manager found)."
            fi
            ;;
        darwin*)
            OS="macos"
            PKG_MANAGER="brew"
            ;;
        *)
            die "Unsupported OS: $OSTYPE. This script supports Linux and macOS only."
            ;;
    esac

    ok "OS: $OS  |  Package manager: $PKG_MANAGER"
}

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
install_dependencies() {
    step "Installing system dependencies"

    case "$PKG_MANAGER" in
        apt)
            sudo apt-get update -q
            sudo apt-get install -y -q \
                curl git build-essential pkg-config \
                libssl-dev libudev-dev clang cmake unzip
            ;;
        dnf)
            sudo dnf install -y \
                curl git gcc gcc-c++ make pkg-config \
                openssl-devel libudev-devel clang cmake unzip
            ;;
        yum)
            sudo yum install -y \
                curl git gcc gcc-c++ make pkg-config \
                openssl-devel libudev-devel clang cmake unzip
            ;;
        pacman)
            sudo pacman -Sy --noconfirm \
                curl git base-devel pkg-config openssl clang cmake unzip
            ;;
        zypper)
            sudo zypper install -y \
                curl git gcc gcc-c++ make pkg-config \
                libopenssl-devel clang cmake unzip
            ;;
        brew)
            if ! command_exists brew; then
                step "Installing Homebrew"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                # Evaluate brew shellenv so it's in PATH for the rest of this script
                if [[ -x /opt/homebrew/bin/brew ]]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [[ -x /usr/local/bin/brew ]]; then
                    eval "$(/usr/local/bin/brew shellenv)"
                fi
            fi
            brew install curl git pkg-config openssl cmake unzip
            ;;
    esac

    ok "System dependencies installed"
}

# ---------------------------------------------------------------------------
# Rust
# ---------------------------------------------------------------------------
install_rust() {
    step "Installing Rust (via rustup)"

    if command_exists rustc && command_exists cargo; then
        warn "Rust already installed ($(rustc --version)). Updating to latest stable…"
        rustup update stable --no-self-update
    else
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
            | sh -s -- -y --default-toolchain stable --no-modify-path
    fi

    # Source cargo env for the remainder of this script
    # shellcheck source=/dev/null
    source "${HOME}/.cargo/env"

    # Add wasm32 target needed by some Anchor builds
    rustup target add wasm32-unknown-unknown 2>/dev/null || true

    ok "Rust $(rustc --version)"
}

# ---------------------------------------------------------------------------
# Solana CLI
# ---------------------------------------------------------------------------
install_solana() {
    step "Installing Solana CLI (${SOLANA_VERSION})"

    sh -c "$(curl -sSfL "https://release.anza.xyz/${SOLANA_VERSION}/install")"

    SOLANA_BIN="${HOME}/.local/share/solana/install/active_release/bin"
    export PATH="${SOLANA_BIN}:${PATH}"

    ok "Solana $(solana --version)"
}

# ---------------------------------------------------------------------------
# Node.js (via nvm)
# ---------------------------------------------------------------------------
install_nodejs() {
    step "Installing Node.js v${NODE_VERSION} (via nvm)"

    NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

    if [ ! -d "${NVM_DIR}" ]; then
        curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh" | bash
    else
        warn "nvm already present at ${NVM_DIR}"
    fi

    # Load nvm for this session
    export NVM_DIR
    # shellcheck source=/dev/null
    [ -s "${NVM_DIR}/nvm.sh" ] && \. "${NVM_DIR}/nvm.sh"

    if command_exists nvm; then
        nvm install "${NODE_VERSION}"
        nvm use     "${NODE_VERSION}"
        nvm alias default "${NODE_VERSION}"
        ok "Node.js $(node --version)"
    else
        warn "nvm not available in current shell — Node.js setup will complete on next login."
        warn "After restarting your shell, run:  nvm install ${NODE_VERSION}"
    fi
}

# ---------------------------------------------------------------------------
# Yarn
# ---------------------------------------------------------------------------
install_yarn() {
    step "Installing Yarn"

    if command_exists npm; then
        npm install -g yarn --silent
        ok "Yarn $(yarn --version)"
    else
        warn "npm not found; skipping Yarn installation."
    fi
}

# ---------------------------------------------------------------------------
# Anchor (via AVM)
# ---------------------------------------------------------------------------
install_anchor() {
    step "Installing Anchor Framework v${ANCHOR_VERSION} (via AVM)"

    # Ensure cargo is available
    # shellcheck source=/dev/null
    [ -f "${HOME}/.cargo/env" ] && source "${HOME}/.cargo/env"

    if ! command_exists avm; then
        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    else
        warn "AVM already installed ($(avm --version 2>/dev/null || echo 'version unknown'))"
    fi

    avm install "${ANCHOR_VERSION}"
    avm use     "${ANCHOR_VERSION}"

    ok "Anchor $(anchor --version)"
}

# ---------------------------------------------------------------------------
# Shell profile (PATH persistence)
# ---------------------------------------------------------------------------
configure_shell() {
    step "Configuring shell profile"

    # Pick the right profile file
    if [[ "${SHELL:-}" == */zsh ]]; then
        SHELL_PROFILE="${HOME}/.zshrc"
    elif [[ "${SHELL:-}" == */bash ]]; then
        if [[ "$OS" == "macos" ]]; then
            SHELL_PROFILE="${HOME}/.bash_profile"
        else
            SHELL_PROFILE="${HOME}/.bashrc"
        fi
    else
        SHELL_PROFILE="${HOME}/.profile"
    fi

    _append_if_missing() {
        local marker="$1"
        local block="$2"
        if ! grep -qF "$marker" "${SHELL_PROFILE}" 2>/dev/null; then
            printf "\n%s\n" "$block" >> "${SHELL_PROFILE}"
        fi
    }

    _append_if_missing \
        'solana/install/active_release/bin' \
        '# Solana CLI
export PATH="${HOME}/.local/share/solana/install/active_release/bin:${PATH}"'

    _append_if_missing \
        '.cargo/env' \
        '# Rust / Cargo
[ -f "${HOME}/.cargo/env" ] && source "${HOME}/.cargo/env"'

    ok "Profile updated: ${SHELL_PROFILE}"
}

# ---------------------------------------------------------------------------
# Keypair
# ---------------------------------------------------------------------------
setup_keypair() {
    step "Setting up Solana keypair"

    KEYPAIR="${HOME}/.config/solana/id.json"

    if [ -f "${KEYPAIR}" ]; then
        warn "Keypair already exists at ${KEYPAIR}"
    else
        solana-keygen new --no-bip39-passphrase --silent
        ok "New keypair generated at ${KEYPAIR}"
    fi

    PUBKEY="$(solana-keygen pubkey "${KEYPAIR}" 2>/dev/null || echo 'unknown')"
    ok "Public key: ${PUBKEY}"

    # Default to localhost cluster
    solana config set --url localhost &>/dev/null || true
    ok "Cluster set to: localhost (local validator)"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_summary() {
    printf "\n"
    printf "${GREEN}${BOLD}╔══════════════════════════════════════════════╗\n${NC}"
    printf "${GREEN}${BOLD}║         Installation Complete!               ║\n${NC}"
    printf "${GREEN}${BOLD}╚══════════════════════════════════════════════╝\n${NC}"
    printf "\n"

    printf "${BOLD}Installed tools:${NC}\n"
    command_exists rustc  && printf "  ${GREEN}✓${NC} Rust     %s\n" "$(rustc --version 2>/dev/null | awk '{print $2}')"
    command_exists solana && printf "  ${GREEN}✓${NC} Solana   %s\n" "$(solana --version 2>/dev/null | awk '{print $2}')"
    command_exists anchor && printf "  ${GREEN}✓${NC} Anchor   %s\n" "$(anchor --version 2>/dev/null)"
    command_exists node   && printf "  ${GREEN}✓${NC} Node.js  %s\n" "$(node --version 2>/dev/null)"
    command_exists yarn   && printf "  ${GREEN}✓${NC} Yarn     %s\n" "$(yarn --version 2>/dev/null)"
    printf "\n"

    printf "${BOLD}Quick start:${NC}\n"
    printf "  1. Reload your shell:               ${BLUE}source %s${NC}\n" "${SHELL_PROFILE:-~/.bashrc}"
    printf "  2. Start a local validator:          ${BLUE}solana-test-validator${NC}\n"
    printf "  3. Create a new Anchor project:      ${BLUE}anchor init my-project && cd my-project${NC}\n"
    printf "  4. Build your program:               ${BLUE}anchor build${NC}\n"
    printf "  5. Run tests:                        ${BLUE}anchor test${NC}\n"
    printf "\n"

    printf "${BOLD}Resources:${NC}\n"
    printf "  • Solana Docs:    https://docs.solana.com\n"
    printf "  • Anchor Docs:    https://www.anchor-lang.com\n"
    printf "  • Solana Faucet:  https://faucet.solana.com\n"
    printf "  • Solana Stack:   https://solana.stackexchange.com\n"
    printf "\n"

    printf "${YELLOW}${BOLD}Security note:${NC} Your keypair lives at ${BLUE}~/.config/solana/id.json${NC}\n"
    printf "${YELLOW}Never share this file or commit it to version control.${NC}\n\n"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
main() {
    print_header

    printf "This script will install:\n"
    printf "  • Rust (via rustup)\n"
    printf "  • Solana CLI (%s)\n"    "${SOLANA_VERSION}"
    printf "  • Anchor Framework (v%s, via AVM)\n" "${ANCHOR_VERSION}"
    printf "  • Node.js v%s (via nvm)\n"            "${NODE_VERSION}"
    printf "  • Yarn\n"
    printf "\n"

    if [ -z "${SOLANA_SETUP_YES:-}" ]; then
        printf "Proceed with installation? [y/N] "
        read -r response
        case "$response" in
            [yY][eE][sS]|[yY]) ;;
            *) printf "Installation cancelled.\n"; exit 0 ;;
        esac
    fi

    detect_os
    install_dependencies
    install_rust
    install_solana
    install_nodejs
    install_yarn
    install_anchor
    configure_shell
    setup_keypair
    print_summary
}

main "$@"
