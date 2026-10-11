#!/bin/sh
# Sestaví web a nahraje ho na hosting Active24 (bistroucmelaka.cz) přes SSH klíč ~/.ssh/u-cmelaka-nasazeni.
# Port SSH: základní konzole Active24 žije 1 hodinu a po každé aktivaci má jiný port (Konzole -> SSH Port):
#   CM_SSH_PORT=25284 ./tools/nasad.sh
# Nesahá na data majitele: složka ../data (texty, menu, akce, heslo, zálohy) a web/foto (nahrané fotky) zůstávají.
set -e
cd "$(dirname "$0")/.."
node build.mjs
PORT="${CM_SSH_PORT:?nastav CM_SSH_PORT podle administrace Active24 (Konzole)}"
# konzole je po každé aktivaci nový kontejner s novým klíčem: vlastní known_hosts, starý záznam pro port pryč, nový se přijme
KH="$HOME/.ssh/known_hosts_u_cmelaka"
touch "$KH"; ssh-keygen -R "[shell.websupport.cz]:$PORT" -f "$KH" >/dev/null 2>&1 || true
SSHC="ssh -i $HOME/.ssh/u-cmelaka-nasazeni -o IdentitiesOnly=yes -o UserKnownHostsFile=$KH -o StrictHostKeyChecking=accept-new -p $PORT"
rsync -az --delete \
  --exclude '/foto/' --exclude '/.well-known/' --exclude '/_router.php' \
  -e "$SSHC" out/ uid6651912@shell.websupport.cz:bistroucmelaka.cz/web/
$SSHC uid6651912@shell.websupport.cz 'mkdir -p bistroucmelaka.cz/web/foto bistroucmelaka.cz/data && chmod 700 bistroucmelaka.cz/data'
echo "nahráno na bistroucmelaka.cz"
