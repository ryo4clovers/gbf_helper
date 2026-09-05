# gbf-knowledge-mcp-server

`../knowledge/` 配下のグランブルーファンタジー知識(キャラクターのスキル情報・ゲームシステム)を、Claude Desktop / Codex app などのMCPクライアントから検索・参照できるようにするMCPサーバー。

MCPではスキル情報Q&A（RAG的な検索）に加え、通常攻撃ダメージ計算を提供します。ダメージ計算は
ローカルWeb画面からも同じ計算コアを利用できます。最適編成機能は将来フェーズです。

## ローカルWeb計算画面

ビルド後にローカル専用サーバーを起動し、ブラウザで `http://127.0.0.1:4173` を開きます。

```powershell
npm run build
npm run start:web
```

開発中は `npm run dev:web` でも起動できます。サーバーは外部インターフェースへ公開せず、
`127.0.0.1`だけで待ち受けます。画面では次の操作ができます。

- `CalculatorDeckConfig v1`のJSONを編集・読込・保存する
- 本家`deck.json`相当レスポンスを、個人・装備インスタンスIDを保持しない設定へ変換する
- 敵属性、防御値、船、炉、大事なもの相当倍率、ジョブ通常攻撃与ダメージを入力する
- 通常攻撃本体、追撃、合計の最小・最大・期待値と計算段階を確認する

入力JSONと計算結果は外部へ送信せず、このローカルサーバー内で処理します。Web APIは1 MiBを超える
入力を拒否し、ファイルパスをリクエストから受け取らないため、任意のローカルファイルを読みません。

### AIからの計算

MCPサーバーには読み取り専用・副作用なしの`calculate_normal_attack_damage`ツールを登録しています。
Web画面とMCPツールは共通の`calculateNormalAttackFromRequest`を呼ぶため、計算式と入力検証は同一です。
入力例は`examples/normal-attack-request.v1.json`にあります。WebMCPの命令型APIをサポートするブラウザでは、
同名のページ内ツールも機能検出して登録し、AIによる計算結果を表示中の画面へ反映します。

## 計算機の入力基盤

`src/calculator/deckParser.ts` と `src/calculator/battleStartParser.ts` は、ユーザーが通常の
ゲーム操作中に受動記録した `deck.json` / `start.json` 相当のレスポンスを、計算処理から
独立した `DeckSnapshot` / `BattleSnapshot` に正規化します。

- ネットワークアクセスは行わず、渡されたJSONだけを解析する
- 数値と数値文字列を有限数へ統一する
- 空の装備・キャラ枠を除外する
- 未知のレスポンス項目は許容し、ゲーム側の項目追加で壊れにくくする
- 計算に不要な未知フィールドや主人公のインスタンスIDを保持しない
- `start.json` のアカウントIDと戦闘インスタンスIDを保持しない

### CalculatorDeckConfig v1

`src/calculator/calculatorDeckConfig.ts` は、実利用時に保存・編集する正式な編成形式
`CalculatorDeckConfig v1` を検証します。また、本家 `deck.json` 相当のレスポンスを同形式へ
変換できます。サンプルは `examples/calculator-deck.v1.json` です。

- `schemaVersion: 1` と `format: "gbf-helper-calculator-deck"` で形式を識別する
- 武器・召喚石・キャラクターはマスターID、枠、Lv、上限解放、プラス値等を保持する
- `nameHint` は人間向け表示だけに使い、計算上の識別は各マスターIDを正とする
- 本家のユーザー／インスタンスID、編成グループ番号、UI制御情報、`damage_info` は保存しない
- 未知フィールドは入力ミス検出のため拒否し、形式拡張時は `schemaVersion` を更新する
- 同じ枠の重複、メイン武器・メイン召喚石の複数指定を拒否する

`attackOverride` / `hpOverride` は、マスターデータが未整備でも検証を進めるための移行用フィールドです。
主人公の値は本家画面で計算済みの最終ステータス、各装備・キャラクターの値はその要素の表示値として
扱います。将来リゾルバーが全ステータスを導出できるようになっても、検算とトラブルシュート用に
残します。

`src/calculator/calculatorDeckResolver.ts` は設定を検証した後、増分カタログと上書き値を使う
`mode: "catalog-with-overrides"` の `DeckSnapshot` を生成します。ユーザー作成設定には本家のインスタンスIDが
存在しないため、解決済みスナップショットでも `instanceId` は任意です。現在はマスターデータが
未整備のため、ジョブ詳細、未知の武器スキル、未知の召喚加護、キャラクターサポート効果を推測せず、空または
未設定のままにして `issues` へ警告と設定上のパスを返します。ステータス上書きがない場合も同様に
警告します。

