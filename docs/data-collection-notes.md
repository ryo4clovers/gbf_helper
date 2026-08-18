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
  - **完了**: 水属性SSR 99/99体(list.jsonの全indexを処理完了。`batch_096-098.txt`まで全バッチ処理済み)。index96シャルロッテ・index97リリィ(SSR)・index98アルタイルで水属性SSRが完了した。
  - **土属性SSR収集に着手**(scratchディレクトリ`earth_ssr`)。`scratch-build-list.mjs 土`でlist.json生成(108体)→パイプラインスクリプトの`SCRATCH`定数を`earth_ssr`に書き換え→GameWith/gbf.wiki取得(gamewith/gbfwikiサブディレクトリを事前に`mkdir`しておく必要があった、無いとENOENTで失敗)→pick-and-dump(79/108体にgbf.wiki候補あり)→dossier生成(`batch_000-007.txt`〜`batch_104-107.txt`、14バッチ)まで完了。既存の`earth-ssr-seox-summer.md`はlist.jsonに同名キャラが見当たらず重複なし。
  - **完了**: 土属性SSR 108/108体(list.jsonの全indexを処理完了)。index107アレーティアで土属性SSRが完了した。
  - index107 アレーティアはgbf.wiki「Aletheia」のHP/ATKがGameWith値と完全一致せず4★/5★の中間値だったが、名称・二つ名(剣の賢者)等で同一キャラクターと確認できたため採用、`source`に注記。
  - **風属性SSR収集に着手**(scratchディレクトリ`wind_ssr`)。`scratch-build-list.mjs 風`でlist.json生成(121体)→パイプラインスクリプトの`SCRATCH`定数を`wind_ssr`に書き換え→GameWith取得(Node fetch)→gbf.wiki検索はNode fetchが403のため`scratch-fetch-gbfwiki.sh`(curl)で取得→pick-and-dump(76/121体にgbf.wiki候補あり)→dossier生成(`batch_000-007.txt`〜`batch_120-120.txt`、16バッチ)まで完了。既存の`wind-ssr-gwynne-yukata.md`はlist.jsonのindex0(浴衣グウィン)と重複のためスキップ。
  - index1 ネリエル(ネリエル・トゥ・オーデルシュヴァンク)はBLEACHコラボキャラのためgbf.wiki候補なし(想定通り)、GameWithのみで作成。
  - **進捗(風属性SSR)**: index113まで処理済み(114/121体)。続きを行う場合: `scratchpad/wind_ssr/dossiers/batch_112-119.txt` のindex114(ニオ)から読み進める。
  - index113 カルメリーナはgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終上限解放後の性能を採用。
  - index112 ペトラ(SSR)はgbf.wiki候補なし。GameWithのみで作成。最終上限解放後の性能を採用。
  - index111 アンリエットはgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終解放後の性能を中心に簡略化して記載。
  - index110 フィーナ(SSR)はgbf.wiki「Feena」のHP1320/ATK9400がGameWithと完全一致、採用。
  - index109 ロゼッタ(リミテッド)はgbf.wiki「Rosetta (Grand)」の4★時点HP2000/ATK7500がGameWithと完全一致、採用(5★限界超越可能キャラ)。最終解放後・バランス調整後の性能を中心に簡略化して記載。
  - index108 アンチラ(十二神将)はgbf.wiki候補なし。GameWithのみで作成。最終上限解放後の性能を中心に簡略化して記載。
  - index107 コルワはgbf.wiki「Korwa」のHP1520がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index106 リーシャ(リミテッド)はgbf.wiki「Lecia (Grand)」のHP1900がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。「号令」システムは複雑なため概要のみ簡略記載。
  - index105 メリッサベルはgbf.wiki「Melissabelle」の4★時点HP1060/ATK10100がGameWithと完全一致、採用(5★限界超越可能キャラ)。
  - index104 ユイシスはgbf.wiki「Yuisis」の4★時点HP1300/ATK8000がGameWithと完全一致、採用(5★限界超越可能キャラ)。2フォーム制+最終解放後の性能を中心に簡略化して記載。
  - index103 スカーサハはgbf.wiki「Scathacha」の5★時点HP1900/ATK8500がGameWithと完全一致、採用(5★限界超越可能キャラ)。最終上限解放後の性能を中心に簡略化して記載。
  - index102 水着コルワはgbf.wiki「Korwa (Summer)」のHP1550がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。2021年3月バランス調整後の性能を採用。
  - index101 浴衣ジークフリートはgbf.wiki「Siegfried (Yukata)」のHP1330/ATK9500がGameWithと完全一致、採用。バランス調整後の性能を採用。
  - index100 風ランスロットはgbf.wiki「Lancelot (Wind)」のHP1350/ATK9400がGameWithと完全一致、採用。
  - index99 リヴァイは進撃の巨人コラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index98 ティアマトはgbf.wiki候補「Tiamat Alter」が召喚石ページ(This summon has multiple versions)でありプレイアブルキャラクターと異なるため不採用、GameWithのみで作成。最終解放後の性能を中心に簡略化して記載。
  - index97 水着ジャンヌダルクはgbf.wiki「Jeanne d'Arc (Summer)」のHP1780/ATK7100がGameWithと完全一致、採用。
  - index96 セレフィラ(SSR)はgbf.wiki「Selfira」のHP1160がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。バランス調整後の性能を採用。
  - index95 モニカ(配布)はgbf.wiki候補なし。GameWithのみで作成。リミテッド版(index81)とは別バージョン。
  - index94 ユリウスはgbf.wiki「Yurius」の4★時点HP1260/ATK8900がGameWithと完全一致、採用(5★限界超越可能キャラ)。
  - index93 コッコロはプリコネコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index92 セン(SSR)はgbf.wiki候補「Sen」がHP900/ATK6750(恒常低レア版)でGameWith記載のHP1140/ATK8700(SSR)と不一致のため不採用、GameWithのみで作成。バランス調整後・最終解放(Lv100)後の性能を中心に簡略化して記載。
  - index91 風ヘルエスはgbf.wiki「Heles (Wind)」のHP1170がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index90 水着ユエルはgbf.wiki「Yuel (Summer)」のHP1620/ATK7440がGameWithと完全一致、採用。2023年9月バランス調整後の性能を採用。
  - index89 エスタリオラはgbf.wiki候補なし。GameWithのみで作成。十賢者キャラのため最終解放後・限界超越後の性能を中心に簡略化して記載。
  - index88 カッツェリーラはgbf.wiki候補なし。GameWithのみで作成。十賢者キャラのため最終解放後(Lv100)の性能を中心に簡略化して記載。
  - index87 風ヴィーラはgbf.wiki「Vira (Wind)」のHP1250/ATK9750がGameWithと完全一致、採用。
  - index86 グリームニル(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。2024年10月バランス調整後・最終解放(Lv100)後の性能を中心に簡略化して記載。
  - index85 バイヴカハはgbf.wiki「Morrigna」のHP1300/ATK8700がGameWithと完全一致、採用。
  - index84 枢木スザクはコードギアスコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index83 1年生チーム(μ's)はラブライブコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index82 スタン&アリーザはgbf.wiki「Stan and Aliza」のHP1290/ATK5020がGameWithと完全一致、採用。
  - index81 モニカ(リミテッド)はgbf.wiki「Monika (Grand)」のHP1400がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index80 風ソシエはgbf.wiki「Societte (Wind)」のHP1590がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index79 ミュオン(クリスマス)はgbf.wiki「Meteon (Holiday)」のHP1200がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index78 ガチャピンはコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index77 セルエル(クリスマス)はgbf.wiki「Seruel (Holiday)」のHP1725/ATK6505がGameWithと完全一致、採用。
  - index76 風ヨダルラーハはgbf.wiki「Yodarha (Wind)」のHP1142がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index75 グリームニル(バレンタイン)はgbf.wiki「Grimnir (Valentine)」のHP1214がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index74 高垣楓はデレマスコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index73 風ノイシュはgbf.wiki候補なし。GameWithのみで作成。
  - index72 水着アニラはgbf.wiki「Anila (Summer)」のHP1400/ATK8990がGameWithと完全一致、採用。
  - index71 水着アルベールはgbf.wiki「Albert (Summer)」のHP1210がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index70 天宮ミモリはシャドバコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index69 フロレンスはgbf.wiki「Florence」のHP1400がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index68 スーテラ(SSR)はgbf.wiki候補「Sutera」がHP1560(5★)/ATK7060(5★)でGameWith記載のHP1148/ATK8660(SSR)と不一致のため不採用、GameWithのみで作成。2025年10月バランス調整後の性能を採用。
  - index67 胡蝶しのぶは鬼滅コラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index66 シャトラ(十二神将)はgbf.wiki候補なし。GameWithのみで作成。最終解放後(Lv100)の性能を中心に簡略化して記載。
  - index65 ネクタルはgbf.wiki「Nectar」のHP1200/ATK10000がGameWithと完全一致、採用。
  - index64 ナタクはgbf.wiki「Nezha」のHP1000がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。バランス調整後の性能を採用。
  - index63 ナルメア(リミテッド)はgbf.wiki「Narmaya (Grand)」のHP1000/ATK11830がGameWithと完全一致、採用。
  - index62 ショウはgbf.wiki「Sho」のHP1100/ATK10500がGameWithと完全一致、採用。
  - index61 浴衣イングヴェイはgbf.wiki「Yngwie (Yukata)」のHP1830/ATK7630がGameWithと完全一致、採用。
  - index60 アズサはgbf.wiki「Azusa」のHP1223/ATK11485がGameWithと完全一致、採用。
  - index59 ヴェイン(ハロウィン)はgbf.wiki「Vane (Halloween)」のHP2000/ATK7860がGameWithと完全一致、採用。
  - index58 エニュオはgbf.wiki「Enyo」のHP1000がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index57 ランドルはgbf.wiki候補「Randall」がHP640/ATK4800(3★のRレアリティ)でGameWith記載のHP1280/ATK9600(SSR)と不一致のため不採用、GameWithのみで作成。2024年10月バランス調整後の性能を採用。
  - index56 イーウィヤ(恒常版)はgbf.wiki「Ewiyar」のHP1400がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。リミテッド版(index41)と相互リンク。
  - index55 風ユグドラシルはgbf.wiki「Yggdrasil (Wind)」のHP1900がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index54 フレイはgbf.wiki「Freyr」のHP1200/ATK10000がGameWithと完全一致、採用(召喚石版とは別ページのrecruitable characterページ)。
  - index53 リリゼットはFF11コラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index52 エイレアはgbf.wiki「Elea」のHP1440/ATK7200がGameWithと完全一致、採用。
  - index49 ナミ&ロビンはワンピースコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index50 水着ユーステスはgbf.wiki「Eustace (Summer)」のHP1042/ATK9190がGameWithと完全一致、採用。
  - index51 水着シオンはgbf.wiki「Shion (Summer)」のHP2000がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index47 風アリアはgbf.wiki候補なし。GameWithのみで作成。3アビのアビリティコピー対応表(80体以上)は情報量過多のため割愛。
  - index48 リッチ(ハロウィン)はgbf.wiki「Lich (Halloween)」のHP1255/ATK8925がGameWithと完全一致、採用。
  - index44 U・フライデーはgbf.wiki「Ultimate Friday」のHP1700がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index45 風シャルロッテ(リミテッド)はgbf.wiki「Charlotta (Grand)」のHP1730/ATK7560がGameWithと完全一致、採用。
  - index46 風テレーズはgbf.wiki「Therese (Wind)」のHP1305がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index40 シナモロール&ポムポムプリンはサンリオコラボキャラのためgbf.wiki候補なし(想定通り)。GameWithのみで作成。
  - index41 イーウィヤ(リミテッド)はgbf.wiki「Ewiyar (Grand)」のHP1118/ATK9410がGameWithと完全一致、採用。
  - index42 シエテ(アナザー)はgbf.wiki「Seofon (Event)」のHP1277がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。十天衆キャラのため詳細を一部簡略化。
  - index43 サンダルフォン(バレンタイン)はgbf.wiki「Sandalphon (Valentine)」のHP1580/ATK8100がGameWithと完全一致、採用。2025年10月バランス調整後の性能を採用し調整前は簡略化。
  - index38 カロはgbf.wiki「Caro」のHP1600がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index39 カンターテはgbf.wiki「Cantate」のHP1275がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index33 風キャサリンはgbf.wiki「Catherine (Wind)」のHP1150/ATK7930がGameWithと完全一致、採用。
  - index34 カグヤ(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。
  - index35 浴衣ヴァンピィはgbf.wiki「Vania (Yukata)」のHP1100/ATK9500がGameWithと完全一致、採用。
  - index36 水着アリーザはgbf.wiki「Aliza (Summer)」のHP1268がGameWithと一致(ATKはダンプ範囲外のため未検証)、採用。
  - index37 風リリィはgbf.wiki「Lily (Wind)」のHP1800/ATK6300がGameWithと完全一致、採用。
  - index29 スピナー(SSR)はgbf.wiki検索候補「Spinnah」が同キャラの別バージョン(3★基本版)ページで、HP600/ATK4200(GameWith側HP1261/ATK9696と不一致)だったため不採用、GameWithのみで作成。
  - index27 ミリン(風属性SSR)はgbf.wiki候補なし。GameWithのHP/ATK表記が「13309350」という他キャラと異なる並びで取得されたため、ATK9350/HP1330と推定して記載(要ゲーム内確認)。
  - index17 ジョイ(ハマ)はgbf.wiki検索候補「Joy (Event)」が同キャラの別バージョン(低レアリティ)ページで、HP108/ATK6000(GameWith側HP1080/ATK9011と大きく不一致)だったため不採用、GameWithのみで作成。
  - index102 サラーサも十天衆キャラで限界超越Lv150+斧/剣モードのフォームチェンジを持つ非常に複雑な仕様のため、最終上限解放+限界超越内容を大幅に簡略化して記載。gbf.wiki候補なしのためGameWithのみで作成。
  - index101 オクトーは十天衆キャラで限界超越Lv150まである非常に複雑な仕様のため、最終上限解放+限界超越内容を大幅に簡略化して記載。gbf.wiki候補なしのためGameWithのみで作成。
  - index90 マキラは十二神将キャラで最終上限解放システムと「鼓の音」固有ゲージを持つ複雑な仕様のため、最終後の内容を中心に一部簡略化して記載。gbf.wiki候補なしのためGameWithのみで作成。
  - index89 ラスティナ(SSR)はgbf.wiki検索候補「Razia」がHP2150/ATK7100(4★)で一致確認できたため採用(キャラ名「ラスティナ」と英語名「Razia」は音訳の対応関係)。
  - index87 メドゥーサ(特典)はgbf.wiki検索候補「Gorgon Sisters」がキャラクターページではなく別の関連ページ(グループ/モンスターページ)だったため不採用、GameWithのみで作成。
  - index86 ユグドラシルはgbf.wiki検索候補「Yggdrasil Alter」がキャラクターページではなく召喚石ページ(ページ内に「For the recruitable character, see Yggdrasil」と明記)だったため不採用、GameWithのみで作成。
  - index82 ブローディア(リミテッド)はgbf.wiki候補が見つからなかったため、GameWithのみで作成。name_en「Alexiel (Grand)」は水属性版Alexiel (Summer、index70)からの推定表記で未検証。両ファイルは相互リンク済み。
  - index81 ソリッズ(SSR)はgbf.wiki検索候補「Soriz」が同キャラの別バージョン(5★SR版)ページで、HP1040/ATK9000(GameWith側HP1300/ATK10200と不一致)だったため不採用、GameWithのみで作成。
  - index76 カイムも十賢者(アーカルム)キャラで最終上限解放+2026年7月実装の限界超越システムを持つ複雑な仕様のため、最終後の内容を中心に大幅に簡略化して記載。gbf.wiki候補なしのためGameWithのみで作成。
  - index75 ロベリアは十賢者(アーカルム)キャラで最終上限解放システムを持つ複雑な仕様のため、最終後(Lv100/4アビ習得済み)の内容に要点を簡略化して記載。gbf.wiki候補なしのためGameWithのみで作成。
  - index74 メドゥーサ(恒常)はgbf.wiki検索候補「Gorgon Sisters」がキャラクターページではなく別の関連ページ(グループ/モンスターページ)だったため不採用、GameWithのみで作成。既存のearth-ssr-medusa-grand.md(index20、メドゥーサ(リミテッド))とは別バージョンとして相互リンク。
  - index72 ファスティバ(SSR)はgbf.wiki検索候補「Ladiva」が同キャラの別バージョン(無印)ページで、HP1100/ATK7850(GameWith側HP1366/ATK10000と不一致)だったため不採用、GameWithのみで作成。
  - index65 ヘリヤ(SSR)はgbf.wiki検索候補「Herja」が同キャラの別バージョン(3★R版)ページで、HP840/ATK3800(GameWith側HP2020/ATK6820と不一致)だったため不採用、GameWithのみで作成。
  - index64 ペンギー(SSR)はgbf.wiki検索候補「Pengy」が同キャラの別バージョン(無印)ページで、HP2000/ATK3750(GameWith側HP1280/ATK8800と不一致)だったため不採用、GameWithのみで作成。
  - index60 黄金の騎士(アリア)はgbf.wiki候補が見つからなかったため、GameWithのみで作成。name_en「Aria」はキャラクター名からの推定表記で未検証(七曜の騎士の一人、後にGrand/Summer/Wind版が実装されるキャラの初出リミテッド版)。
  - index58 フィオリトは2024年8月バランス調整あり。調整後(最新)の性能を記載し、調整前の内容は未確認・要検証事項に割愛と明記。
  - index56 ラムレッダ(SSR)はgbf.wiki検索候補「Lamretta」が同キャラの別バージョン(無印)ページで、HP1350は一致するもののATK5600(GameWith側ATK9300と不一致)かつアビリティ構成も全く異なる別エンティティだったため不採用、GameWithのみで作成。
  - index42 ジャミル(SSR)はgbf.wiki検索候補「Jamil」がHP/ATK不一致(4★時点HP1170/ATK6650、恐らく低レアリティ版)だったため不採用、GameWithのみで作成。
  - index44 ラグナ(SSR)はgbf.wiki検索候補「Laguna」がアビリティ構成の全く異なる別エンティティ(SR版など)のページだったため不採用、GameWithのみで作成。
  - index46 シンダラは十二神将(卯)のベースキャラ。index16で先に収集した「スーパーシンダラ」(`earth-ssr-shindara-super.md`)はこのキャラのスタイルシフト形態であり、両ファイルは相互リンク済み。これで「未収集」だったベース欠落TODOは解消。
  - index33 ヤイア(SSR)はgbf.wiki検索候補「Yaia」がHP/ATK不一致(4★時点HP1515/ATK5500 vs GameWithのHP1300/ATK8800、恐らく低レアリティ版)だったため不採用、GameWithのみで作成。
  - index16 スーパーシンダラはベース十二神将「土シンダラ」のスタイルシフト形態。ベースの通常版「土シンダラ」自体はlist.jsonの108件に含まれておらず未収集のため、別途手動で確認・収集が必要(TODO)。
  - index0 水着シスは既存の`earth-ssr-seox-summer.md`と重複のためスキップ。
  - index92 ソシエ(SSR)はgbf.wiki検索候補「Sapphire Dance: Gentiana」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index93 カトル・index94 ウーノは十天衆(限界超越システム持ち)でgbf.wiki自動検索では候補なしだったが、追加調査で公式英語名がそれぞれ「Feower」「Anre」(数字連想ではない独自の英語名)と判明したため、ファイル名・name_enをこれに合わせて作成(water-ssr-feower-normal.md/water-ssr-anre-normal.md)。番号由来の名前(Quatre/Uno等)を安易に採用しないよう注意。
  - index89 ヨダルラーハ(SSR)はgbf.wiki検索候補「Yodarha」がRレアリティ版のページ(HP640/ATK4290不一致)だったため不採用、GameWithのみで作成。
  - index87 イングヴェイはノーマルスタイル/スタイルシフトの2形態を持つ複雑な仕様のため要点を簡略化して記載。gbf.wikiの取得内容がノーマルスタイル部分までで切れていたため、スタイルシフト時の性能はGameWith単独出典とした(5★時点HP2210/ATK8900一致確認)。
  - index85 シャノワールはgbf.wiki取得内容が途中(2アビ部分)で切れていたため、4アビ「スティール・ユア・ハート」のみGameWith単独出典とした(他はGameWith/gbf.wikiで4★時点HP1300/ATK8700一致確認)。
  - index80 ヴェイン(SSR)はgbf.wiki検索候補「Vane's Cooking」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - 注意: scratchpadディレクトリは実際にはリポジトリ内ではなく、セッション一時ディレクトリ(`AppData/Local/Temp/claude/<repo-slug>/<session-id>/scratchpad/`)に生成される。過去ログの相対パス表記(`scratchpad/water_ssr/...`)は実体としてはこの一時ディレクトリ配下を指す。
  - index79 ドランク(リミテッド)はgbf.wiki取得内容が途中(1アビ部分)で切れていたため、奥義とアビリティ4「ツインスフィア」のみGameWith単独出典とした(他はGameWith/gbf.wikiで4★時点HP1250/ATK7510一致確認)。
  - index74 ヴァジラはgbf.wiki候補が見つからなかったため、GameWithのみで作成(HP1140/ATK8720)。
  - index76 アンはgbf.wiki取得内容が奥義・1アビ部分で途切れていたため、4アビ「ダイモーンリコール」のみGameWith単独出典とした(他はGameWith/gbf.wiki両方で確認、HP1615/ATK7925(4★)一致)。
  - index30 エリン(SSR)はgbf.wiki検索候補「Erin」がHP/ATK不一致(低レアリティ版、HP1420/ATK4800 vs GameWithのHP1810/ATK6250)だったため不採用、GameWithのみで作成。
  - index32 エリカはgbf.wiki検索候補「Erica Fontaine」がHP/ATK不一致(低レアリティ版、HP1100/ATK4000 vs GameWithのHP1600/ATK8000)だったため不採用、GameWithのみで作成。
  - index11 ジョエルはgbf.wiki検索候補「Joel」がHP/ATK不一致(低レアリティ版、HP820/ATK3900 vs GameWithのHP1900/ATK5700)だったため不採用、GameWithのみで作成。
  - **命名訂正**: index10(エッセル(ハロウィン))のgbf.wiki候補ページで正式英語名が「Tien」と判明(HP/ATK完全一致で確認)。既存の`fire-ssr-essel-normal.md`(GameWithのみで作成、火属性エッセル)を`fire-ssr-tien-normal.md`にリネームし、`name_en`を`Essel`→`Tien`に訂正。今後エッセル関連キャラは`tien`の英語名で統一する。
  - index5 アンジェはgbf.wiki検索候補「Ange」がHP/ATK不一致(無印バージョン、HP1250/ATK6250 vs GameWithのHP1266/ATK9670)だったため不採用、GameWithのみで作成。
  - index85 テレーズ(SSR)はgbf.wiki検索候補「Therese」が別バージョン「[Bunny Duelist] Therese」ページ(HP1250/ATK6250)にリダイレクトされ、目的の「Therese (SSR)」ページではなかったため不採用、GameWithのみで作成。
  - index74 コロッサスはgbf.wiki検索候補「Colossus Alter」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index51 エルモート(SSR)はgbf.wiki検索候補「Elmott」がHP/ATK不一致(低レアリティ版、HP900/ATK6750 vs GameWithのHP1125/ATK8775)だったため不採用、GameWithのみで作成。
  - index45 シルフはgbf.wiki検索候補「Sylph, Flutterspirit of Purity」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。
  - index41 アンナ(SSR)はgbf.wiki検索候補「Anna」がHP/ATK不一致(低レアリティ版、HP640/ATK4800 vs GameWithのHP1250/ATK9800)だったため不採用、GameWithのみで作成。
