# 複数エージェントで安全に開発する

最初は「実装担当1人＋レビュー担当1人」で始めます。cloverが開発を指揮し、
ユーザーの依頼を整理してタスクと担当範囲を決めます。実装担当は自分のworktreeだけを編集します。
レビュー担当は編集を止めた成果を確認し、統合担当（cloverが調整し、ユーザーの許可を受けた担当）が1件ずつ統合します。
常駐サービス、追加依存、外部サービスは不要です。

## cloverが指揮する流れ

1. **依頼整理**: ユーザーの基本依頼を、目的・完了条件・編集範囲・必要な実測・検証に分けます。
   cloverが分かる内容は整理して進め、仕様判断や不足する実機資料はユーザーへ具体的に依頼します。
2. **調査**: clover自身のクラウド環境でWiki等の公開情報を調べます。
   ユーザーPCのブラウザーを調査用に操作しません。`docs/data-collection-notes.md`の出典・収集方針を守り、
   認証や閲覧制限を回避しません。ゲームAPIを直接呼ばず、ゲーム内操作・実測の取得はユーザーに依頼します。
3. **情報整理**: 採用する主張ごとに、出典URL・ページ名・参照日（YYYY-MM-DD）・対象のバージョンや条件、
   確定/仮説・実測の有無と対象条件・異なる資料の不一致を記録します。
   Wiki掲載やテスト成功だけで「実測済み」「検証済み」に格上げしません。
   計算へ取り込む情報は、該当するknowledge/catalog・計算経路・回帰テストとの対応をタスクに記載します。
   合成テストは実装の回帰確認として区別し、実測が足りなければ警告と保留を残します。
4. **提案と採用**: 調査中に見つけた機能案は、効果・根拠・不確実性・影響範囲・必要な資料・概算規模を
   チャットで提案します。ユーザーが採用するまではタスク化して実装しません。
5. **分担と進捗**: cloverが基点・worktree・担当範囲を割り当て、タスクを
   「調査中／資料待ち／実装中／レビュー待ち／統合待ち／完了」で追います。
   共通部分が重なるときは順番を決め、進捗・障害・次に必要なユーザー判断を短く報告します。
6. **レビュー・検証**: cloverがレビュー指摘の解消、確認対象SHA、check/build、必要な実測との照合を確認し、
   結果と未実施事項をユーザーへ提示します。統合・公開等は許可範囲に従います。

進捗と提案はまずチャットで管理します。追加サービスや共有ファイルへの同時書き込みは不要です。
必要資料を依頼するときは「どの編成・Lv・条件の、どの数値やレスポンスが必要か」を指定し、
アカウント情報・生データをコミットや公開に含めない既存ルールを維持します。
このガイドは運用の準備であり、クラウドの常時調査や自動開発を起動するものではありません。

### ユーザー指定の調査先

以下を調査の入口にします。個別の採用情報には、その記事のURL・参照日・条件・実測範囲を改めて記録します。