武器・武器スキルの増分カタログは `catalog/weapons.v1.json` と
`catalog/weapon-skills.v1.json` に分離しています。現在はブロンズソード、イフリートハルベルト、
オーバーライドの3武器と、後二者の計5スキルを収録しています。実際のゲーム内表示で確認した
武器とスキル対応は `検証済み`、表示値からのみ逆算した襲刃の基礎効果量は `下書き` とし、リゾルバーも下書きスキルを
警告します。未知武器は設定内の表示名・上書きステータスを利用しつつ、マスターデータ未解決として
処理を継続します。

`src/calculator/weaponEffectResolver.ts` は、カタログの基礎効果量を変更せず、ブースト適用後の
`effectiveWeaponSkillEffects` を解決します。各結果には基礎値、実効値、適用したブースト元を残すため、
表示値との不一致を追跡できます。現在のSLv15オーバーライド1本では、火の刹那の攻撃力を
`12% → 15.6%`、クリティカル確率を `3% → 3.9%`、紅蓮の襲刃の追撃を
`4.5% → 5.85%` と計算します。カタログと設定のSLvが一致しない効果は推測せず警告します。
複数のブーストが同じ効果へ適用される場合は、現段階では加算を暫定仮説として計算し、その仮説を
警告にも残します。基礎効果が `下書き` の場合、実効値も検証済みには昇格させません。
イフリートハルベルト単体では攻刃18%・技巧3%、オーバーライドとの同時編成では攻刃39%・技巧7.8%が
表示され、`(18 + 12) × 1.30 = 39` と `(3 + 3) × 1.30 = 7.8` の両方を実機表示で確認しています。

`src/calculator/normalAttackPowerCalculator.ts` は、主人公の表示攻撃力へ同属性の実効通常攻刃を
加算枠として適用します。同時編成では実効攻刃 `23.4% + 15.6% = 39%`、攻刃枠倍率1.39となり、
表示攻撃力19,484から通常攻刃適用段階の攻撃力27,082.76を算出します。この値は通常攻刃枠だけを
適用した中間値であり、召喚加護、属性補正、敵防御、上限、乱数を適用した最終ダメージではありません。
召喚加護は `catalog/summons.v1.json` で別に解決します。`normalAttackPowerCalculator` は属性加護の
候補を保持し、最終的な基礎ダメージ計算では大事なもの等の属性攻撃UPと同じ属性枠へ加算します。
今回の主召喚石シルフィードベルは「レアモンスターの出現確率UP」の非ダメージ加護です。
`start.json` の支援召喚石ハデスは闇属性用で、火属性の主人公・武器には適用されないため、攻撃に
寄与する召喚加護倍率は1.00、適用後攻撃力も27,082.76です。支援召喚石の個体IDは保持しません。
`src/calculator/normalAttackValidation.ts` は、この中間計算とUI想定通常ダメージ、通常攻撃本体の実測を
一つの検算結果へ束ねます。同時編成で再取得した12打は暫定範囲3,753～4,148に全件入りましたが、
UI値3,950を厳密な乱数前値とする0.001刻みの逆算は11/12件の再現に留まるため、範囲一致と厳密再現を
分けて報告します。

`createDamageCalculationInput` は、`enemyDefenseOverride`、任意の大事なものレスポンス、船・炉の
明示入力を正規化します。船・炉は`deck.json`や`start.json`に無いため推測しません。

```ts
createDamageCalculationInput(deckJson, startJson, 1, {
  enemyDefenseOverride: 10,
  accountBonusResponse: importantItemJson,
  crewModifiers: { shipAttackPercent: 10, furnaceAttackPercent: 10 },
});
```

`src/calculator/accountBonusParser.ts` は大事なものから、全属性／属性別攻撃力、与ダメージ、
対特定属性与ダメージ、ダメージ上限を抽出します。所持数や強化素材数は保持しません。カテゴリの
`is_active` は効果ON/OFFを示すと確認できていないため判定に使わず、取得済みを示す `set_flg` のみを
利用します。現在対応するアイテムと枠は増分実装であり、未対応効果を推測しません。

`src/calculator/baseDamageCalculator.ts` は通常攻刃適用後の値から、属性攻撃枠、船、炉、条件を満たす
ジョブ通常攻撃与ダメージ、大事なものの与ダメージ、対属性与ダメージを独立した`stages`として順に
適用し、その後に敵防御で除算します。属性攻撃枠内の効果は加算し、船・炉・与ダメージ各段階は
乗算します。上限効果は`deferredCapModifiers`へ残し、未実装の上限処理で誤って通常倍率にしません。

