# データ収集メモ

`knowledge/` を充実させていく上での、情報源・収集方法・運用方針をまとめる作業メモ。
セッションをまたいでも参照できるよう、リポジトリ内で管理する(Claude側の一時的な記憶には残さない)。

## 今後の追加候補(2026-08-20時点)

現状: `characters/`(SSR/SR/R全1018体)と`summons/`(SSR全268体、召喚ターン情報込み)が収集完了。残りは大きく分けて「未着手のカテゴリ」「既存データの穴埋め」の2種類。

### 優先度高: mechanics/ の中身を書く(12トピック、全て未着手)

`knowledge/mechanics/`には12個のファイルが存在するが、**全てYAML的なプレースホルダーのままで本文が空**(`_template.md`の雛形が入っているだけ)。characters/summonsのほぼ全ファイルが「関連トピック」として`buffs-debuffs.md`と`damage-cap-modifiers.md`にリンクしているため、実質的にリンク先が空という状態になっている。ダメージ計算ツール等の土台にもなる部分なので、収集効率で言えばキャラ/召喚石よりも投資対効果が高い可能性がある。優先順は:

1. `damage-calculation.md` — ダメージ計算式の骨格(基礎ダメージ・属性補正・弱点/耐性・乱数幅など)
2. `damage-cap-modifiers.md` — 背水/渾身/ザ・ワールド等、上限/係数に関わるパッシブの分類と数値
3. `buffs-debuffs.md` — バフ/デバフの種類、重複ルール(加算/乗算/別枠)
4. `elements.md` — 属性相性(有利locations 1.5倍/不利0.75倍等)
5. `charge-attack-chain-burst.md`, `abilities.md`, `character-growth.md`, `summon-aura-types.md`, `team-building-basics.md`, `battle-flow.md`, `multi-battle.md`, `glossary.md` — 上記4つより優先度は落ちるが、いずれ埋める

情報源は公式サイト/公式Twitterの仕様解説記事や、GameWithの「グラブル 基本用語集」的なまとめ記事が使えそう。数値は検証難易度が高いものもあるため、`要検証`のマーキング運用を徹底する。

### 優先度中: weapons/(武器)の収集(未着手、テンプレートも無し)

`knowledge/weapons/`はディレクトリだけあってファイルが1つも無い。README記載の3大個別データカテゴリ(キャラ/召喚石/武器)のうち唯一手つかず。進め方はsummonsと同じ型が使えるはず:

1. `_template.md`を作成(武器の場合はスキル1〜3、EXスキル、上限解放後ステータス、加護タイプ〈通常/EX/HELL〉あたりが軸になりそう)。
2. MCPサーバーに`list_weapons`/`search_weapons`/`get_weapon`ツールを追加(charactersと同じパターン)。
3. GameWithに武器の一覧ページがあるか確認(召喚石と同様に「SSR武器評価一覧」のような単一ページが存在する可能性が高い、召喚石一覧ページの関連記事欄に「SSR武器」へのリンクが実際にあった)。あればsummonsのパイプラインをほぼそのまま転用できる。
4. スコープはsummonsと同様「SSRのみ、コラボ含む」から始めるのが無難(SR/Rは情報源が薄い可能性が高い)。

### 優先度低〜要相談: events/・misc/(共に空)

- `events/`はイベント情報用のディレクトリだが中身無し。イベントは数が非常に多く時限性もあるため、「何を集めるか」のスコープ定義自体が必要(例: 恒常化した狩り場イベントのみ/現在開催中のイベントのみ等)。着手前にユーザーとスコープを相談すべき。
- `misc/`は雑多カテゴリで、そもそも何を入れるべきか未定義。

### 既存データの穴埋め(いつでも着手可能)

- **summons**: 各ファイルの「未確認・要検証事項」に記載した個別の要検証項目(サブ加護効果の正確な倍率が不明なもの、召喚ターン情報が段階別に分離できなかったもの約41体、gbf.wiki候補が見つからずGameWithのみで作成したもの)。5★/6★(限界超越)まで存在する召喚石の上位段階データも未収録。SR/R召喚石は情報源が薄いため対象外にしているが、良い情報源が見つかれば着手余地あり。
- **characters**: 各ファイルの「未確認・要検証事項」に記載したHP/ATK不一致・EXアビリティ有無の未検証・リリース日不明なもの。
- **全体**: 現状すべて`status: 下書き`(二次情報ベース)。実機でのスキル効果・数値確認を経て`status: 検証済み`に格上げしていく作業は、優先度の高いキャラ/召喚石/武器から段階的に進めるのが現実的(全件を一気に検証するのは非現実的)。

### さらに先(knowledge/ が充実してから)

READMEに記載の最終目標(「生成AIのRAGソースとして活用」)や、data-collection-notes.md内で言及していた「最適編成機能」「ダメージ予測ツール」は、`knowledge/`のデータを使う**アプリケーション層**の話であり、まだ着手していない。mechanics/の中身(特にダメージ計算式)が埋まってからでないと現実的に着手しづらいため、上記の優先度高タスクの後に検討するのが自然な順序。

## 編成要素: 武器・ジョブ(主人公)の収集(2026-09-03着手)

`knowledge/weapons/`(武器)と`knowledge/jobs/`(主人公専用のジョブ/クラス)の収集に着手。ユーザーとのスコープ確認結果:

- **武器**: SSRの中でもさらに絞った最上位のみ(天星器/アーカルム/リミテッド等)。**収集対象リストはユーザーが自分で指定する**ため、リストが提示されるまで着手しない。天星器は`article/show/23096`に10種類(十天衆1体につき1種)が1ページにまとまっており、3段階(解放前/『真』以降/最終段階)の奥義進化がある。
- **ジョブ**: 全クラス(ClassI〜V、エクストラ、エクストラII、オリジン)が対象。収集内容はアビリティ・奥義・基本ステータス(HP/ATK、ジョブ補正等)。まずは全ジョブのカタログ化(名前・クラス・得意武器)のみ実施し、個別ファイルの本文収集はこれから([knowledge/jobs/README.md](../knowledge/jobs/README.md)にカタログ掲載)。

### ジョブ一覧の取得方法と注意点

GameWith「ジョブ評価一覧」記事(`article/show/21314`)から機械的に抽出。ハマった点:

- 記事内は「クラス別セクション」に分かれているが、**ClassI/ClassIIの2セクションだけ評価点(メイン評価/取得優先度)が付与されておらず、フォーマットが他と異なる**(名前の直後に評価マーカーが無く、いきなり【習得条件】が来る)。評価マーカー(`メイン評価:N点取得優先度:N点`)を使った抽出ロジックだけではこの20ジョブが丸ごと欠落するため、別ロジックで拾う必要があった。結果的に「61ジョブ」という初期集計はこの20ジョブを含んでいない誤りだったと判明、正しくは全80ジョブ。
- 得意武器は基本的に`格闘|短剣|楽器|杖|弓|銃|剣|槍|斧|刀`の単一トークン×2で構成されるが、ClassI/ClassIIのテーブルだけ`拳`(格闘の意)や`短`(短剣の省略)という別表記が使われている箇所があり、正規化が必要だった。ただしこれらのトークンを他セクションの抽出にも流用すると、「メイン武器が短剣の時」のような説明文中の「短剣」を誤って武器欄と誤認する回帰が起きるため、**ClassI/ClassII専用の緩い許容パターンとして分離**した。
- 名前とその直前のジョブの得意武器がまとめて1つの正規表現で抽出される構造のため、次ジョブ名が武器トークンと同じ文字(例: 「剣豪」「剣聖」の頭文字「剣」)で始まると、貪欲マッチが直前ジョブの武器を1トークン分多く食ってしまい、名前が「豪」「聖」に化けるバグがあった → 各トークンを2回までではなく1回のみにマッチさせる(`{1,2}`→なし)ことで解消。
- オリジンセクションに実在しないジョブ(「Class.Vジョブ一覧スマヒヒト」)が混入していたのは、ソース側のHTMLコメント(`<!-- -->`)の残骸が原因。タグ除去の前にHTMLコメントを除去することで解消(本来のオリジンは3ジョブ: ファイター/ランサー/ウィザードのみ)。

