#!/bin/bash
# Fetches each summon's individual GameWith page (list.json[].href) via curl.
# Individual pages have per-uncap-tier call cooldown ("使用間隔"/"召喚までの間隔")
# that the master list page (article/show/136372) does not include.
# Usage: bash scratch-fetch-gamewith-summons.sh <scratch-dir-abs-path> [start] [end]

SCRATCH_WIN="$1"
START=${2:-0}
END=${3:-9999}
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

if [ -z "$SCRATCH_WIN" ]; then
  echo "usage: bash scratch-fetch-gamewith-summons.sh <scratch-dir-abs-path> [start] [end]"
  exit 1
fi

mkdir -p "$SCRATCH_WIN/gamewith"

node -e "
const fs = require('fs');
const list = JSON.parse(fs.readFileSync('$SCRATCH_WIN/list.json', 'utf-8'));
const rows = list.slice($START, $END).map((c, idx) => {
  const i = $START + idx;
  const idStr = String(i).padStart(3, '0');
  const safe = c.name.replace(/[\\\\/:*?\"<>|]/g, '_');
  return idStr + '\t' + safe + '\t' + c.href;
});
console.log(rows.join('\n'));
" > "$SCRATCH_WIN/_gamewith_fetch_list.tsv"

count=0
while IFS=$'\t' read -r idStr safe href; do
  outFile="$SCRATCH_WIN/gamewith/${idStr}_page.html"
  curl -s -A "$UA" "$href" -o "$outFile" -w "${idStr} HTTP:%{http_code}\n"
  count=$((count+1))
  sleep 0.3
done < "$SCRATCH_WIN/_gamewith_fetch_list.tsv"
echo "FETCH_GAMEWITH_DONE count=$count"
