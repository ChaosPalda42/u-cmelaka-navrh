#!/bin/sh
# Sestaví web a nahraje ho na hosting Active24 (bistroucmelaka.cz) přes SSH klíč ~/.ssh/u-cmelaka-nasazeni.
# Nesahá na data majitele: složka ../data (texty, menu, akce, heslo, zálohy) a web/foto (nahrané fotky) zůstávají.
set -e
cd "$(dirname "$0")/.."
node build.mjs
SSHC="ssh -i $HOME/.ssh/u-cmelaka-nasazeni -o IdentitiesOnly=yes -p 28500"
rsync -az --delete \
  --exclude '/foto/' --exclude '/.well-known/' --exclude '/_router.php' \
  -e "$SSHC" out/ uid6651912@shell.websupport.cz:bistroucmelaka.cz/web/
$SSHC uid6651912@shell.websupport.cz 'mkdir -p bistroucmelaka.cz/web/foto bistroucmelaka.cz/data && chmod 700 bistroucmelaka.cz/data'
echo "nahráno na bistroucmelaka.cz"
