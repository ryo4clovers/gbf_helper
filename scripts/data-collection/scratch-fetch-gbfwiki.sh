#!/bin/bash
# Re-fetch gbf.wiki search results via curl (Node's fetch gets 403'd by Cloudflare, curl doesn't).
SCRATCH="/c/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/light_ssr"
WIN_SCRATCH="C:/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/light_ssr"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

START=${1:-0}
END=${2:-121}

node -e "
const fs = require('fs');
const list = JSON.parse(fs.readFileSync('$WIN_SCRATCH/list.json', 'utf-8'));
const rows = list.slice($START, $END).map((c, idx) => {
  const i = $START + idx;
  const idStr = String(i).padStart(3, '0');
  const safe = c.name.replace(/[\\\\/:*?\"<>|]/g, '_');
  const fname = idStr + '_' + safe;
  const searchName = c.name.replace(/^(水着|浴衣|光|闇|火|水|土|風)/, '').replace(/\(.*?\)/g, '').trim() || c.name;
  return fname + '\t' + searchName;
});
console.log(rows.join('\n'));
" > "$SCRATCH/_search_names.tsv"

count=0
while IFS=$'\t' read -r fname searchName; do
  outFile="$SCRATCH/gbfwiki/${fname}_search.html"
  if [ -s "$outFile" ] && ! grep -q "cdn-cgi/challenge-platform" "$outFile" 2>/dev/null; then
    : # already have a good file, but we can't easily tell without checking; refetch anyway below if forced
  fi
  encoded=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$searchName")
  curl -s -A "$UA" "https://gbf.wiki/index.php?search=${encoded}&title=Special%3ASearch" -o "$outFile"
  status=$(grep -c "mw-search-result-heading" "$outFile" 2>/dev/null || echo 0)
  echo "$fname ($searchName) -> results_found=$status"
  count=$((count+1))
  sleep 0.5
done < "$SCRATCH/_search_names.tsv"
echo "DONE $count"
