#!/bin/bash

set -e

EXTENSION_UUID="ambed-fly@walid"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Ambed Fly..."

mkdir -p "$INSTALL_DIR"

cp -r \
    "$SCRIPT_DIR/extension.js" \
    "$SCRIPT_DIR/fly.js" \
    "$SCRIPT_DIR/ladybug.js" \
    "$SCRIPT_DIR/prefs.js" \
    "$SCRIPT_DIR/metadata.json" \
    "$SCRIPT_DIR/README.md" \
    "$SCRIPT_DIR/LICENSE" \
    "$SCRIPT_DIR/assets" \
    "$SCRIPT_DIR/schemas" \
    "$INSTALL_DIR/"

if ! command -v glib-compile-schemas >/dev/null 2>&1; then
    echo "Error: glib-compile-schemas is not installed."
    exit 1
fi

glib-compile-schemas "$INSTALL_DIR/schemas"

if [ ! -f "$INSTALL_DIR/schemas/gschemas.compiled" ]; then
    echo "Error: Failed to create gschemas.compiled."
    exit 1
fi

echo
echo "Ambed Fly installed successfully."
echo "Location: $INSTALL_DIR"
echo
echo "Open GNOME Extensions and enable Ambed Fly."
echo "If GNOME does not detect the extension immediately, log out and log in again."