今回の編成では、通常攻刃後27,082.76、属性攻撃13%、船10%、炉10%、Class.V以外の通常攻撃
与ダメージ3%、大事なものの与ダメージ3.6%、敵防御10から3,951.424744となり、UI表示3,950を
約0.036%差で再現します。全段階はコミュニティ式に基づく暫定配置なので`下書き`の出典状態を保持し、
途中丸めと上限処理は未解決として結果に残します。

`src/calculator/pursuitDamageCalculator.ts` は、解決済みの実効追撃効果と追撃計算前の通常ダメージを
受け取り、既定で0.950～1.050を0.001刻みにした101パターンの追撃ダメージを計算します。
現在の実効追撃率5.85%と通常ダメージ2,741を入力すると、名目追撃値は160.3485、事前切り捨て後は
160となり、最小152、最大168、期待値約160.475になります。候補となる追撃効果が複数ある場合は
自動合算せず、`sourceSkillId` で選択させます。また、下書きデータを含む計算結果には警告を残します。

`src/calculator/normalAttackDamageCalculator.ts` は、段階計算済みの基礎ダメージを通常攻撃本体と追撃の
101乱数分布へ接続します。再取得した実測では本体が高乱数でも追撃が低乱数の組があるため、本体と
追撃は独立した乱数成分という暫定モデルです。各101通りの直積10,201組は配列化せず、合計の最小・
最大・期待値だけを集約します。現在の編成では次の結果になります。

| 成分 | 名目値 | 最小 | 最大 | 期待値 |
|---|---:|---:|---:|---:|
| 通常攻撃本体 | 3,951.424744 | 3,754 | 4,149 | 約3,951.931 |
| 追撃5.85% | 231.158348（事前切り捨て231） | 220 | 243 | 約231.495 |
| 独立成分の合計 | - | 3,974 | 4,392 | 約4,183.426 |

本体・追撃の各分布と合計分布にはパターン数を保持します。ダメージ上限と厳密な途中丸めはまだ
適用しないため、結果の`status`は`provisional`、`issues`にも未解決項目を残します。

`start.json` から敵ID・属性・HP・Lv・チャージ・モード状態は取得できますが、今回確認した
レスポンスには敵防御値がありません。敵IDに対応する検証済みカタログ値を追加するまでは、
`enemyDefenseOverride` で明示します。

`src/calculator/calculationInput.ts` が両スナップショットと攻撃対象を束ねる境界です。計算処理は
`normalAttackDamageCalculator.ts`まで接続され、共通ファサードを通じてWebとMCPへ公開しています。

追撃検証に使用した編成では、武器「オーバーライド」の第3スキル「紅蓮の襲刃」に
「火属性キャラに火属性追撃効果（大）」と記載され、編成画面由来の計算情報には火属性追撃
`5.85％` が表示されていました。武器スキル説明はレスポンスによって `comment` または
`description` に入るため、パーサーは両形式を正規化します。この表示値は今回の編成条件における
観測値であり、スキル単体の固定値としては扱いません。
`deck.damage_info` は `displayedDamageInfo` として、想定通常／有利ダメージ、その属性コード、HP、
画面表示の効果値、武器スキル強化値を正規化します。効果値は元の表示文字列を必ず保持し、末尾が
`%` または `％` の場合だけ数値の `percentage` も併記します。これらはゲームUIの推定表示であり、
実戦ダメージや計算式の確定値とは区別します。

`src/calculator/pursuitValidation.ts` は表示上の想定ダメージと追撃率を、通常攻撃レスポンスの
`concurrent_attack_count` で分離した実測追撃と比較します。乱数倍率は暫定的に0.950～1.050を
既定値とし、丸め順序が未確定なため許容範囲は下限を切り捨て、上限を切り上げた保守的な整数範囲に
します。結果の `status` は、正確な端数処理が確定するまで `provisional` です。
`src/calculator/randomMultiplierInference.ts` は、名目ダメージの事前丸めと最終丸めを明示的な仮説として
受け取り、各実測値を生成できる乱数倍率を列挙します。既定の範囲は0.950～1.050、刻みは0.001で
101候補です。小さな追撃ダメージでは複数倍率が同じ整数になるため、単一値へ決め打ちせず候補配列と
最小・最大を返します。どの候補でも再現できない実測値は未解決として別途報告します。
計算結果の標準的な表示には101個の配列を直接返さず、同確率の離散分布として最小ダメージ、
最大ダメージ、丸め後101パターンの算術平均である期待ダメージを返します。デバッグ用に総パターン数と
重複を除いたダメージ値の種類数も保持します。

