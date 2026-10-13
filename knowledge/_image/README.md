# ローカル画像

計算機とナレッジ文書はローカル画像だけを参照します。表示・起動・check/buildで収集しません。未保存・不正・オフラインでも名前と代替アイコンで編成選択・戦闘計算を利用できます（ローカルサーバーは必要です）。画像バイナリはGit管理・配布に含めません。素材の権利はアプリのライセンスと別に扱います。

| フォルダー | 通常版 / 低解像度版の例 |
| --- | --- |
| job | 100501_01.jpg / 100501_01_low.jpg |
| character | 3040456000_01.jpg / 3040456000_01_low.jpg |
| ability | 18_3.png / 18_3_low.png |
| bufficon | effect.png / effect_low.png |
| weapon | 1040014300.jpg / 1040014300_low.jpg |
| summon | 2040090000.jpg / 2040090000_low.jpg |

通常版と低解像度版は別ファイルです。拡張子直前の `_low` で区別し、相互に上書き・代用しません。別スタイルは `3040456000_01_st2.jpg` / `3040456000_01_st2_low.jpg` のように保持します。ナレッジIDは変えません。計算機カタログは通常版、武器文書は既存の低解像度版を参照します。

`manifest.json` は出典URL・参照文書・ローカルパス・サイズ・SHA-256・取得日時の対応表です。画像取得でナレッジの数値や検証ステータスを変更しません。

リポジトリルートで実行します。

```powershell
# 通信なし: 対象確認、参照変換/旧配置からコピー、厳密な参照/ハッシュ検証
node scripts/localize-knowledge-images.mjs --scan
node scripts/localize-knowledge-images.mjs --apply
node scripts/localize-knowledge-images.mjs --verify
```

`--apply` は未保存でも参照をローカル化して missing に記録します。`--verify` は未保存もエラーとして報告する任意の棚卸しで、アプリ起動条件ではありません。画像がないcheckoutでもcheck/buildと計算は利用できます。

収集はユーザー自身、またはユーザーが生成AIへ明示的に依頼した場合だけ行います。次のコマンドはネットワーク取得を伴い、その依頼があるときだけ実行します。

```powershell
# 登録済み対象の未保存分を通常版/low版それぞれ収集
node scripts/localize-knowledge-images.mjs --collect --both-variants
# 特定の公開静的画像を追加（各版の存在は取得結果で確認）
node scripts/localize-knowledge-images.mjs --collect --both-variants --source=https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/3040456000_01.jpg
```

固定CDNの既知の静的パスだけを直列で取得し、開始間隔最低1.5秒、タイムアウト15秒、各画像最大1MiBです。保存済み正常画像は再取得しません。リダイレクト・ゲームAPI・不正形式を拒否します。破損した既存ファイルは上書きせず、失敗は同一実行内で自動再試行しません。同時に複数の収集コマンドを起動しないでください。bufficonは手動配置用で、取得元の規則を確認するまで自動収集に対応しません。

旧配置 `knowledge/_images/cdn/` と旧manifestは移行元として残します。別checkoutから移行する場合は `--apply --legacy-root=C:/path/to/old-checkout` を使います。旧manifestのURL・SHA-256を検証してコピーし、元画像を削除しません。

Webは `/images/<分類>/<ファイル名>` で配信します。`GBF_IMAGE_DIR` にこのフォルダーの絶対パスを指定すると保存先を共有できます。旧 `GBF_THUMBNAIL_CACHE_DIR` と `/thumbnails/` は廃止しました。JPEG/PNGのみ、最大1MiB、ブラウザーキャッシュ1時間です。差し替え後はキャッシュを無視して再読み込みしてください。
