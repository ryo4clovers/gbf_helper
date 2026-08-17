# データ収集メモ

`knowledge/` を充実させていく上での、情報源・収集方法・運用方針をまとめる作業メモ。
セッションをまたいでも参照できるよう、リポジトリ内で管理する(Claude側の一時的な記憶には残さない)。

## 情報の種類ごとの取得元

| データ種別 | 取得元 | 備考 |
| --- | --- | --- |
| スキル・アビリティのテキスト/数値 | GameWith、gbf.wiki、灰机wiki(huijiwiki)などの外部サイト | 複数サイトでクロスチェックする |
| キャラ画像などの素材 | 本家グラブル(公式) | ライセンス上も正しい取得元 |
| ユーザーの所持状況(所持キャラ・武器・召喚石) | 本家グラブル(ログイン済みブラウザ経由) | 将来の最適編成機能で利用予定 |
| ダメージ計算の検証(実戦闘結果との突き合わせ) | 本家グラブル(ログイン済みブラウザ経由) | 将来のダメージ予測ツールで利用予定 |

## 信頼できる情報源(スキル・数値データ)

- **GameWith グラブル攻略Wiki** — https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/ (`グランブルーファンタジー.gamewith.jp` のPunycode表記)。日本語かつ更新が早く、数値の一次候補。
- **gbf.wiki** — https://gbf.wiki/ — 英語のコミュニティWiki。スキルテーブルが構造化されていて読みやすい。
- **灰机wiki(huijiwiki)** — https://gbf.huijiwiki.com/ — 中国語のグラブルWiki。クロスチェック用。
- **X(旧Twitter)・YouTube** — 公式のバランス調整告知や、直近実装されたばかりでWikiに情報がないキャラの新キャラ紹介動画・公式ブログ記事の確認に使う。

**信頼しない情報源**: `gbf-wiki.com`(`gbf.wiki` とは別ドメイン)。情報が古いことがあるため使わない。紛らわしいので要注意。

## 取得方法の技術メモ

- **GameWithはClaudeの内蔵ブラウザ(Browser pane)で開くとアプリごとクラッシュする**(広告関連が原因と推測)。GameWithのページは `curl -A "<ブラウザ相当のUser-Agent>" <URL> -o file.html` で取得し、Node等でHTMLをパースする方式を使うこと。WebFetchツールでも200は返るが、日本語キャラ名が誤訳される(例: 「水着ヨウ」→"Water Yo")ため、正確な名前・数値が必要な作業には不向き。
- GameWithのSSRキャラ評価一覧(`/article/show/20722`)は `<ol id="GBFCharactorList"><li data-attr='属性' data-kana='...'>...` という構造で、デフォルトで「新しい順」の全キャラが埋め込まれている。この構造を直接パースすれば新着順リストが取れる。
- **gbf.wikiはBrowser paneで問題なく開ける**(クラッシュしない)が、WebFetchツールからは403 Forbiddenが返る。gbf.wikiを見る際はBrowser paneかブラウザ相当のUser-AgentでのcurlでUAを使うこと。
- GameWithはキャラ名が日本語のみで英語名が分からない。gbf.wikiで日本語名のまま検索する(`https://gbf.wiki/index.php?search=<日本語名>&title=Special:Search`)と、infobox内の `NameJP` 欄でマッチする英語ページ名が分かる。音訳では類推できない対応も多い(例: シス→"Seox"、ハイラ→"Payila")。

## 実機(ログイン済みブラウザ)でできること・できないこと

Claude in Chrome(実際にログイン済みのChrome、接続名 `for_gbf`)経由で `game.granbluefantasy.jp` に直接アクセス可能(2026-08-18に動作確認、所持キャラ161体のアカウント)。

- できる: アカウントが**所持しているキャラ**の情報確認・検証。ガチャ画面の武器紹介などから声優名なども拾える。
- できない: **未所持キャラ**の全スキル一覧の閲覧。ゲーム内に「未所持キャラの図鑑」に相当する画面がなく、「リスト」機能は所持キャラのみを表示する。出たばかりのガチャ限定キャラ(未所持)はこの方法では確認できないため、外部サイトやX/YouTubeでの確認に頼ることになる。

## キャラクターデータの収集優先順位(2026-08-18時点の方針)

- R・SRキャラは後回しにし、**SSRキャラをリリースが新しい順**に集めていく。
- 順序は GameWithのSSRキャラ評価一覧(https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/20722 、デフォルトで新しい順)を基準にする。
- コラボキャラ(BLEACHコラボ等)も対象に含める(除外しない)。
- 個別キャラの進捗は [knowledge/characters/README.md](../knowledge/characters/README.md) のファイル一覧表を参照。