同一編成の25打での暫定検証では、追撃名目値 `160.3485` を160へ事前切り捨てし、0.001刻みの
乱数適用後に切り上げる仮説で、追撃25件すべてに1件以上の候補が得られました。ただし多くの
実測値に6～7候補が残るため、この結果だけで乱数の刻みや丸め順序を確定しません。一方、UIの
想定通常ダメージ2,741へ同じ0.001刻みと最終切り上げを直接適用する単純モデルは9/25件しか
再現できませんでした。このためUI想定値は検算の中心値として使い、厳密な乱数前基礎値とは
区別します。0.950～1.050の101候補は非公式記事
（https://resoleil.hatenablog.com/entry/2020/11/07/194000）を参考にした暫定仮説です。

バトル中の `*_result.json` は `src/calculator/actionResultParser.ts` で共通の実測イベントへ
正規化します。アビリティ・通常攻撃・召喚でネスト構造は異なりますが、実ダメージは各要素の
`value` です。`split` はダメージ数値の表示用データであり、ヒット数やヒット別ダメージとして
扱いません。正規化結果は将来、計算結果と実測値を比較する検証ログとして利用します。
多段アビリティは `cmd: "loop_damage"` の `list[][]` にヒットごとの `value` が入り、
`attack_num` が0始まりのヒット順を示します。`total[].split` は合計ダメージの各桁です。

通常攻撃では `attack_count` を連撃内の打数、`concurrent_attack_count` を同一打内の
同時ダメージ成分として保持します。2打目以降に現れる番号キー付き `damage` オブジェクトも
正規化対象です。`color` が異なるダメージ要素も失わず、主ダメージとは別の成分として保持します。
ただし、`color` の値だけでは追撃かどうかを分類しません。
今回観測した追撃なしのシングルアタックでは、ダメージ要素は1件だけで、
`total_attack_num: 1`、`attack_count: 0`、`concurrent_attack_count: 0`、`color: "1"` でした。
追撃なしのダブルアタックでは攻撃イベントが2件に分かれ、両方とも
`total_attack_num: 2`、`concurrent_attack_count: 0`、`color: "1"` です。
1打目は配列に `attack_count: 0`、2打目は番号キー `"1"` の配下に
`attack_count: 1` として格納されていました。
追撃なしのトリプルアタックも同じ規則で、3打すべてが `total_attack_num: 3`、
`concurrent_attack_count: 0`、`color: "1"` です。3打目は番号キー `"2"` の配下に
`attack_count: 2` として格納されていました。
追撃ありのシングルアタックでは、本体と追撃は同じ `attack_count: 0`、同じ `color: "1"` で、
`concurrent_attack_count` がそれぞれ0と1でした。このため追撃は連撃数を増やさず、同一打内の
別ダメージ成分として扱います。
追撃ありのダブルアタックでも各打に同じ規則が適用され、`attack_count: 0` と `1` のそれぞれに
`concurrent_attack_count: 0` と `1` のダメージ要素がありました。`color` の属性対応や
`color: 98` の意味はパーサーでは解釈せず、検証可能になるまで生のコード値を保持します。
追撃ありのトリプルアタックでも、`attack_count: 0`、`1`、`2` の各打に
`concurrent_attack_count: 0` と `1` が1件ずつありました。これにより通常追撃はSA・DA・TAを
共通して、連撃打数と同一打内の成分番号の組として表現できます。

強化・弱体アビリティは `cmd: "condition"` の状態スナップショットとして扱います。
`buff[]` / `debuff[]` の `status` を、完全な `statusId`、先頭の `baseId`、残りの
`parameters` に分け、効果の意味は `knowledge/abilities/status-effects.json` で解決します。
レスポンス内の個人バフ用ユーザーIDは正規化結果に保持しません。

エリクシール等の結果に現れる `cmd: "rematch"` は回復アイテムイベントとして保持します。
同じレスポンスの `cmd: "recast"` は、対象が `player` なら奥義ゲージ、`boss` なら敵の
チャージターンとして正規化します。回復量・復活・弱体解除はレスポンスに個別イベントが
存在する場合にのみ観測事実として扱い、アイテム名から効果を推測して補完しません。

奥義は `cmd: "special"` の `list[].damage[]` をヒット単位で正規化します。通常攻撃と
奥義が同じターンに混在する場合は `mixed-attack` とし、奥義ゲージとチェインバーストゲージの
更新を別のリソースイベントとして保持します。`cmd: "heal"` はダメージと合算せず、対象を
含む回復イベントとして保持します。

