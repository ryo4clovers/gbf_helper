# captures/

[Network Recorder](../README.md)からエクスポートした生データ(JSONファイル)を溜めておくディレクトリです。

## 運用ルール

- **このディレクトリの中身(このREADME.md以外)はリポジトリにコミットしません**(`.gitignore`で除外済み)。ローカル環境限定の保管場所です。
- 理由: 実機のレスポンスをほぼそのまま保存するため、容量が大きくなりやすいことと、装備中パーティ等アカウント固有の情報を含む場合があるため。
- とはいえ将来DB化(`knowledge/`の先にある構造化DB・ダメージ計算機、[docs/data-collection-notes.md](../../../docs/data-collection-notes.md)参照)の際に参照する一次データとして、ローカルでは消さずに残しておく方針。
- ファイル名は基本的にNetwork Recorderの「JSONでエクスポート」ボタンが生成する`gbf-network-recorder-export-{timestamp}.json`形式のまま、または個別エクスポート機能で保存した単体ファイル(元のURL由来のファイル名)をそのまま置く。サブフォルダで日付や対象ジョブ名などに分けても良い。