### 未対応の課題

- ユーザーからのフィードバック: 「tag名などは、実際のグラブルのサイトやAPIのレスポンスから解析&取得するのがいいのかなと思っています」— GameWith等の二次情報テキストのパースだけでなく、可能であれば本家グラブルのサイト/APIレスポンスから正準的な値を取得する方式を検討すべき、との指摘。まだ調査・実装は未着手。実機ブラウザ(Claude in Chrome経由、`game.granbluefantasy.jp`)でジョブ画面のネットワークリクエストを覗いて構造化データが取れるか、という切り口が有力そうだが未検証。個別ジョブの本文収集を始める前後で調査する。

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

## 召喚石データ収集のパイプライン(2026-08-20〜)

キャラクター収集完了後、召喚石(SSRのみ、SRは情報源が乏しいため対象外、コラボ召喚石は収集対象に含める)の収集に着手。キャラクターと異なり、GameWithに**単一ページで全SSR召喚石(約269件)の加護効果/召喚効果/ステータスがまとまった一覧ページ**が存在するため、個別ページを1体ずつ巡回する必要がない:

- **一覧ページ**: `https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136372`(「SSR召喚石の加護効果/召喚効果一覧」)。`class="w-instant-database-list"` 内の `<table>` に、1召喚石につき3つの `<tr class="w-idb-element zoN ... " data-col1="名前">` 行(①名前/リンク/入手方法/ATK・HP、②【加護効果】、③【召喚効果】)が連続して並ぶ構造。`zoN` は属性コード(gbf.wikiと同じ番号: 1=火, 2=水, 3=土, 4=風, 5=光, 6=闇)。
- ATK/HPは「基本値 (括弧内の値)」の形式で、基本値=gbf.wikiのLevel100(3★)、括弧内=Level150(4★)にそれぞれ一致することを複数サンプルで確認済み(ルシフェル、ザ・サンで検証)。本プロジェクトでは4★(4凸)時点までを「最終上限解放」としてステータス表に記載する方針(5★/6★のトランセンデンス階梯まで解放可能な召喚石も一部存在するが、GameWithの標準表記に合わせて対象外とし、未確認・要検証事項に注記する)。
- 専用パーサ `scripts/data-collection/scratch-build-summon-list.mjs <属性(漢字)> <scratch-dir>` を作成。一覧ページのHTML(初回のみfetch、以降は `_raw_list_page.html` をキャッシュ利用)から269件をパースし、指定属性でフィルタして `list.json` に書き出す(名前・href・属性・入手方法・ATK/HP基本値と最大値・加護効果生テキスト・召喚効果生テキストを含む)。
- gbf.wikiでのHP/ATKクロスチェックは、既存の `scratch-fetch-gbfwiki.sh`(list.jsonの `.name` フィールドを読んでcurl経由でgbf.wiki検索する仕組み)がそのまま流用できる。ただしgbf.wiki側の召喚石ページ名は日本語名の音訳だけでは類推できないことがある(例: ルシフェルの召喚石ページは英語版キャラ「Lucifer」と同名の `/Lucifer` で、検索結果に紛らわしい関連ページ「Lucifer (NPC)」等が混在するため要目視確認)。
- 加護効果テキストは、単純な召喚石は「メイン加護効果」のみの記載(サブ加護効果の数値はGameWith一覧に明記されないことが多く、未確認・要検証事項に注記)。「ザ・サン」のように「メイン効果:」「サブ効果:」が明記されている召喚石は、その通りに加護効果(メイン編成時)/サブ加護効果(サブ編成時)へ振り分ける。
- 完了サンプル: `light-ssr-lucifer-normal.md`(単純な加護効果のみのケース)、`fire-ssr-the-sun-normal.md`(メイン/サブ効果が明確に分かれる複雑なケース)。

## 召喚石データ収集完了(2026-08-20)

SSR召喚石、火・水・土・風・光・闇の全六属性(コラボ・イベント産含む、SRは情報源が乏しいため対象外)の収集が完了した。最終内訳:

- 火39、水41、土42、風49、光49、闇48 = 合計268体(一覧ページの生パース時点では269件だったが、GameWith側のHTML崩れで「サリエル(クリスマス)」が2行に分裂していたのを1体にマージしたため268体が正しい総数)。

半自動パイプラインの構成(`scripts/data-collection/`):

1. `scratch-build-summon-list.mjs <属性> <scratch-dir>` — GameWith一覧ページ(article/show/136372)から指定属性の全召喚石を抽出、`list.json`に書き出す。
2. `scratch-fetch-gbfwiki.sh <start> <end>` — 各召喚石名でgbf.wikiを検索し、候補ページ一覧を取得(既存の文字コード系キャラ収集スクリプトを流用)。
3. `scratch-pick-and-dump-summons.mjs <scratch-dir>` — 検索結果から最も妥当な候補を自動選定(「(Summon)」「(SSR)」優先、次に唯一のbare候補)し、`picks.json`と`fetch_pages.sh`を生成。自動選定できなかったもの(だいたい3〜4割)は手動でgbf.wiki検索・直接URL(`Base_Magna`形式など)で個別に解決。
4. `fetch_pages.sh` — 選定したgbf.wikiページを一括curl取得。
5. `scratch-verify-summon-stats.mjs <scratch-dir>` — GameWithのATK/HPとgbf.wikiのLevel100(3★)/Level150(4★)を突き合わせ、MATCH/PARTIAL_MATCH/MISMATCH/NO_CANDIDATEを判定する`verify_report.txt`を生成。
6. `scratch-generate-summon-files.mjs <scratch-dir> <属性英語> <out-dir>` — list.jsonの効果テキストとverify_reportのステータスからMarkdownファイルを一括生成。

判明した注意点:
- GameWithの一覧ページは「基本値」のみ表示し、実際はさらに上のレベル帯(gbf.wikiのLv150)が存在する召喚石が一定数ある(シヴァ、ウィルナスなど)。ステータス欄は「GameWithのatk===atk_maxかどうか」ではなく「gbf.wiki自体にLv150行があるかどうか」を正とする実装にした。
- 「○○・マグナ」系の召喚石はgbf.wiki検索(Special:Search)に出てこないことが多いが、直接URL `https://gbf.wiki/{英語名}_Magna` でページが存在することが複数例で確認された(コロッサス・マグナ、ユグドラシル・マグナ、ティアマト・マグナ、レヴィアタン・マグナ、セレスト・マグナ)。同様に「Xeno」系キャラ名(ゼノイフリート等)は「ゼノ」+名前を連結した日本語クエリでは検索に失敗することが多く、英語名で直接検索/直接URLを試すと見つかる。
- ピッカーの「(SSR)」自動一致は、無関係なキャラクターLoreサブページ(例:「Lowain (SSR)/Lore」)にもマッチしてしまうバグがあった。NON_SUMMON_MARKERSでのフィルタリングを(SSR)判定より先に行うよう修正済み。
- 加護効果テキストが「メイン効果:」「サブ効果:」で明示的に分かれる場合と、「サブ効果:」のみラベルがあり無印部分がメイン効果という場合(ベリアル等)の両方が存在する。後者に対応していなかったバグを修正済み(修正前に生成された`wind-ssr-elil-normal.md`は手動で直した)。
- GameWith一覧のATK/HP欄が空欄(記載漏れ)の召喚石が稀にある(桂小太郎&エリザベス、ベルゼバブ)。この場合はgbf.wikiの数値をそのまま採用し、未確認・要検証事項に明記した。
- Windowsのbash環境で、日本語ファイル名を`curl -o`の出力先に直接指定すると稀に無言で失敗することがある(該当ファイルが生成されない)。ASCII名で一旦保存してから`fs.copyFileSync`でリネームする方が確実。

