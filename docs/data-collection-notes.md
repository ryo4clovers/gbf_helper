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
- 「光○○」「闇○○」のように属性接頭辞だけが付いたキャラ(水着/浴衣等のタグなし)は、gbf.wiki側では `Name (Light)` `Name (Dark)` のように英語属性名の括弧付きページになっている。属性接頭辞を無視して素の名前だけで検索すると、無関係な別属性版(素のページ)にマッチしてしまうことがある(実例: 「光アンリエット」が風属性の素の「Arriet」にマッチし、全く別のスキル構成を誤って参照しかけた)。検索候補の中に `(Light)` 等属性名の付いた版があるかを必ず確認し、無ければ「対応ページなし」として素のページを安易に採用しないこと。
- **バックグラウンドで`bash script.sh &`のように実行する場合、シェル変数(`export`したもの)はBashツールの呼び出しをまたいで引き継がれない**(ツールの仕様上、作業ディレクトリは引き継がれるがシェル状態は引き継がれない)。スクリプト内で使うパスは、外部の環境変数に頼らずスクリプト自身の先頭で直接定義すること。これを怠ると、curl等が空パスに書き込もうとして静かに失敗し、古いファイルが上書きされないまま「成功」したように見えることがある(実際に発生し、修正版のデータのはずが古い誤ったデータのまま残っていた)。

## 実機(ログイン済みブラウザ)でできること・できないこと

Claude in Chrome(実際にログイン済みのChrome、接続名 `for_gbf`)経由で `game.granbluefantasy.jp` に直接アクセス可能(2026-08-18に動作確認、所持キャラ161体のアカウント)。

- できる: アカウントが**所持しているキャラ**の情報確認・検証。ガチャ画面の武器紹介などから声優名なども拾える。
- できない: **未所持キャラ**の全スキル一覧の閲覧。ゲーム内に「未所持キャラの図鑑」に相当する画面がなく、「リスト」機能は所持キャラのみを表示する。出たばかりのガチャ限定キャラ(未所持)はこの方法では確認できないため、外部サイトやX/YouTubeでの確認に頼ることになる。

## キャラクターデータの収集優先順位(2026-08-18時点の方針)

- R・SRキャラは後回しにし、**SSRキャラをリリースが新しい順**に集めていく。
- 順序は GameWithのSSRキャラ評価一覧(https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/20722 、デフォルトで新しい順)を基準にする。
- コラボキャラ(BLEACHコラボ等)も対象に含める(除外しない)。
- 個別キャラの進捗は [knowledge/characters/README.md](../knowledge/characters/README.md) のファイル一覧表を参照。

### 進行中の作業(2026-08-18): 光属性SSR 121体の一括収集

ユーザーの指示で、GameWithの「光属性」フィルタ適用後のSSR一覧(新しい順、121体、コラボ含む)を全件データ化する作業を進行中。GameWith+gbf.wikiクロスチェック方式。

- 収集パイプラインのスクリプトは [scripts/data-collection/](../scripts/data-collection/) に配置(`scratch-fetch.mjs` → `scratch-fetch-gbfwiki.sh` → `scratch-pick-and-dump.mjs` → `scratch-build-dossier.mjs` の順で実行する使い捨てスクリプト群、Node.jsのみで動作)。取得済みHTML・パース済みテキストなどの作業用データ自体は `%TEMP%/claude/.../scratchpad/light_ssr/` 配下(セッション固有のスクラッチ領域)に置いており、リポジトリには含まれない。
  - `list.json`: 121体の一覧(新しい順、element/tag/href)。
  - `picks.json`: 各キャラに対応するgbf.wiki候補ページの選定結果。属性接頭辞パターン(光○○等)は対応する `(Light)` 等のページが見つからない場合 `candidate: null` にしている(10体、要手動確認)。
  - `dossiers/batch_XXX-YYY.txt`: 8体ずつにまとめたGameWith+gbf.wikiの生テキスト。
