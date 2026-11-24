#!/usr/bin/env bash
# Installs the built desktop app into /Applications (macOS).
#
#   npm run install-app                  install the last build (builds if there is none)
#   npm run install-app -- --build       rebuild first
#   npm run install-app -- --user        install into ~/Applications instead
#   npm run install-app -- --dir <path>  install into <path>
#   npm run install-app -- --open        launch it afterwards
#
# A running copy is quit first and replaced; your data (database, keychain
# key) lives outside the app bundle and is kept.
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$DESKTOP_DIR/src-tauri/tauri.conf.json"
BUNDLE_DIR="$DESKTOP_DIR/src-tauri/target/release/bundle/macos"

build=false
open_after=false
dest="/Applications"

usage() { sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
	case "$1" in
	--build) build=true ;;
	--open) open_after=true ;;
	--user) dest="$HOME/Applications" ;;
	--dir)
		[[ $# -ge 2 ]] || { echo "--dir needs a path" >&2; exit 2; }
		dest="$2"
		shift
		;;
	-h | --help) usage; exit 0 ;;
	*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
	esac
	shift
done

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "This script installs the macOS app. On other systems, use the installer in" >&2
	echo "src-tauri/target/release/bundle/ (npm run build)." >&2
	exit 1
fi

read_conf() { node -p "require(process.argv[1]).$1" "$CONF"; }
product_name="$(read_conf productName)"
bundle_id="$(read_conf identifier)"
app_name="$product_name.app"
source_app="$BUNDLE_DIR/$app_name"

if [[ "$build" == true || ! -d "$source_app" ]]; then
	echo "==> Building $app_name"
	# Only the .app: skips the slower DMG, which installing doesn't need.
	(cd "$DESKTOP_DIR" && npx tauri build --bundles app)
fi
[[ -d "$source_app" ]] || { echo "Build output not found: $source_app" >&2; exit 1; }

mkdir -p "$dest"
[[ -w "$dest" ]] || {
	echo "Can't write to $dest. Try --user to install into ~/Applications." >&2
	exit 1
}
target_app="$dest/$app_name"

# Closing the window only hides it (the app keeps running in the menu bar),
# so ask it to quit properly before replacing it.
if pgrep -f "$target_app/Contents/MacOS/" >/dev/null 2>&1; then
	echo "==> Quitting the running $product_name"
	osascript -e "tell application id \"$bundle_id\" to quit" >/dev/null 2>&1 || true
	for _ in $(seq 1 50); do
		pgrep -f "$target_app/Contents/MacOS/" >/dev/null 2>&1 || break
		sleep 0.2
	done
	if pgrep -f "$target_app/Contents/MacOS/" >/dev/null 2>&1; then
		echo "$product_name is still running. Quit it (⌘Q) and run this again." >&2
		exit 1
	fi
fi

echo "==> Installing to $target_app"
# Copy next to the target first, then swap, so a failed copy never leaves
# a half-installed app behind. ditto keeps the bundle's signature intact.
staging="$(mktemp -d "$dest/.install-$product_name.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
ditto "$source_app" "$staging/$app_name"
xattr -dr com.apple.quarantine "$staging/$app_name" 2>/dev/null || true
rm -rf "$target_app"
mv "$staging/$app_name" "$target_app"

# Let Launch Services pick up the new version (Dock icon, "Open at login").
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
[[ -x "$lsregister" ]] && "$lsregister" -f "$target_app" >/dev/null 2>&1 || true

version="$(defaults read "$target_app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo "?")"
echo "==> Installed $product_name $version"

if [[ "$open_after" == true ]]; then
	open "$target_app"
fi
