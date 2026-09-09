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
- Wikiシリーズコード: `dark opus` など → `終末の神器` などの利用者向けシリーズ名
- 効果種別: `normal-attack-up` などの内部コード → `通常攻刃`・`クリティカル確率UP` など

未定義コードは数値のまま公開せず、同期をエラー終了する。新しいコードを確認したら
`catalog-sheet-data.mjs` の対応表とテストを更新する。

## 武器カタログの列

`武器カタログ` は、基本情報に加えて次の情報を横持ちで公開する。

- 最大Lv・最大上限解放・最大スキルLv
- 最大LvおよびLv1・100・150・200・250のHP／攻撃
- 最終段階の奥義名・奥義効果
- スキル1〜4の `skill_id` とスキル名
- 検証状態・確認日・出典

最大Lvのステータス列を別に設けるのは、N・R・SRなどLv100以外が最大になる武器も
比較できるようにするため。`skill_id` はGitへの取り込み時の照合キーとして同期するが、
一般利用者向けのシート上では列を非表示にする。

奥義・シリーズ・構造化されていないスキル名は `knowledge/weapons/wiki-catalog.v1.json` を
補助データとして使う。奥義は収録段階のうち最大のものを表示し、Wiki由来の英語表記は
誤訳を避けるため原文のまま保持する。確度は `検証状態`・`確認日`・`出典` で判別する。

## 提案シートの表示名

利用者が入力する `対象種別` は日本語表示に統一する。Gitへ取り込む際は次の内部コードへ戻す。

| シート表示 | 内部コード |
| --- | --- |
| 武器スキル | `weapon-skill` |
| 武器 | `weapon` |
| 召喚石 | `summon` |
| ゲームシステム | `mechanic` |

## 実行

認証なしで変換件数とサンプルを確認できる。

```powershell
node scripts/sheets/sync-catalog-sheet.mjs --dry-run
```

実際の同期では、対象スプレッドシートIDとGoogle認証情報を環境変数で指定する。
ローカル実行では、JSON鍵を保存しない `gcloud` のサービスアカウント偽装を推奨する。

```powershell
$projectId = "modular-source-361911"
$serviceAccount = "gbf-catalog-sheet-sync@$projectId.iam.gserviceaccount.com"
$env:GBF_CATALOG_SPREADSHEET_ID = "1TatrdrmdbLmRV9DPIVCfKUnhZK_e6VvcLNnET13fi1Y"

try {
  $env:GOOGLE_SHEETS_ACCESS_TOKEN = gcloud auth print-access-token `
    --impersonate-service-account=$serviceAccount `
    --project=$projectId `
    --scopes=https://www.googleapis.com/auth/spreadsheets

  node scripts/sheets/sync-catalog-sheet.mjs
} finally {
  Remove-Item Env:GOOGLE_SHEETS_ACCESS_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:GBF_CATALOG_SPREADSHEET_ID -ErrorAction SilentlyContinue
}
```

初回だけ、`gcloud auth login` 済みのユーザーに対象サービスアカウントの
`roles/iam.serviceAccountTokenCreator` が必要になる。短期トークンは表示・保存せず、実行後に
環境変数から削除する。

JSON鍵を使う場合は `GOOGLE_APPLICATION_CREDENTIALS` または `GOOGLE_SERVICE_ACCOUNT_JSON` も
利用できるが、長期鍵の漏えい・失効管理が増えるため通常は使わない。認証情報はリポジトリへ保存しない。

サービスアカウントを使う場合は、対象ファイルの編集者に追加するだけでなく、
`武器カタログ` と `スキル・効果` の保護範囲でも編集者として許可する必要がある。