- **進捗**: list.jsonのインデックス0〜120まで**全件処理完了**(index 0の水着ハイラは既存の`light-ssr-payila-summer.md`と重複のためスキップ、実質120体新規作成、既存1体と合わせて121体の光属性SSRキャラを収集済み)。
  - index115 光ソフィアはgbf.wiki候補が最初から存在しない(picks.jsonでcandidate: null)ため、GameWithのみで作成(`light-ssr-sophia-light.md`)。
  - index117 水着レフィーエ、index119 光サルナーンもgbf.wiki候補が最初から存在しない(candidate: null)ため、GameWithのみで作成(`light-ssr-lefiya-summer.md`、`light-ssr-sarunan-light.md`)。
  - index120 レ・フィーエ(無印)はGameWith(HP1930/ATK6400)とgbf.wiki候補「De La Fille」(5★時HP1900/ATK7600、4★時ATK6400)でATKは4★時に完全一致したがHPに若干差異があった。称号・声優・実装日・バージョン一覧(水着/浴衣/土)が完全一致したため同一キャラと判断し採用(`light-ssr-lefiya-normal.md`)。差異は要検証事項として記録。
- **光属性SSR 121体の収集作業が完了**(2026-08-18)。今後、他属性・他レアリティのキャラクター収集に着手する場合は、本セクションと同様の手順(GameWith SSR一覧の属性フィルタ→GameWith+gbf.wikiクロスチェック→命名規則に沿ったファイル作成→README.md/本メモの更新)を踏襲する。
  - index92 ロボミ(SSR)はgbf.wiki検索候補が召喚石ページ(「Robomi Rocket」)だったため不採用、GameWithのみで作成。
  - index94 銃ゾーイ(SSR)はgbf.wiki検索候補が無関係のページ(「Side-scrolling Quotes」)だったため不採用、GameWithのみで作成。
  - index100 バウタオーダ(SSR)はgbf.wiki検索候補「Baotorda」がHP/ATK不一致の別バージョン(SSR以外)だったため不採用、GameWithのみで作成。
  - index105 ロザミア(SSR)はgbf.wiki検索候補「Rosamia」がHP/ATK不一致の別バージョン(Rレアリティ版)だったため不採用、GameWithのみで作成。
  - index106 ゾーイ(SSR)はgbf.wikiページの内容が取得できなかったため不採用、GameWithのみで作成。
  - index107 フェリ(SSR)はgbf.wiki検索候補「Ferry」がHP/ATK不一致の別バージョンだったため不採用、GameWithのみで作成。
  - index45 光ヨウ(SSR)はgbf.wiki候補が見つからずGameWithのみで作成(`light-ssr-yoh-light.md`)。GameWithページに2025年8月バランス調整前後の数値が混在していたため、調整後(最新)の内容を採用。
  - index47 ユニ(リミテッド)はリミテッド無印フォールバックが無効化された状態でも`Yuni`(Grand版)ページが正しくヒットし、HP/ATK/入手武器の一致で確認できた(`light-ssr-yuni-grand.md`)。
  - index54 光アーサーはgbf.wiki候補が見つからずGameWithのみで作成(`light-ssr-arthur-light.md`、release_dateは不明として要確認扱い)。
  - **2026-08-18: ファイル命名規則を変更**。旧: `{英語名}[-バージョン]-{レアリティ}.md` → 新: `{属性}-{レアリティ}-{英語名}-{バージョン}.md`(バージョンなしは`normal`)。既存74ファイル全てをリネームし、frontmatterの`id`も同期済み。詳細は [knowledge/characters/README.md](../knowledge/characters/README.md) の運用ルールを参照。