| 調査先 | 使い方と確認事項 |
| --- | --- |
| [gbf.wiki](https://gbf.wiki/) | 仕様調査の二次資料。閲覧制限時は取得できた範囲を明示 |
| [Huiji：久遠の指輪乗算枠の攻撃UP](https://gbf.huijiwiki.com/wiki/%E6%94%BB%E5%87%BB%E5%8A%9BUP%EF%BC%88%E4%B9%85%E8%BF%9C%E4%B9%8B%E6%88%92%E4%B9%98%E5%8C%BA%EF%BC%89) | 仕様調査の二次資料。初回クラウド調査では本文を直接取得できず、スタック詳細は未確認 |
| [日本語Wiki](https://gbf-wiki.com/) | 仕様調査の二次資料。初回調査では `/index.php` 経由で取得できた |
| [GameWith](https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/) | 攻略・編成評価。評価と実測仕様を分ける |
| [きくまろ](https://kikumarogaming.com/) | 性能表・画像識別など。記事ごとに更新日と対象バージョンを確認 |
| [神ゲー攻略](https://kamigame.jp/%E3%82%B0%E3%83%A9%E3%83%96%E3%83%AB/index.html) | 攻略・編成評価。条件・更新日を確認 |
| [GBFAL：Asset Lookup](https://mizagbf.github.io/GBFAL/) | ID・名称・タグの調査。ゲーム素材の権利はプロジェクトのMITライセンスと別に扱う |
| [GBFTU：Tool Utility](https://mizagbf.github.io/GBFTU/) | 計算・トラッカー等の比較参考。ダメージ計算はexperimentalと明記された比較実装で、唯一の正解判定にしない |

初回取得状況はcloverのクラウド調査による記録です。複数サイトの記述が一致していても、
同じ元情報を引用している場合は独立した検証になりません。採用時に引用元と実測の有無を確認します。

## branchとworktreeの違い

- **branch（ブランチ）** はコミット履歴につける名前です。例: `task/weapon-picker`。
- **worktree（ワークツリー）** はそのブランチを開いて作業する別フォルダーです。
  ファイルと未コミット変更は別ですが、Gitの履歴・ブランチ・登録情報は共有します。
- **commit（コミット）** は変更の保存単位です。未コミット変更は別worktreeには伝わりません。
- **merge（マージ）** は保存済みの別ブランチの変更を今のブランチへ取り込みます。
  フォルダーを分けても、同じ共通部分を変更すれば統合時に競合しえます。

同じブランチを複数worktreeで開くことは通常Gitが拒否します。`--force`で回避しません。
レビューは実装担当と同じフォルダーを同時操作せず、保存済みコミットのdetached worktreeを使います。

## タスクを始める前の約束

チャットで次を共有してください。常設のタスク管理システムは必要ありません。

```text
タスク: 武器選択画面の表示改善
指揮: clover / 実装担当: Codex / レビュー担当: Claude / 統合担当: cloverが調整
基点: master のコミットSHA（git rev-parse masterで取得）
ブランチ: task/weapon-picker
worktree: C:\...\gbf_helper-worktrees\weapon-picker
編集範囲: mcp-server/web/...（具体的なファイル名）
共通部分: 変更なし。必要になったら実装前に相談
出典・実測: 採用する仕様のURL・参照日・確度、必要な実測と対応テスト
検証: npm run check、npm run build、指定ポートで画面確認
完了条件: 差分・検証結果・未解決事項を報告。コミットは許可後
```

`AGENTS.md`と`CONTRIBUTING.md`を各worktreeで読みます。既存変更の所有者が不明なら停止します。
同じworktreeでの同時編集、他人の変更のreset/stash/上書き、無断コミットをしません。
この運用は手順での調整です。補助スクリプトは担当範囲や同時実行をロックしません。

| 共通部分 | 分担の方針 |
| --- | --- |
| `mcp-server/src/calculator/`、`mcp-server/web/normal-attack-rounding.js` | 計算コア担当を1人に決める。WebとMCPの両経路、丸め・警告・入力不変性を確認 |
| `mcp-server/src/services/`、`src/tools/`、`src/webServer.ts`、型・入出力スキーマ | API契約の変更を先に共有。利用側と対応テストを同じタスクで調整 |
| `mcp-server/catalog/`、`knowledge/`、カテゴリREADME、`docs/data-collection-notes.md` | カテゴリごとに所有者を決める。出典・確度・ID・索引・記録をまとめて更新 |
| `package.json`、`package-lock.json` | 依存担当1人。追加理由を先に報告。並行更新をしない |
| `AGENTS.md`、`CONTRIBUTING.md`、`prompts/`、運用スクリプト | 運用担当1人が指示を整合。変更中は他タスクに新ルールの採用時点を伝える |

担当範囲が重なる・共通部分が必要になる場合は、先行タスクの統合と確認を待ち、
そのコミットを基点に次のタスクを開始します。実装人数を増やすのはこの流れに慣れてからです。

## この運用を初めて導入するとき

整備成果が専用worktreeの未コミット変更として提示された場合、元の`master`にはまだ入っていません。
`task/multi-agent-setup`のブランチ名だけを基点にしても、未コミットのガイド・ツールは引き継がれません。
最初にユーザーが差分と検証結果を確認し、cloverへこの整備成果のコミットを許可します。
その後は後述のレビュー・統合手順で元の`master`へ反映します。
今回の成果を新しいレビュー用worktreeで確認する場合も、先に許可済みコミットが必要です。
元worktreeの作業状態と、ローカルに先行している既存コミットを維持してください。

次のタスクは、ガイドと `scripts/worktree.mjs` が入った**導入後のmasterコミットSHA**を基点に作ります。
統合をまだ行わない場合は、コミット済み整備ブランチを基点として使うことをcloverと合意してください。
旧基点に戻って新worktreeを作ると新しい運用ファイルが欠けます。

## 1. 作業フォルダーを作る

Windows PowerShellで、運用ファイルが導入された元のリポジトリへ移動します。
以下のパスは例です。`BASE_SHA`は合意した基点の実際のSHAに置き換えます。
現在の既存チェックアウトは `C:\Users\iriwa\Desktop\00_workspace\gbf_helper`、統合先は `master` です。

```powershell
Set-Location 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper'
node scripts/worktree.mjs status
git rev-parse master
node scripts/worktree.mjs new weapon-picker --base BASE_SHA --directory 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\weapon-picker' --dry-run
# 表示された基点・ブランチ・パスを確認後、同じコマンドから--dry-runを外す
node scripts/worktree.mjs new weapon-picker --base BASE_SHA --directory 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\weapon-picker'
```

スクリプトは実行元のカレントディレクトリではなく、スクリプトがあるworktreeを対象にします。
基点・絶対パスは必須で、既存ブランチ、既存フォルダー、worktree内部の作成先、
未コミット変更、進行中のmerge/rebase等を検出すると停止します。clone・fetchはしません。
古い基点にはスクリプトや新指示が含まれないため、運用導入後の合意済みコミットを使います。

Windowsの予約名（`CON`、`NUL.txt`、`COM1`など）、禁止文字、末尾の空白・ピリオドは
[Windowsの命名規則](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)に従い、
dry-runと本実行の両方で作成前に拒否します。特殊名前空間のパスは使用しません。
dry-runはディスク容量・権限・同時変更等による本実行の成功を保証しません。
一般的な作成失敗では、新ブランチ・worktree登録・フォルダーが途中まで残る可能性があります。
エラーに表示された `git worktree list --porcelain` と `git branch --list task/<task名>`、
指定した作成先を読み取りで確認し、所有者に相談してください。
確認前に同じコマンドを繰り返したり、ブランチやworktreeを強制削除したりしません。
スクリプトは失敗時も自動削除や強制復旧を行いません。

作成先をエージェントの作業フォルダーとして開いてください。最初に絶対パスと
`git branch --show-current`を報告してもらい、元の`master`を開いたまま実装させないようにします。
worktreeの作成・削除は統合担当だけが行い、同時に実行しません。

## 2. 依存関係・生成物・ポートを分ける

```powershell
Set-Location 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\weapon-picker\mcp-server'
npm.cmd ci
npm.cmd run check
npm.cmd run build
```

Windows版Node.js（`node --version`、現在の要件は18以上）とWindows版Gitを使います。
`npm.cmd`はPowerShellでnpm.ps1が実行ポリシーにより止まる場合にも使えます。
`npm ci`はこのworktreeの`node_modules/`を再作成するため、実行中のサーバーがあるフォルダーで行いません。
キャッシュに依存が揃っていれば `npm.cmd ci --offline --no-audit --no-fund` も使えます。
未収録で失敗したら結果を報告し、ネットワークの許可範囲を確認します。
新依存が必要なら理由・package/lockfile変更を先に共有します。

各worktreeに専用の`node_modules/`と`dist/`を作り、リンク・コピーで共有しません。
WindowsとWSL/Linux間で依存を共有しません。生成された`dist/`や依存はgitignore対象です。
`draft/`、captures、秘密設定、アカウント固有データはworktreeへコピーしません。
生成・インポートスクリプトは出力先を確認し、共通カタログを変更するものは担当者だけが実行します。
外部のSheets同期、公開、ホスティング設定は個別の許可が必要です。

Web確認時はタスクごとにポートを決めます（元フォルダー4173、実装4174、レビュー4175など）。

```powershell
Get-NetTCPConnection -State Listen -LocalPort 4174 -ErrorAction SilentlyContinue
$env:GBF_CALCULATOR_PORT = '4174'
npm.cmd run start:web
# http://127.0.0.1:4174 を確認。終了はこの端末でCtrl+C
Remove-Item Env:GBF_CALCULATOR_PORT -ErrorAction SilentlyContinue
```

ポートが使用中なら所有者に相談するか別の空きポートにします。他人のプロセスは停止しません。
ブラウザー保存はポートごとに別のoriginになります。別ポートの画面には保存済み編成がないことがあります。
MCPはstdioでポート不要ですが、既存接続は元フォルダーのビルドを参照する場合があります。
別worktreeの動作確認に既存MCPを使って新コードを検証済みと判断せず、設定変更も無断で行いません。

## 3. 差分を確認してレビューする

実装担当のworktreeで次を確認します。

```powershell
git status --short --branch
node scripts/worktree.mjs review --base BASE_SHA
git diff                 # 未ステージの編集内容
git diff --cached        # ステージ済みの編集内容
git diff --check
```

`??`の新規ファイルは通常のdiffには出ません。内容も別途確認します。
補助スクリプトはコミット済みの差分概要と未コミット差分概要を分けて表示します。
成果が未コミットなら実装を止め、同じworktreeを読み取りレビューしてよい担当を明示します。
別worktreeには未コミット内容が伝わらないので、そこで同じ成果のテストをしたとは扱いません。

許可後、実装担当が**自分の変更だけ**を明示してステージし、コミットします。
`git add .`は避けます。コミットメッセージは`.gitmessage`に従います。

```powershell
git add -- path/to/changed-file path/to/new-file
git diff --cached
git commit -m 'web: 武器選択画面の表示を改善'
git rev-parse HEAD
```

編集を止め、成果コミットのSHA・基点・変更ファイル・検証結果・保留をレビュー担当へ渡します。
統合担当は存在しない別パスにレビュー用worktreeを作ります。

```powershell
git worktree add --detach 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\review-weapon-picker' TASK_SHA
Set-Location 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\review-weapon-picker'
git rev-parse HEAD
git diff BASE_SHA...HEAD --stat
git diff BASE_SHA...HEAD
```

レビュー担当はSHA一致・担当範囲・計算仕様・データの確度を確認します。修正は実装担当へ返し、
レビューworktreeでは実装しません。新コミットが出たらそのSHAで別のレビュー用worktreeを作るか、
所有者と作業停止を確認して切り替えます。勝手にresetしません。
レビュー側でも専用依存で `npm.cmd ci`、`npm.cmd run check`、`npm.cmd run build` を行います。
`check`はナレッジ検証・typecheck・ユニットテストです。現状、別のlintコマンドはありません。
運用スクリプトを変更した場合はルートで `node --test scripts/worktree.test.mjs` も実行します。
画面変更では指定ポートで画面確認も行います。実行できない検証は理由と共に報告します。

## 4. 統合担当が1件ずつ試してから取り込む

実装単体のテスト成功だけでは、他タスクと合わせた成功を保証しません。
ユーザーの統合許可後、現在の`master`から**統合確認専用**worktreeを作り、そこでmergeします。
以下の操作は実装・レビュー担当が自動実行するものではありません。

```powershell
# 元フォルダーでmasterの現在のSHAを取得し、合意した基点との差を確認
git rev-parse master
git worktree add -b integration/weapon-picker 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\integration-weapon-picker' MASTER_SHA
Set-Location 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper-worktrees\integration-weapon-picker'
git status --short --branch   # 未コミット変更なしを確認
git merge --no-ff --no-commit TASK_SHA
git diff --cached --stat
git diff --cached
git diff --cached --check
Set-Location mcp-server
npm.cmd ci
npm.cmd run check
npm.cmd run build
Set-Location ..
```

TASK_SHAはレビュー済みの正確なSHAです。`--no-ff --no-commit`で統合内容の確認を先に行います。
競合やテスト失敗時は後述の手順で中止します。成功したら統合内容と検証結果を報告し、
ユーザーの許可範囲に従って統合コミットを作ります。統合担当は他タスクを混ぜません。

最終反映時には元の`master`の作業が停止済みで、未コミット変更・進行中のGit操作がないことを確認し、
改めて取り込みの許可を確認します。既存サーバーが生成物を使っている場合は所有者と更新時点も調整します。

```powershell
# 統合確認用worktreeで、許可後に
git commit -m 'integration: 武器選択画面の変更を統合'
# 元フォルダーへ戻り、master・作業停止・クリーンを確認した後に
Set-Location 'C:\Users\iriwa\Desktop\00_workspace\gbf_helper'
git branch --show-current
git status --short --branch
git merge --ff-only integration/weapon-picker
```

`--ff-only`が失敗したらmasterが先へ進んでいます。強制処理せず、最新masterから新しい統合確認を行います。
最終反映後もcheck/buildを実行し、生成物とコードが一致することを確認します。
push・PR作成・公開はこのローカル統合とは別に許可を取ります。

## 競合・不明な変更があったら

- **開始前に未コミット変更がある**: 作業を止めて所有者へ相談。reset/stash/cleanしません。
- **自分がクリーンな統合確認worktreeで開始したmergeが競合した**: 内容を勝手に選ばず、
  `git status --short`で競合ファイル名を報告し、`git merge --abort`でmerge開始前へ戻します。
  merge中は新しい無関係な編集をしません。abortが失敗したらそのまま停止して相談します。
- **テスト失敗後に統合を取り消す**: mergeコミット前なら同じworktreeで `git merge --abort`。
  既にコミット済みならresetせず相談します。
- **rebase/cherry-pick等が進行中**: 今回の担当が開始したと確認できない操作は中止もせず、所有者へ相談します。

`git reset --hard`、`git clean -fd`、`git worktree remove --force`、強制pushは使いません。
後片付けはユーザーが成果・保存済み変更・実行中プロセスを確認してから別途行います。
この補助スクリプトには削除機能はありません。

## 最初の依頼例

```text
cloverへ: この依頼を調査・実装・レビューへ分けて指揮してください。
Wiki等はcloverのクラウドで調査し、必要な実測資料や仕様判断は私に具体的に依頼してください。
調査から出た新しい機能案は提案してください。採用前に実装しないでください。

実装担当へ: 指定worktreeとtaskブランチで、この1タスクだけを実装してください。
最初にパス・ブランチ・基点・担当ファイルを報告し、他人の変更や共通部分との衝突は相談してください。
check/buildと差分確認の結果を報告し、コミットや統合は私の許可を待ってください。

レビュー担当へ: 指定した成果SHAのレビュー用worktreeを読み取りで確認してください。
基点からの差分とcheck/buildを確認し、不具合・不足・共通部分の影響を実装担当へ返してください。
修正・merge・pushはしないでください。
```