複数人の奥義では主人公が `special`、仲間が `special_npc` です。各ダメージへ攻撃者位置・
奥義名・属性コードを付与し、`chain_cutin` の後に続く `effect` と最初の `damage` を
チェインバーストとして関連付けます。その後の自動発動アビリティやターン終了ダメージは、
独立した汎用ダメージイベントのまま保持します。属性コード `98` 等の同時発生ダメージも
奥義本体と合算せず、個別のダメージ要素として残します。`special.list[]` がヒット単位、
その中の `damage[]` が同じヒットで同時発生した本体・追加ダメージなので、同じ
`hitIndex` を付与して関係を失わないようにします。

## 提供ツール

| ツール名 | 概要 |
| --- | --- |
| `list_characters` | キャラクター一覧を取得(属性・レアリティで絞り込み可) |
| `search_characters` | キャラ名・スキル名・効果キーワードで検索(部分一致) |
| `get_character` | id または名前を指定してキャラクター全文を取得 |
| `list_summons` | 召喚石一覧を取得(属性・レアリティで絞り込み可) |
| `search_summons` | 召喚石名・召喚効果・加護効果で検索(部分一致) |
| `get_summon` | id または名前を指定して召喚石全文を取得 |
| `search_mechanics` | ゲームシステム用語(背水・渾身など)を検索 |
| `get_mechanics_topic` | ゲームシステムのトピック全文を取得 |
| `calculate_normal_attack_damage` | 編成・敵・環境倍率から通常攻撃本体、追撃、合計の101乱数分布を計算 |

すべて副作用のない読み取り専用ツールで、外部通信やファイル更新は行いません。

検索はベクトル埋め込みではなく、フィールド重み付きのキーワード(部分一致)スコアリング。知識量が増えてきたら`src/services/search.ts`の内部実装を差し替える想定(ツールのインターフェースは変えない)。

## セットアップ

```bash
cd mcp-server
npm ci
npm run build
```

動作確認(Claude Desktop等をインストールしていなくても、[MCP Inspector](https://github.com/modelcontextprotocol/inspector)のCLIモードでツール呼び出しを検証できる):

```bash
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool-name get_character --tool-arg id_or_name=water-sr-katalina-normal
```

## Claude Desktop への登録

`%APPDATA%\Claude\claude_desktop_config.json` に以下を追記し、Claude Desktopを再起動する(絶対パスは各自の環境に合わせて置き換える):

```json
{
  "mcpServers": {
    "gbf-knowledge": {
      "command": "node",
      "args": ["C:\\path\\to\\gbf_helper\\mcp-server\\dist\\index.js"]
    }
  }
}
```

## Codex app への登録

Codex のMCP設定(通常 `%USERPROFILE%\.codex\config.toml`)に以下を追記する。`cwd`を指定すると、起動場所に依存せず同じサーバーを利用できる。

```toml
[mcp_servers.gbf-knowledge]
command = "node"
args = ["dist/index.js"]
cwd = "C:\\path\\to\\gbf_helper\\mcp-server"
enabled = true
required = false
```

## 知識ベースの場所を変える場合

既定では `mcp-server` の1つ上の階層にある `knowledge/` を読む。別の場所にあるコピーを参照させたい場合は環境変数で上書きできる:

```json
{
  "mcpServers": {
    "gbf-knowledge": {
      "command": "node",
      "args": ["C:\\path\\to\\gbf_helper\\mcp-server\\dist\\index.js"],
      "env": { "GBF_KNOWLEDGE_PATH": "C:\\path\\to\\another\\knowledge" }
    }
  }
}
```

## 開発

```bash
npm run dev         # tsx watchでホットリロード起動(stdioなので単体では動作確認しづらい。Inspectorのweb UIと併用推奨)
npm run check       # 実ナレッジ検証 + 型チェック + ユニットテスト
npm run typecheck   # 型チェックのみ
npm test            # ユニットテスト(test/fixtures配下のダミーデータを使用、knowledge/の実データには依存しない)
```

知識ベースはツール呼び出しのたびに読み直す(キャッシュなし)。`knowledge/`配下のMarkdownを編集したら、サーバーを再起動しなくても次回のツール呼び出しから反映される。

## 今後のスコープ外事項(意図的に未実装)

- ダメージ上限を含む完全なダメージ計算・最適編成ツール
- ベクトル埋め込みによる高度なRAG(知識量が増えたら検討)
- npm publish / `npx`配布(現状はローカルパスでの起動のみ)