- 候補選定ロジックの最終フォールバック(`candidates[0]`を無条件で返す処理)も誤爆(マコラ「十二神将」タグが無関係な2025年バレンタイン版にマッチ)したため削除し、未知タグは常にnullを返すよう統一した。
- 「リミテッド」タグの無印ページ・フォールバックは的中率が低い(Caesar/Basaraは正解だったがSandalphon/Cosmosは武器/召喚石ページに誤爆)と判明したため無効化した(`scratch-pick-and-dump.mjs`)。以降のリミテッドタグは自動的にnullになるので、都度手動確認が必要。gbf.wiki候補が見つからず/信頼できずGameWithのみで作成したキャラ(光ミニゴブ、光ナーヴェ、サンダルフォン(リミテッド)、ロベルティナ(光)、ボレミア(光)、光ヨウ、光アーサー、マイシェラ、フェザー、ニュージェネ、2年生チーム(μ's)、クビラ(十二神将))あり。
  - index83 クビラ(十二神将)は「十二神将」タグ(未マッピング)でgbf.wiki候補が返らず、代わりに検索1位の`Kumbhira (Event)`(低レアリティ版、HP/ATK不一致)を誤って候補に採用しかけたが、マコラ等と同様にHP/ATK照合で不一致を検出しGameWithのみで作成。
- 候補選定ロジックは複数回のバグ修正を経て安定(詳細は上記「取得方法の技術メモ」参照)。`picks.json`は最新の修正を反映済みなので、再利用時に再修正は不要。季節タグ(ハロウィン/クリスマス/バレンタイン)は実際には「(Holiday)」という汎用英語ページ名になっているケースが多いことが判明。
- 続きを行う場合: `dossiers/batch_112-119.txt` から読み進める。scratchディレクトリが失われている場合は [scripts/data-collection/](../scripts/data-collection/) 内のスクリプトを `scratch-fetch.mjs`(GameWith一括取得)→`scratch-fetch-gbfwiki.sh`(gbf.wiki検索結果取得)→`scratch-pick-and-dump.mjs`(候補選定+ダンプ)→`scratch-build-dossier.mjs`(最終ダンプ生成)の順で再実行すれば同じデータを再構築できる。

### 進行中の作業(2026-08-18〜): 全属性・全レアリティへの拡大(「全キャラクタデータの取得」ゴール)

光属性SSR 121体の収集完了後、`全キャラクタデータの取得`という広いゴールに対応するため、残りの属性(火/水/土/風/闇)のSSR、その後SR/Rへと収集範囲を拡大する作業を開始した。

- **収集パイプラインを汎用化**: 新規スクリプト [scripts/data-collection/scratch-build-list.mjs](../scripts/data-collection/scratch-build-list.mjs) を追加。`node scratch-build-list.mjs <属性(漢字1文字)> <scratchディレクトリ絶対パス>` で、GameWithのSSR一覧ページ(新しい順)を取得・パースし、指定属性でフィルタした`list.json`を生成する(以前は光属性版のみ手動で作られていた)。パース対象は `<li data-attr='属性' data-kana='...'><a href='...'>...<div class='_n' rel='タグ'>名前</div>` という構造(シングルクォート、`rel`属性はタグ無しの場合省略される点に注意)。
- 既存の `scratch-fetch.mjs` / `scratch-fetch-gbfwiki.sh` / `scratch-pick-and-dump.mjs` / `scratch-build-dossier.mjs` は内部の `SCRATCH` 定数を書き換えるだけで属性ごとに使い回せる(現在は `fire_ssr` を指す状態)。属性を切り替える際は該当ファイル内の `SCRATCH =`/`SCRATCH=` 行のディレクトリ名を書き換えること。
- Node.jsの`fetch`はgbf.wikiの検索ページ(`index.php?search=...`)に対して403(Cloudflare)を返すため、gbf.wiki検索結果の取得は必ず`scratch-fetch-gbfwiki.sh`(curl経由)を使うこと。GameWith本体のページ取得は引き続きNode `fetch`で問題ない。
- **火属性SSR 111体**の収集に着手(list.json構築・GameWith/gbf.wiki取得・候補選定・ダウジエ生成まで完了、`scratchpad/fire_ssr/`)。79/111体にgbf.wiki候補あり、32体は`candidate: null`(手動要確認)。既存の`fire-ssr-percival-normal.md`はlist.jsonのindex102「パーシヴァル」(無印)と重複するためスキップする。
- 収集順序は光属性の時と同様「GameWithのSSRキャラ評価一覧の新しい順」を各属性ごとに適用する(全属性を横断した1つの時系列ではなく、属性ごとに独立した新しい順リスト)。属性を一巡したら次はSR、その次はRという優先順位([キャラクターデータの収集優先順位](#キャラクターデータの収集優先順位2026-08-18時点の方針)を参照)。
- **進捗(火属性SSR)**: list.jsonのインデックス0〜20まで処理済み(21/111体)。既存の`fire-ssr-percival-normal.md`はindex102「パーシヴァル」(無印)と重複するため、その番になったらスキップする。
  - index5 ルリア(SSR)はgbf.wiki検索候補「Lyria (Event)」がHP/ATK不一致(低レアリティ版、HP770/ATK5280 vs GameWithのHP1380/ATK8300)だったため不採用、GameWithのみで作成。ページ内に別バージョン「Lyria (Event SSR)」の存在が示唆されていたが未取得。属性が「主人公と同属性」という特殊仕様のため、便宜上「火」として分類(要注記)。
  - index18 さとはgbf.wiki検索候補「Magus, Triad of Wisdom」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index19 チチリは「四聖」シリーズキャラ(玲瓏佩強化によるフェイトエピクリアで段階強化される仕様)。gbf.wiki候補が見つからずGameWithのみで作成。
  - **完了**: 火属性SSR 111/111体(list.jsonの全indexを処理完了。index102パーシヴァルは既存ファイルと重複のためスキップ、実ファイル数110新規+既存1=計111)。`batch_104-110.txt`まで全バッチ処理済み。
  - **水属性SSR収集に着手**(scratchディレクトリ`water_ssr`)。`scratch-build-list.mjs 水`でlist.json生成(99体)→パイプラインスクリプトの`SCRATCH`定数を`water_ssr`に書き換え→GameWith/gbf.wiki取得→pick-and-dump(67/99体にgbf.wiki候補あり)→dossier生成(`batch_000-007.txt`〜`batch_096-098.txt`、13バッチ)まで完了。既存の`water-ssr-*.md`ファイルは無し(重複スキップ対象なし)。
  - **進捗(水属性SSR)**: index9まで処理済み(10/99体)。続きを行う場合: `scratchpad/water_ssr/dossiers/batch_008-015.txt` の index10(エッセル(ハロウィン))から読み進める。
  - index5 アンジェはgbf.wiki検索候補「Ange」がHP/ATK不一致(無印バージョン、HP1250/ATK6250 vs GameWithのHP1266/ATK9670)だったため不採用、GameWithのみで作成。
  - index85 テレーズ(SSR)はgbf.wiki検索候補「Therese」が別バージョン「[Bunny Duelist] Therese」ページ(HP1250/ATK6250)にリダイレクトされ、目的の「Therese (SSR)」ページではなかったため不採用、GameWithのみで作成。
  - index74 コロッサスはgbf.wiki検索候補「Colossus Alter」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index51 エルモート(SSR)はgbf.wiki検索候補「Elmott」がHP/ATK不一致(低レアリティ版、HP900/ATK6750 vs GameWithのHP1125/ATK8775)だったため不採用、GameWithのみで作成。
  - index45 シルフはgbf.wiki検索候補「Sylph, Flutterspirit of Purity」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index41 アンナ(SSR)はgbf.wiki検索候補「Anna」がHP/ATK不一致(低レアリティ版、HP640/ATK4800 vs GameWithのHP1250/ATK9800)だったため不採用、GameWithのみで作成。
