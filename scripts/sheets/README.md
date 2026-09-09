# 公開カタログシート同期

`mcp-server/catalog/` のGit管理カタログを、Google Sheetsの閲覧用タブへ一方向同期する。
内部コードはJSON側に保持し、シートへ書き出す直前に利用者向け表示名へ変換する。

## 同期対象

- `weapons.v1.json` → `武器カタログ`
- `weapon-skills.v1.json` → `スキル・効果`

`提案`・`使い方`・`入力候補`タブは上書きしない。

## 表示名変換

- 属性: `0`〜`6` → `属性可変`・`火`・`水`・`土`・`風`・`光`・`闇`
- 武器種: `1`〜`10` → `剣`・`短剣`・`槍`・`斧`・`杖`・`銃`・`格闘`・`弓`・`楽器`・`刀`
- レアリティ: `1`〜`4` → `N`・`R`・`SR`・`SSR`
- シリーズID: `knowledge/weapons/README.md` のコード表に対応するシリーズ名

未定義コードは数値のまま公開せず、同期をエラー終了する。新しいコードを確認したら
`catalog-sheet-data.mjs` の対応表とテストを更新する。

## 実行

認証なしで変換件数とサンプルを確認できる。

```powershell
node scripts/sheets/sync-catalog-sheet.mjs --dry-run
```

実際の同期では、対象スプレッドシートIDとGoogle認証情報を環境変数で指定する。

```powershell
$env:GBF_CATALOG_SPREADSHEET_ID = "<スプレッドシートID>"
$env:GOOGLE_APPLICATION_CREDENTIALS = "<サービスアカウントJSONの絶対パス>"
node scripts/sheets/sync-catalog-sheet.mjs
```

一時アクセストークンを使う場合は `GOOGLE_SHEETS_ACCESS_TOKEN`、CIではサービスアカウントJSONを
`GOOGLE_SERVICE_ACCOUNT_JSON` に設定できる。認証情報はリポジトリへ保存しない。

サービスアカウントを使う場合は、対象ファイルの編集者に追加するだけでなく、
`武器カタログ` と `スキル・効果` の保護範囲でも編集者として許可する必要がある。
