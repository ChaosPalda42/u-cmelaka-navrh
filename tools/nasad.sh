#!/bin/sh
# Sestaví web a nahraje ho na hosting Active24 (bistroucmelaka.cz) přes SSH klíč ~/.ssh/u-cmelaka-nasazeni.
set -e
cd "$(dirname "$0")/.."
node build.mjs
SSHC="ssh -i $HOME/.ssh/u-cmelaka-nasazeni -o IdentitiesOnly=yes -p 28500"
rsync -az --delete --exclude '.well-known' -e "$SSHC" out/ uid6651912@shell.websupport.cz:bistroucmelaka.cz/web/
echo "nahráno na bistroucmelaka.cz"
