#!/data/data/com.termux/files/usr/bin/sh
set -e

echo "\n\033[1;35m⚡ MEMULAI INSTALASI OTOMATIS LOPCLIENT...\033[0m\n"

ensure_working_mirror() {
  if ! pkg update -y >/dev/null 2>&1; then
    echo "[!] Mirror bawaan bermasalah, mencoba ganti mirror otomatis..."
    MIRROR_BASE="$PREFIX/etc/termux/mirrors"
    CHOSEN="$PREFIX/etc/termux/chosen_mirrors"
    for cand in \
      "$MIRROR_BASE/asia/mirror.sg.gs" \
      "$MIRROR_BASE/asia/kartolo.sby.datautama.net.id" \
      "$MIRROR_BASE/default" \
      "$MIRROR_BASE/all"; do
      if [ -e "$cand" ]; then
        ln -sfn "$cand" "$CHOSEN"
        if pkg update -y >/dev/null 2>&1; then
          echo "[✓] Berhasil beralih ke mirror: $(basename "$cand")"
          return 0
        fi
      fi
    done
  fi
}
ensure_working_mirror
pkg update -y && pkg upgrade -y -o Dpkg::Options::="--force-confnew" && pkg upgrade -y -o Dpkg::Options::="--force-confold"
pkg install -y nodejs-lts git ffmpeg

cd "$HOME"
if [ -d "$HOME/LopClient/.git" ]; then
  echo "\033[1;36m[•] Folder LopClient ditemukan, memperbarui versi...\033[0m"
  cd "$HOME/LopClient"
  git fetch --all
  git reset --hard origin/main
else
  rm -rf "$HOME/LopClient"
  git clone https://github.com/nizxreal/LopClient.git "$HOME/LopClient"
  cd "$HOME/LopClient"
fi

echo "\033[1;36m[•] Menginstall dependensi Node.js...\033[0m"
npm_config_allow_git=all npm install --allow-git=all --no-audit --no-fund

if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
  printf '#!/data/data/com.termux/files/usr/bin/sh\nexec node "$HOME/LopClient/cli.js" "$@"\n' > "$PREFIX/bin/LopClient"
  printf '#!/data/data/com.termux/files/usr/bin/sh\nexec node "$HOME/LopClient/updater.js" "$@"\n' > "$PREFIX/bin/LopClientUpdate"
  chmod +x "$PREFIX/bin/LopClient" "$PREFIX/bin/LopClientUpdate"
fi

echo "\n\033[1;32m✅ INSTALASI SELESAI!\033[0m"
echo "Sekarang ketik \033[1;33mLopClient\033[0m dari folder mana saja untuk memulai.\n"