## 召喚ターン情報の追加収集(2026-08-20)

召喚効果には「初回召喚ターン」「使用間隔(クールタイム)」「再召喚可否」といった、一覧ページ(article/show/136372)には無く**個別GameWithページにしかない情報**があることが判明したため、全268体について個別ページを追加取得し、召喚ターン情報を追記する第2パスを実施した。

- `scratch-fetch-gamewith-summons.sh <scratch-dir> [start] [end]` — list.jsonの`href`から個別ページを一括curl取得(ASCII連番ファイル名`NNN_page.html`で保存、日本語ファイル名curl問題を回避)。
- `scratch-extract-summon-turns.mjs <scratch-dir>` — 個別ページのテキストから「召喚『スキル名』(N凸解放時)...初回召喚：Nターン後 使用間隔：Nターン」のような段階別ブロックをパースし、`summon_turns.json`に書き出す。
- `scratch-generate-summon-files.mjs`にsummon_turns.jsonの読み込みを追加し、召喚効果セクションを上限解放段階ごとの`###`見出しに再構成するよう変更。

**判明した注意点**:
- GameWithは同じ「使用可能になるまでのターン数」を記事によって「初回召喚：Nターン後」「使用可能：Nターン後」の2通りで表記する。クールタイムも「使用間隔：Nターン」「召喚までの間隔：Nターン後」の2通り。両方をカバーする正規表現が必要。
- 段階タグの表記も「(4凸解放時)」「(最大解放時)」「(限界超越時)」など多様で、「凸」を含むことを前提にすると取りこぼす。パーレン内の任意の文字列として扱うのが安全。
- 記事の冒頭の紹介文に「加護効果や召喚効果の詳細...」のように本文見出しと同じ単語が使われていることがあり、`indexOf`で最初に見つかった位置をブロック終端としてナイーブに使うと、実際のブロックより手前で区切ってしまうバグになる(該当キャラの最後の段階が消失する)。検索開始位置を最後の召喚ブロック開始位置以降に限定する必要がある。
- 逆に、記事のレビュー欄(「〜の評価と使い道」)側でも「召喚」という単語が地の文に登場することがあり、ブロック開始の判定に使いすぎると誤検出する。今回は「召喚『スキル名』」「召喚(タグ)」の直後に改行が来るパターンに絞り、「召喚効果」のような接頭辞バリエーションまでは追わないことにした(追うと誤検出の方が増えた)。
- 1つの段落に複数の上限解放段階の情報が区切りなく混在しているページが一定数ある(全体の約9%、24/268)。この場合は数値がどの段階に属するか機械的に判別できないため、該当ファイルの未確認・要検証事項に明記した。個別ページ自体からの抽出に失敗したもの(約6%、17/268)と合わせて、約15%(41/268)は召喚ターン情報が未確認または不確実として明示している。残り約85%(227/268)はクリーンに段階別分離できている。

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
  - **完了**: 風属性SSR 121/121体(list.jsonの全indexを処理完了、index0は重複スキップのため実質120体新規作成)。index120風ガウェインで風属性SSRが完了した。次はDark(闇)属性SSRに着手する。
  - **闇属性SSR収集に着手**(scratchディレクトリ`dark_ssr`)。`scratch-build-list.mjs 闇`でlist.json生成(113体)→パイプラインスクリプトの`SCRATCH`定数を`dark_ssr`に書き換え→GameWith取得(Node fetch、113/113成功)→gbf.wiki検索は`scratch-fetch-gbfwiki.sh`(curl)で取得(111/113、index73「3年生チーム(μ's)」は0件)→pick-and-dump(69/113体にgbf.wiki候補あり、fetch_pages.sh 140件)→gbf.wikiページ取得(69/69成功)→dossier生成(`batch_000-007.txt`〜`batch_112-112.txt`、15バッチ)まで完了。既存の`dark-ssr-*.md`ファイルは無し(重複スキップ対象なし)。
  - index2 シャオ(SSR)はgbf.wiki検索候補「Shao」がHP/ATK不一致(ページ内に「Shao」「Shao (SSR)」の複数バージョン注記があり、取得内容はHP1710(5★)/ATK6420(5★)でGameWithのSSR版HP1520/ATK6800と一致せず、基本レアリティ版のページと判断)だったため不採用、GameWithのみで作成。
  - index0 黒崎一護、index3 グリード＆リン・ヤオはコラボキャラクターのためgbf.wiki候補は自動検索で見つからず(想定通り)、GameWithのみで作成。
  - index4 マヌ＝ポヌマウはgbf.wiki候補なし。GameWithのみで作成。
  - index1 浴衣オシリスはgbf.wiki「Osiris (Yukata)」とHP1304/ATK8680(4★表記)で一致確認、採用。
  - index5 闇ワムデュス(バレンタイン)、index6 コンスタンツィア、index7 ゼタ(クリスマス)はgbf.wiki候補とHP/ATK完全一致で確認、採用(batch_000-007.txt完了)。
  - index8 闇ダヌア、index9 サリエル(リミテッド)、index11 クロロはgbf.wiki候補なし。GameWithのみで作成。
  - index10 水着シャトラはgbf.wiki「Catura (Summer)」とHP2021/ATK8375で一致確認、採用。
  - index12 闇グリームニル、index13 浴衣シエテ、index14 ツクヨミはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index15 闇ロベリア(バレンタイン)はgbf.wiki候補とHP/ATK完全一致で確認、採用。batch_008-015.txt完了。
  - index16 エヴァンジェリン(ネギまコラボ)、index17 コク(四聖)はgbf.wiki候補なし。GameWithのみで作成。
  - index18 インダラ(十二神将)はgbf.wiki候補なし。GameWithのみで作成。
  - index19 闇アレーティアはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index20 闇ユグドラシル(クリスマス)はgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index21 リムル＝テンペスト(転スラコラボ)はgbf.wiki候補なし。GameWithのみで作成。
  - index22 ディアブロ、index23 シオン(共に転スラコラボ)はgbf.wiki候補なし。GameWithのみで作成。batch_016-023.txt完了。
  - index24 闇ウィル(SSR)はgbf.wiki候補なし。GameWithのみで作成。
  - index25 闇サテュロス(ハロウィン)はgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index26 闇フロレンスはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index27 闇セワスチアン(SSR)はgbf.wiki候補なし。GameWithのみで作成。
  - index28 水着ヘカテーはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index29 水着ハレゼナはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index30 オロロジャイア(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。男性態・女性態の両性を持つ特殊キャラ。
  - index31 闇クロエはgbf.wiki候補なし。GameWithのみで作成。batch_024-031.txt完了。
  - index32 浴衣レフィーエはgbf.wiki候補なし。GameWithのみで作成。
  - index33 水着メイガスはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index34 闇シンダラ(バレンタイン)はgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index35 トガヒミコ(ヒロアカコラボ)はgbf.wiki候補なし。GameWithのみで作成。変身前後で奥義・アビリティが完全に変化する特殊仕様。
  - index36 ティラはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index37 闇ローアイン(SSR)はgbf.wiki候補なし。GameWithのみで作成。
  - index38 闇ユニ(クリスマス)、index39 闇ティコ(ハロウィン)はgbf.wiki候補とHP/ATK完全一致で確認、採用。batch_032-039.txt完了。
  - index40 メグ＆まりっぺはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index41 虎杖悠仁＆伏黒恵(呪術廻戦コラボ)はgbf.wiki候補なし。GameWithのみで作成。
  - index42 水着クピタンはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index43 闇ジャスミン(SSR)はgbf.wiki検索候補「Jasmine」がHP/ATK不一致(基本レアリティ版、HP840/ATK3000 vs GameWithのSSR HP2000/ATK5500)だったため不採用、GameWithのみで作成。
  - index44 浴衣イルザはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index45 水着アズサ、index46 サンドリヨンはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index47 闇ハルマル(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。batch_040-047.txt完了。
  - index48 闇フィオリト(クリスマス)はgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index49 闇ユエル&ソシエはgbf.wiki検索候補「Sapphire Dance: Gentiana」が無関係の水属性召喚石ページだったため不採用、GameWithのみで作成。
  - index50 ボーマンはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index51 闇ジェシカ、index52 ゾロ&サンジ(ワンピースコラボ)はgbf.wiki候補なし。GameWithのみで作成。
  - index53 水着マギサ、index54 水着ヴァジラはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index55 マナマルはgbf.wiki候補とHP/ATK完全一致で確認、採用。batch_048-055.txt完了。
  - index56 闇イッパツ(SSR)はgbf.wiki候補なし。GameWithのみで作成。
  - index57 フェディエル(リミテッド)、index58 リッチ(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。
  - index59 水着タヴィーナ、index60 水着メグはgbf.wiki候補とHP/ATK完全一致で確認、採用。水着メグは2025年8月バランス調整対象で調整後の性能を採用。
  - index61 闇アルベールはgbf.wiki候補とHP/ATK完全一致で確認、採用。2025年8月バランス調整対象で調整後の性能を採用。
  - index62 カシウス(SSR)はgbf.wiki検索候補「Cassius (Event)」がHP/ATK不一致(HP1200/ATK6600 vs GameWithのSSR HP1600/ATK8000、別バージョンページ)だったため不採用、GameWithのみで作成。
  - index63 ゼヘク(SSR)はgbf.wiki検索候補「Magus, Triad of Wisdom」が無関係のページだったため不採用、GameWithのみで作成。2024年10月バランス調整対象で調整後の性能を採用。batch_056-063.txt完了。
  - index64 水着アーミラはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index65 黒騎士&オルキス(アニメ特典)はgbf.wiki候補なし。GameWithのみで作成。
  - index66 プレデター(SSR)はgbf.wiki検索候補「Predator」がHP/ATK不一致(基本レアリティ版、HP960/ATK2700 vs GameWithのSSR HP1100/ATK10500)だったため不採用、GameWithのみで作成。
  - index67 レイ(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。
  - index68 シス(イベント)はgbf.wiki検索候補「Seox」がHP/ATK不一致(十天衆本体版、HP1666/ATK6666 vs GameWithのHP1080/ATK8100)だったため不採用、GameWithのみで作成。
  - index69 ルシウス(SSR)はgbf.wiki検索候補「Lucius」がHP/ATK不一致(基本レアリティ版、HP1250/ATK8760 vs GameWithのSSR HP1285/ATK9800)だったため不採用、GameWithのみで作成。
  - index70 ビカラ(十二神将)はgbf.wiki候補なし。GameWithのみで作成。
  - index71 シャレム(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。batch_064-071.txt完了。
  - index72 コウはgbf.wiki候補とHP/ATK完全一致(5★表記)で確認、採用。
  - index73 3年生チーム(μ's、ラブライブコラボ)はgbf.wiki候補なし。GameWithのみで作成。
  - index74 浴衣アンスリアはgbf.wiki候補とHP/ATK完全一致で確認、採用。バランス調整後の性能を採用。
  - index75 コルルはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index76 ルルーシュ(コードギアスコラボ)はgbf.wiki候補なし。GameWithのみで作成。
  - index77 キャル(プリコネコラボ)、index78 ニーア(十賢者)はgbf.wiki候補なし。GameWithのみで作成。ニーアは十賢者の複雑な段階的強化システムを簡略化。
  - index79 闇フェリ(リミテッド)はgbf.wiki候補「Ferry (Grand)」とHP/ATK完全一致で確認、採用。batch_072-079.txt完了。
  - index80 闇クラリス(バレンタイン)はgbf.wiki候補とHP一致で確認、採用。
  - index81 ターニャ(SSR)はgbf.wiki検索候補「Tanya」がHP/ATK不一致(基本レアリティ版)だったため不採用、GameWithのみで作成。取得時点で最終上限解放(8/25実装予定)の性能はGameWith未公開のため最終前の性能を記載。
  - index82 闇ユーステスはgbf.wiki候補と4★表記でHP/ATK完全一致で確認、採用。
  - index83 レディ・グレイ(ハロウィン)、index84 フーちゃんはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index85 ウーフとレニーはgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index86 ジョーカー(ペルソナ5コラボ)、index87 闇ルナール(SSR)はgbf.wiki候補なし。GameWithのみで作成。ルナールはアビコピー対応表が大規模なため詳細割愛。batch_080-087.txt完了。
  - index88 闇シロウはgbf.wiki候補なし。GameWithのみで作成。
  - index89 オリヴィエ(リミテッド)はgbf.wiki候補とHP/ATK完全一致で確認、採用。
  - index90 アザゼルはgbf.wiki候補とHP/ATK完全一致で確認、採用。バランス調整後の性能を採用。
  - index91 闇カリオストロはgbf.wiki候補とHP/ATK完全一致(HP1805/ATK6370)で確認、採用。2021年12月バランス調整後の性能を採用。
  - index92 闇カタリナ(アニメ第1巻BD/DVD特典)はgbf.wiki候補なし。GameWithのみで作成。
  - index93 闇ゼタはgbf.wiki候補とHP/ATK完全一致(HP1020/ATK10400、4★表記)で確認、採用。batch_088-095.txt完了。
  - index94 オーキス(リミテッド)はgbf.wiki候補「Orchid (Grand)」とHP/ATK完全一致(HP1650/ATK7300、4★表記)で確認、採用。最終上限解放後の性能を採用。
  - index95 マルキアレスはgbf.wiki候補とHP/ATK完全一致(HP1150/ATK9290、4★表記)で確認、採用。最終・バランス調整後の性能を採用。batch_088-095.txt完了。
  - index96 闇ヴァイト、index97 水着ゾーイはgbf.wiki候補なし。GameWithのみで作成。ヴァイトは最終解放後の性能を採用。
  - index98 フォルテはgbf.wiki候補とHP/ATK完全一致(HP1340/ATK10130)で確認、採用。
  - index99 黒騎士(リミテッド)はgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終上限解放後の性能を採用。
  - index100 闇ジャンヌダルクはgbf.wiki候補とHP/ATK完全一致(HP1200/ATK9800)で確認、採用。2021年12月バランス調整後の性能を採用。
  - index101 ベアトリクスはgbf.wiki候補とHP/ATK完全一致(HP1300/ATK9250、4★表記)で確認、採用。バランス調整後・最終上限解放後の性能を採用。
  - index102 ナルメアはgbf.wiki候補とHP/ATK完全一致(HP1330/ATK12200、5★表記)で確認、採用。最終上限解放後の性能を採用。
  - index103 カリオストロ(ハロウィン)はgbf.wiki候補とHP/ATK完全一致(HP1550/ATK8100)で確認、採用。2024年10月バランス調整後の性能を採用。batch_096-103.txt完了。
  - index104 ヴァンピィはgbf.wiki候補とHP/ATK完全一致(HP1390/ATK10880、5★表記)で確認、採用。バランス調整後・最終上限解放後の性能を採用。入手方法はGameWithに記載なく不明。
  - index105 水着ダヌアはgbf.wiki候補とHP/ATK完全一致(HP1590/ATK8350)で確認、採用。
  - index106 闇サルナーンはgbf.wiki候補とHP一致(HP1340)、ATKはgbf.wiki基本値8360+Cross-Fateボーナス500=8860でGameWith記載と一致確認、採用。
  - index107 ヴィーラ(SSR)はgbf.wiki検索候補「Vira」がHP1000(4★)/ATK7000(4★)で基本レアリティ版と判断し不採用、GameWithのみで作成。最終上限解放後の性能を採用。
  - index108 シス(十天衆)はgbf.wiki候補なし。GameWithのみで作成。限界超越Lv150時点の性能を中心に大幅簡略化して記載(十天衆の複雑な多段強化システムのため)。
  - index109 バザラガはgbf.wiki候補とHP/ATK完全一致(HP1680/ATK12540、5★表記)で確認、採用。最終上限解放後の性能を採用。
  - index110 ロゼッタ(クリスマス)はgbf.wiki候補「Rosetta (Holiday)」と入手武器/声優/称号が完全一致し同一キャラクターと確認したが、ステータスがGameWith(HP1540/ATK7280)とgbf.wiki(HP2000/ATK7500)で不一致。キャラクター種別の誤りではないためGameWith数値を採用し、不一致を明記して要検証扱いとした。
  - index111 ケルベロスはgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終上限解放後の性能を採用。batch_104-111.txt完了。
  - index112 レディ・グレイ(通常版)はgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終上限解放後の性能を採用。batch_112-112.txt完了。
  - **闇属性SSR全113体完了！(113/113)** 全6属性のSSR収集が完了(光121/火111/水99/土108/風121/闇113、計673体)。方針(40行目)通り次はSR収集フェーズに移行する。

### 進行中の作業(2026-08-19〜): SR収集フェーズ開始(光属性SRから)

全属性SSR完了を受け、SR収集を開始。GameWithのSRキャラ評価一覧ページ(https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/20723 、SSR用20722とは別ページ、新しい順)を新たに発見し使用。SSR収集順序(光→火→水→土→風→闇)を踏襲し、SRも光属性から着手する。

- `scripts/data-collection/scratch-build-list.mjs`のLIST_URLをSR一覧(20723)に変更。`scratch-fetch.mjs`/`scratch-fetch-gbfwiki.sh`/`scratch-pick-and-dump.mjs`/`scratch-build-dossier.mjs`のSCRATCH定数を`light_sr`に retarget。
- 光属性SRは全41体(SSRの121体よりかなり少ない)。既存の`light-sr-*.md`ファイルは無し(重複スキップ対象なし)。
- パイプライン完了: list.json(41体)→GameWith取得(41/41成功)→gbf.wiki検索(41/41成功、curl経由)→候補選定(29/41にgbf.wiki候補あり)→ページ取得(29/29成功)→dossier生成(`batch_000-007.txt`〜`batch_040-040.txt`、6バッチ)。
- **進捗**: index0 浴衣タイアーはgbf.wiki候補とHP/ATK完全一致(HP1250/ATK6250)で確認、採用。index1 クビラ(SR)はgbf.wiki候補なし、GameWithのみで作成(2019年12月ブレイブグラウンド実装)。
  - index2 フィラソピラ(SR)はgbf.wiki検索候補「Philosophia」がHP850(3★)/ATK3300(3★)で基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
  - index3 ブリジール&コーデリアはgbf.wiki候補とHP/ATK完全一致(HP1240/ATK6300)で確認、採用。
  - index4 光ミリン(SR)はgbf.wiki候補とHP/ATK完全一致(HP1036/ATK7320)で確認、採用。
  - index5 光サビルバラはgbf.wiki候補なし。GameWithのみで作成。
  - index6 光エルタはgbf.wiki候補とHP/ATK完全一致(HP1051/ATK6620)で確認、採用。
  - index7 光バロワはgbf.wiki候補なし。GameWithのみで作成。batch_000-007.txt完了。
  - index8 ゼタ(SR)はgbf.wiki検索候補「Zeta」がHP1520(5★)/ATK11400(5★)で基本SSR版と判断し不採用、GameWithのみで作成。
  - index9 フィーナ(クリスマス)はgbf.wiki候補とHP/ATK完全一致(HP840/ATK8050)で確認、採用。
  - index10 ソフィア(SR)はgbf.wiki検索候補「Sophia」がHP2180(5★)/ATK7320(5★)で基本版と判断し不採用、GameWithのみで作成。
  - index11 光エゼクレインはgbf.wiki候補なし。GameWithのみで作成。
  - index12 光サーヤはgbf.wiki候補なし。GameWithのみで作成。
  - index13 ジャンヌダルク(SR)はgbf.wiki検索候補「Jeanne d'Arc」がHP1840(5★)/ATK9850(5★)で基本版と判断し不採用、GameWithのみで作成。
  - index14 ヴェリトール(SR)はgbf.wiki検索候補「Vermeil」がHP675(3★)/ATK4500(3★)で基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
  - index15 アルベール(SR)はgbf.wiki検索候補「Albert」がHP1280(4★)/ATK4800(4★)でGameWith記載(HP1240/ATK3150)と不一致だったため不採用、GameWithのみで作成。batch_008-015.txt完了。
  - index16 ナコルル(サムライスピリッツコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
  - index17 ヨハン(ガチャ)はgbf.wiki候補とHP/ATK完全一致(HP1380/ATK5000)で確認、採用。
  - index18 シロウ(SR)はgbf.wiki検索候補「Nicholas」が元素値06(闇属性)・HP1850(4★)/ATK7550(4★)で別バージョンと判断し不採用、GameWithのみで作成。
  - index19 ティア(テイルズコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
  - index20 エリカ(サクラ大戦コラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
  - index21 ナーヴェはgbf.wiki検索候補「Novei」がHP1320(4★)/ATK8600(4★)で別バージョンと判断し不採用、GameWithのみで作成。
  - index22 輿水幸子(アイマスシンデレラガールズコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
  - index23 ソリッズ(光)はgbf.wiki検索候補「Soriz」が基本版でGameWith記載と不一致だったため不採用、GameWithのみで作成。batch_016-023.txt完了。
  - index24 ダエッタ(SR)はgbf.wiki検索候補「Daetta」がHP700(3★)/ATK5280(3★)で基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
  - index25 ファスティバ(クリスマス)はgbf.wiki候補とHP/ATK完全一致(HP1100/ATK7850)で確認、採用。
  - index26 フェリ(ハロウィン)はgbf.wiki候補とHP/ATK完全一致(HP1035/ATK5740)で確認、採用。
  - index27 ソフィ(テイルズオブグレイセスコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
  - index28 ロボミ(SR)はgbf.wiki検索候補「Robomi Rocket」が召喚石ページだったため不採用、GameWithのみで作成。
  - index29 フェザーはgbf.wiki検索候補「Feather」がHP640(3★)/ATK4500(3★)で基本レアリティ(R)版と判断し不採用、GameWithのみで作成。最終上限解放後の性能を採用。
  - index30 J・JはATK完全一致(5750)・称号一致で同一キャラクターと確認したが、HPがGameWith1450/gbf.wiki1150(+CF200=1350)で不一致。同一キャラと判断しGameWith数値を採用、不一致を明記。
  - index31 セイランはgbf.wiki候補が壊れた検証用ページ(Broken/Character Validation)で使用不可のため不採用、GameWithのみで作成。batch_024-031.txt完了。
  - index32 アーミラ(SR)はgbf.wiki候補なし。GameWithのみで作成(神撃のバハムート由来キャラのため想定通り)。最終上限解放後の性能を採用。
  - index33 バウタオーダ(SR)はgbf.wiki候補とATK完全一致(6490)で確認、採用(HPはやや差異あり要検証)。
  - index34 ヨハン(イベント)はgbf.wiki検索候補が既出のガチャ版と重複しGameWith記載と不一致のため不採用、GameWithのみで作成。
  - index35 ロザミア(SR)はgbf.wiki検索候補「Rosamia」がRレアリティ版と判断し不採用、GameWithのみで作成。
  - index36 島村卯月(アイマスシンデレラガールズコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。最終上限解放後の性能を採用。
  - index37 ノアはgbf.wiki候補とHP/ATK完全一致(HP1200/ATK7500、5★表記)で確認、採用。最終上限解放後の性能を採用。
  - index38 アルシャはgbf.wiki候補とHP/ATK完全一致(HP1355/ATK5625)で確認、採用。
  - index39 フェリ(SR)はgbf.wiki候補とHP/ATK完全一致(HP1035/ATK5740)で確認、採用。batch_032-039.txt完了。
  - index40 光ノイシュはgbf.wiki検索候補「Naoise」が風属性版(元素値04、全く異なるスキル構成)で不一致のため不採用、GameWithのみで作成。batch_040-040.txt完了。
  - **光属性SR全41体完了！(41/41)** 次は火属性SRの収集に進む。

### 進行中の作業(2026-08-19〜): 火属性SR収集

パイプラインを`fire_sr`に retarget。火属性SRは全55体。既存の`fire-sr-*.md`ファイルは無し(重複スキップ対象なし)。list.json(55体)→GameWith取得(55/55成功)→gbf.wiki検索(55/55成功)→候補選定(39/55にgbf.wiki候補あり)→ページ取得(39/39成功)→dossier生成まで完了。
- index0 水着フェリはgbf.wiki候補とHP/ATK完全一致(HP920/ATK6200)で確認、採用。
- index1 浴衣カシウスはgbf.wiki候補とHP/ATK完全一致(HP1150/ATK6850)で確認、採用。
- index2 水着フライデーはgbf.wiki候補とHP/ATK完全一致(HP1250/ATK6250)で確認、採用。曜日限定(金曜日)強化の特殊仕様キャラ。
- index3 火アステールはgbf.wiki候補なし。GameWithのみで作成。
- index4 ロジーヌ(SR)はgbf.wiki検索候補「Rosine」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index5 ティナ(バレンタイン)はgbf.wiki候補とHP/ATK完全一致(HP1250/ATK6250)で確認、採用。
- index6 巫女ゾーイはgbf.wiki候補が壊れた検証用ページ(Broken/Character Validation)で使用不可のため不採用、GameWithのみで作成。
- index7 イッパツ(SR)はgbf.wiki検索候補「Ippatsu」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。batch_000-007.txt完了。
- index8 カルバ(SR)はgbf.wiki検索候補「Karva」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index9 ベアトリクス(ハロウィン)はgbf.wiki候補とHP/ATK完全一致(HP1120/ATK6580)で確認、採用。
- index10 ラインハルザ(SR)はgbf.wiki候補とHP/ATK完全一致(HP800/ATK7007)で確認、採用。
- index11 和泉守兼定(刀剣乱舞コラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index12 グレア(SR)はgbf.wiki検索候補「Grea」が基本版と判断し不採用、GameWithのみで作成。
- index13 炎獄先生エルモートはgbf.wiki候補とHP/ATK完全一致(HP1060/ATK5950)で確認、採用。
- index14 水着ガンダゴウザはgbf.wiki候補とHP/ATK完全一致(HP900/ATK8000)で確認、採用。
- index15 水着カレンはgbf.wiki候補なし。GameWithのみで作成。batch_008-015.txt完了。
- index16 スーテラ(イベント)はgbf.wiki候補とHP/ATK完全一致(HP1310/ATK5930、4★表記)で確認、採用。
- index17 ルリアはgbf.wiki検索候補「Bzzt! Amped-Up Summer」がキャラクターページでない(ステータス記載なし)ため不採用、GameWithのみで作成。属性は「主人公と同じ」特殊仕様のため便宜上「火」に分類。最終上限解放後の性能を採用。
- index18 火ルシウスはgbf.wiki候補とHP/ATK完全一致(HP1000/ATK7500)で確認、採用。
- index19 パーシヴァル(SR)はgbf.wiki検索候補「Percival」がSSR相当のステータスで不一致のため不採用、GameWithのみで作成。
- index20 赤城みりあ(アイマスシンデレラガールズコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index21 ダーント(SR)はgbf.wiki検索候補「Dante」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index22 火ククル(SR)はgbf.wiki候補なし。GameWithのみで作成。
- index23 火バロワ(イベ)はgbf.wiki候補なし。GameWithのみで作成。batch_016-023.txt完了。
- index24 スタン(テイルズオブデスティニーコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index25 ジェミニ(サクラ大戦コラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index26 センはgbf.wiki候補とHP/ATK完全一致(HP900/ATK6750)で確認、採用。
- index27 神月かりん(ストリートファイターコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index28 セシールはgbf.wiki検索候補「Side-scrolling Quotes」が無関係のページだったため不採用、GameWithのみで作成。
- index29 ライアン(SR)はgbf.wiki検索候補「Ryan」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index30 リナ(スレイヤーズコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index31 火スーテラはgbf.wiki候補とHP/ATK完全一致(HP1320/ATK5750)で確認、採用。batch_024-031.txt完了。
- index32 アニラ(SR、十二神将)はgbf.wiki候補なし。GameWithのみで作成。
- index33 天道輝(アイマスSideMコラボ)はgbf.wiki候補なし。GameWithのみで作成(想定通り)。
- index34 火ノイシュ(SR)はgbf.wiki検索候補「Naoise (Fire)」がSSR相当のステータスで不一致のため不採用、GameWithのみで作成。最終上限解放後の性能を採用。
- index35 アンナ(SR)はgbf.wiki検索候補「Anna」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index36 ベスは育成次第で6属性/3タイプに変化する特殊仕様のキャラ。gbf.wiki候補は不一致のため不採用、GameWithのみで作成、火属性/攻撃タイプ成長時を中心に大幅簡略化。
- index37 城ヶ崎莉嘉はデレマス(モバマス)コラボキャラ。コラボキャラのためgbf.wiki候補は自動検索で見つからず(想定通り)、GameWithのみで作成。
- index40 マリー(SR)はgbf.wiki候補「Mary」がHP800(3★)/ATK4000(3★)で基本レアリティ(R)版のため不採用、GameWithのみで作成。
- index41 サーヤ(イベント)はgbf.wiki候補「Sarya」がHP1150(4★)/ATK7310(4★)でGameWithのHP840/ATK5780と不一致のため不採用、GameWithのみで作成。
- index51 アリーザ(SR)はgbf.wiki候補「Aliza」がHP1400(4★)/ATK9830(4★)でGameWithのHP840/ATK6700と不一致のため不採用、GameWithのみで作成。
- index52 アビー(SR)はgbf.wiki候補「Abby」がHP1100(4★)/ATK10500(4★)でSSR相当のため不採用、GameWithのみで作成。
- 火属性SR完了(55/55体)。次は水属性SRの収集を開始する(scratch-build-list.mjs等をwater_srへ再設定)。

### 進行中の作業(2026-08-19〜): 水属性SR収集

- scratch-fetch.mjs / scratch-pick-and-dump.mjs / scratch-build-dossier.mjs / scratch-fetch-gbfwiki.sh のSCRATCH定数をwater_srへ変更。
- scratch-build-list.mjsで水属性SRのリストを取得: 44体。
- GameWith全44体のページ取得完了、gbf.wiki検索は37/44体で候補あり(curl経由で取得)。
- dossier生成完了(batch_000-007.txt 〜 batch_040-043.txt)。次はindex0から処理開始。
- index0 ジョエル(SR)はgbf.wiki候補「Joel」がHP970(3★、クロスフェイトボーナス込み)/ATK3900(3★)で基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index13 リリィ(SR)はgbf.wiki候補「Lily」がHP1876(5★)/ATK7720(5★)でGameWithのHP1140/ATK3800と不一致のため不採用、GameWithのみで作成。
- index17 ディアンサはgbf.wiki候補「Diantha」がHP1750(4★)/ATK6500(4★)でGameWithのHP900/ATK5000と不一致のため不採用、GameWithのみで作成。
- index18 モルフェとヴェトルはモルフェ⇔ヴェトル間で操作キャラが入れ替わる「ペアキャラクター」。gbf.wiki候補「Side-scrolling Quotes」は無関係のページのため不採用、GameWithのみで作成。英語名(name_en)は公式表記未確認のためカタカナ読みからの仮romanizationとして記載。
- index19 ローアイン(SR)はgbf.wiki候補「Lowain」が基本レアリティ(R)版のため不採用、GameWithのみで作成。
- index22 ランスロット(SR)はgbf.wiki候補「Lancelot」がHP1570(5★)/ATK10830(5★)でSSR相当のため不採用、GameWithのみで作成。
- index28 ロミオ(SR)はgbf.wiki候補「Romeo」がHP1770(5★)/ATK10120(5★)でSSR相当のため不採用、GameWithのみで作成。
- 水属性SR完了(44/44体)。次は土属性SRの収集を開始する(scratch-build-list.mjs等をearth_srへ再設定)。

### 進行中の作業(2026-08-19〜): 土属性SR収集

- scratch-fetch.mjs / scratch-pick-and-dump.mjs / scratch-build-dossier.mjs / scratch-fetch-gbfwiki.sh のSCRATCH定数をearth_srへ変更。
- scratch-build-list.mjsで土属性SRのリストを取得: 51体。
- GameWith全51体のページ取得完了、gbf.wiki検索は43/51体で候補あり(curl経由で取得)。
- dossier生成完了。次はindex0から処理開始。
- index1 コワフュール(SR)はgbf.wiki候補「La Coiffe」が基本レアリティ(R)版と判断し不採用、GameWithのみで作成。
- index16 ウェルダー(SR)は変身システムを持つ特殊仕様のキャラ。gbf.wiki候補は基本レアリティ版のため不採用、GameWithのみで作成、変身後/最終上限解放後の性能を中心に簡略化して記載。
- index43 ユーリ(土)はgbf.wiki候補「Yuri Lowell」がテイルズオブヴェスペリアコラボの別キャラクター(コラボタグ付き)と判断し不採用、GameWithのみで作成。
- 土属性SR収集完了(51/51体)。次は風属性SRの収集に着手(パイプラインをwind_srに再ターゲット)。
- 風属性SR: scratch-build-list.mjsでリスト取得49体。GameWith全49体のページ取得完了、gbf.wiki検索は34/49体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_048-048.txt)。
- 風属性SR収集完了(49/49体)。gbf.wiki不一致(基本レアリティ版/別バージョン/無関係ページ/壊れたページ)は都度検出しGameWithのみで作成、水着クロエとミムルメモルはHP差異のみ記録し両出典併記で作成。次は闇属性SRの収集に着手(パイプラインをdark_srに再ターゲット)。
- 闇属性SR: scratch-build-list.mjsでリスト取得35体。GameWith全35体のページ取得完了、gbf.wiki検索は25/35体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_032-034.txt)。
- 闇属性SR収集完了(35/35体)。gbf.wiki不一致(基本レアリティ版/別バージョン/ペアキャラ別ページ/召喚石やイベントページ/コラボキャラの想定通り不在)は都度検出しGameWithのみで作成。index19 神崎蘭子は変身システム(『闇の力』10で目覚めし鼓動発動)を持つ特殊仕様のキャラ、目覚めし鼓動発動後の性能を中心に簡略化して記載。index33 ヴィーラ(SR)は旧来の下書きファイルが存在していたため、より詳細な内容に更新し、README.mdの重複行(旧行16)を削除。
- SR全属性(光・火・水・土・風・闇)の収集が完了。次はR属性の収集に着手予定。
- R属性収集開始。GameWithのRキャラ評価一覧ページはarticle/show/20724(SSRは20722、SRは20723)と判明。scratch-build-list.mjsのLIST_URLを更新。パイプラインをlight_rに再ターゲット。
- 光属性R: scratch-build-list.mjsでリスト取得6体。GameWith全6体のページ取得完了、gbf.wiki検索は6/6体で候補あり(curl経由で取得)。dossier生成完了(batch_000-005.txt)。
- 光属性R収集完了(6/6体)。次は火属性Rの収集に着手(パイプラインをfire_rに再ターゲット)。
- 火属性R: scratch-build-list.mjsでリスト取得18体。GameWith全18体のページ取得完了、gbf.wiki検索は17/18体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_016-017.txt)。
- 火属性R収集完了(18/18体)。次は水属性Rの収集に着手(パイプラインをwater_rに再ターゲット)。
- 水属性R: scratch-build-list.mjsでリスト取得10体。GameWith全10体のページ取得完了、gbf.wiki検索は9/10体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_008-009.txt)。
- 水属性R収集完了(10/10体)。index9 デリフォード(R)はgbf.wiki「Deliford」でATK3600が一致、HPはGameWith1140=gbf.wiki基本値960+クロスフェイトボーナス180で一致、確認済みとして採用。次は土属性Rの収集に着手(パイプラインをearth_rに再ターゲット)。
- 土属性R: scratch-build-list.mjsでリスト取得16体。GameWith全16体のページ取得完了、gbf.wiki検索は14/16体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_008-015.txt)。
- 土属性R収集完了(16/16体)。index15 ヘリヤ(R)はgbf.wiki「Herja」でHP840/ATK3800が一致、確認済みとして採用。次は風属性Rの収集に着手(パイプラインをwind_rに再ターゲット)。
- 風属性R: scratch-build-list.mjsでリスト取得11体。GameWith全11体のページ取得完了、gbf.wiki検索は11/11体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_008-010.txt)。
- 風属性R収集完了(11/11体)。index10 エシオはgbf.wiki「Eso」でHP620/ATK4900が一致、確認済みとして採用。次は闇属性Rの収集に着手(パイプラインをdark_rに再ターゲット)。
- 闇属性R: scratch-build-list.mjsでリスト取得9体。GameWith全9体のページ取得完了、gbf.wiki検索は8/9体で候補あり(curl経由で取得)。dossier生成完了(batch_000-007.txt〜batch_008-008.txt)。
- 闇属性R収集完了(9/9体)。index8 ウィル(R)はgbf.wiki「Will」でHP768/ATK4200が一致、確認済みとして採用。これでR属性全六属性(光・火・水・土・風・闇)の収集が完了。

## 全キャラクターデータ収集完了(2026-08-19)

SSR・SR・R全レアリティ、光・火・水・土・風・闇の全六属性のキャラクターデータ収集が完了した。最終内訳:

- SSR: 673体(光121、火111、水99、土108、風121、闇113)
- SR: 275体(光41、火55、水44、土51、風49、闇35)
- R: 70体(光6、火18、水10、土16、風11、闇9)
- 合計: 1018体、`knowledge/characters/README.md` の一覧行数と一致確認済み。

各キャラクターは `status: 下書き` のまま(GameWith/gbf.wikiのテキスト情報からの下書き作成であり、ゲーム内実機での数値検証は未実施のため)。今後の課題:

- 各ファイルの「未確認・要検証事項」に記載したHP/ATK不一致キャラ(数十件)のゲーム内再検証。
- EXアビリティ保有キャラの`has_ex_ability`フラグの精査(現状は簡易判定)。
- リリース日不明("GameWithに記載なし")のキャラの追加調査。
- gbf.wiki候補が見つからなかったキャラ(コラボキャラ、十二神将の特殊バージョンなど)の別ソースでの裏取り。index0 ビカラ(R)は攻撃行動をしない特殊なR十二神将(ハイラ(R)/シャトラ(R)と同型)。gbf.wiki候補なし。GameWithのみで作成。既存のdark-ssr-vikala-normal.mdに合わせてname_enを「Vikala (R)」とした。index1 バクラはgbf.wiki「Bakura」でHP860/ATK4480が一致、確認済みとして採用。index2 水着ルナールはgbf.wiki「Lunalu (Summer)」でHP550/ATK4600が一致、確認済みとして採用(正式な英語名は「Lunalu」)。index3 ルナールはgbf.wiki「Lunalu」でHP550/ATK4600が一致、確認済みとして採用。index4 水着ローアインはgbf.wiki「Lowain (Summer)」でHP580/ATK4320が一致、確認済みとして採用。index5 ローアイン(R)はgbf.wiki「Lowain」でHPが一致(690)、ATKはGameWith4490とgbf.wiki基本値4320(+340ボーナスで4660)のいずれとも不一致だが同一キャラと判断し採用(要検証)。index6 ゼヘクはgbf.wiki検索候補「Magus, Triad of Wisdom」が召喚石ページ(キャラクターと無関係)だったため不採用、GameWithのみで作成。index7 ターニャ(R)はgbf.wiki「Tanya」でHP830/ATK3840が一致、確認済みとして採用。index0 スピナーはgbf.wiki「Spinnah」でHP600/ATK4200が一致、確認済みとして採用。index1 クロエはgbf.wiki「Chloe」でHP580/ATK3960が一致、確認済みとして採用。index2 セロニムはgbf.wiki「Thelonim」でHP640/ATK4000が一致、確認済みとして採用。index3 パヴィーダはgbf.wiki「Pavidus」でHP1010/ATK3780が一致、確認済みとして採用。index4 カルテイラ(R)はgbf.wiki「Karteira」でATKが一致、HPはGameWith630/gbf.wiki940で不一致だがタイトル・声優・得意武器が一致するため採用(要検証)。index5 クルーニ(R)はgbf.wiki「Krugne」でATKが一致、HPはGameWith900/gbf.wiki720で不一致だがタイトル・声優・得意武器が一致するため採用(要検証)。index6 レオノーラはgbf.wiki「Leonora」でHPが一致、ATKはGameWith4470とgbf.wiki基本値4200(+400クロスフェイトボーナスで4600)のいずれとも不一致だが同一キャラと判断し採用(要検証)。index7 スタンはgbf.wiki「Stan」でHPが一致、ATKはGameWith4590=gbf.wiki基本値4320+クロスフェイトボーナス270で一致、確認済みとして採用(GBFオリジナルキャラ、テイルズコラボの「スタン(テイルズ)」とは別)。index8 ペトラはgbf.wiki「Petra」でHP880/ATK3200が一致、確認済みとして採用。index9 ヘイゼン(R)はgbf.wiki「Hazen」でHP800/ATK3200が一致、確認済みとして採用。index0 シャトラ(R)は攻撃行動をしない特殊なR十二神将(ハイラ(R)と同型)。gbf.wiki候補なし。GameWithのみで作成。名前が似ているサテュロス(Satyr)とは別キャラのため、既存のwind-ssr-shatora-normal.md/water-ssr-catura-holiday.mdに合わせてname_enを「Catura (R)」とした。index1 コワフュールはgbf.wiki「La Coiffe」でHP580/ATK3960が一致、確認済みとして採用。index2 バルルガンはgbf.wiki「Balurga」でHP580/ATK5000が一致、確認済みとして採用。index3 ネネはgbf.wiki「Nene」でHP770/ATK4160が一致、確認済みとして採用。index4 土クムユはgbf.wiki「Camieux (Earth)」でHP690/ATK4580が一致、確認済みとして採用(火属性R版はfire-r-cumyu-fire.mdとして別途登録済み)。index5 ヴァンツァはgbf.wiki「Vanzza」でHP720/ATK4960が一致、確認済みとして採用。index6 ノルセルはgbf.wiki「Norcel」でHP580/ATK4350が一致、確認済みとして採用。index7 ウェルダー(クリスマス)はgbf.wiki候補なし、GameWithのみで作成(既存のearth-sr-walder-normal.mdに合わせてname_enを「Walder (Christmas)」とした)。index8 ガルマはgbf.wiki「Garma」でHPが一致、ATKはGameWith4830=gbf.wiki基本値4580+クロスフェイトボーナス250で一致、確認済みとして採用。index9 水着ウェルダーはgbf.wiki「Walder (Summer)」でHP720/ATK4400が一致、確認済みとして採用。index10 ウェルダーはgbf.wiki「Walder」でHPが一致、ATKはGameWith4250=gbf.wiki基本値4000+クロスフェイトボーナス250で一致、確認済みとして採用(既存のearth-sr-walder-normal.mdとは別のR版)。index11 ジャスミン(R)はgbf.wiki「Jasmine」でHP840/ATK3000が一致、確認済みとして採用。index12 ボレミア(R)はgbf.wiki「Volenna」でHP880/ATK3600が一致、確認済みとして採用。index13 ファラはgbf.wiki「Farrah」でATKが一致、HPはGameWith966=gbf.wiki基本値816+クロスフェイトボーナス150で一致、確認済みとして採用。index14 ガラドアはgbf.wiki「Galadar」でHP1000/ATK3800が一致、確認済みとして採用。index0 ハイラ(R)は攻撃行動をしない特殊なR十二神将。gbf.wiki候補なし。GameWithのみで作成。index2 カイラナ(R)はgbf.wiki「Cailana」(SR版と共通ページ)でHP580/ATK4320が一致、確認済みとして採用。index3 アリステラはgbf.wiki「Alistair」でHP750/ATK4240が一致、確認済みとして採用(gbf.wikiでは性別が男性と記載)。index4 ブリジールはgbf.wiki「Bridgette」がHP600/ATK4520でGameWithのHP710/ATK4700と不一致のため不採用、GameWithのみで作成。index5 ジョエルはgbf.wiki「Joel」でHP820/ATK3900が一致、確認済みとして採用。index6 ヨダルラーハはgbf.wiki「Yodarha」でHP640/ATK4290が一致、確認済みとして採用。index7 スフラマールはgbf.wiki「Suframare」でHP800/ATK3360が一致、確認済みとして採用。index8 リチャードはgbf.wiki「Richard」でHP760/ATK4240が一致、確認済みとして採用(GameWithは「サポートなし」記載だがgbf.wikiにサポートスキル「Draw of Destiny」の記載ありのため採用、要検証)。次はindex9(デリフォード(R))から継続(batch_008-009.txt)。index0 猫は「主人公と同属性」の特殊仕様キャラでGameWithが火属性ページとして分類。gbf.wiki候補「Karyl」は無関係の別キャラと判断し不採用、GameWithのみで作成。  - index119 ネツァワルピリはgbf.wiki候補なし。GameWithのみで作成。最終上限解放後の性能を採用。
  - index118 風メーテラ(SSR)はgbf.wiki候補なし。GameWithのみで作成。最終上限解放後の性能を採用。
  - index117 クリスティーナはgbf.wiki候補なし。GameWithのみで作成。最終解放後の性能を採用。カジノメダル7777万枚必要な最高難度入手キャラ。
  - index116 レナ(風属性)はgbf.wiki候補なし。GameWithのみで作成。バランス調整後・最終解放後の性能を採用。ファイル名は当初「lyria-heroism」と誤って作成したため「lena-wind」に修正して作成した。
  - index115 シエテ(十天衆)はgbf.wiki候補なし。GameWithのみで作成。限界超越Lv150時点の性能を中心に大幅簡略化して記載。
  - index114 ニオ(十天衆)はgbf.wiki候補なし。GameWithのみで作成。限界超越Lv150時点の性能を中心に大幅簡略化して記載(十天衆の複雑な多段強化システムのため)。
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
