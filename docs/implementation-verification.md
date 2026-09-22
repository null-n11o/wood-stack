# 初版実装の検証記録

2026-09-22、Node 22.22.3 / npm 10.9.8 / macOSで検証。設計時の900条件検算とは別に、今回のTypeScript実装を実行した。詳細設計と実装計画は同日のCEO依頼で承認済み。マージと公開の承認は含まれない。

## 実装と検証

Task 1〜7は計画順にテストの失敗、最小実装、成功を確認してコミットした。Task 8では受入・画像・キーボード・画面遷移の不足を追加検証した。計画中のサンプルコードは契約を保って調整し、フォーム・URL・読込処理は `src/client/shared.ts` に共通化した。CIは検証のみでデプロイを実行しない。

| 受入 | 証跡 |
|---|---|
| A01–A02 台帳分離・参照・入力検証 | catalog.test.ts、import.test.ts、search.test.ts |
| A03–A04 数量・方向・寸法範囲・購入単位 | wall.test.tsの固定期待値と900条件の単調性・購入量検査 |
| A05 送料・税込・見積もり | cost.test.ts、catalog.spec.tsの送料未確認表示 |
| A06 広告中立性 | search.test.tsの全並び順、links.test.ts、articles.test.ts |
| A07 検索・ページ・URL | search.test.ts、state.test.ts、catalog.spec.ts |
| A08 比較の制約 | compare.test.ts、catalog.spec.ts |
| A09 記事・商品・計算への遷移 | articles.spec.ts、catalog.spec.ts。詳細移動でも比較状態を保持 |
| A10 画像・広告・日付境界 | links.test.ts、cost.test.ts、public.test.ts、画像表示E2E |
| A11 取込の原子性・SHA | import.test.ts。一時ディレクトリ内の実ファイルで検証 |
| A12 実商品例 | acceptance.test.ts。toolbox3条件24800/18600/49600円、W/K不明、C展示 |
| A13 JS・画面・操作 | accessibility.spec.ts、catalog.spec.ts。Chromium/WebKit、375/1280px、200%文字拡大、Tab操作 |
| A14 公開境界・上限・生成物 | public.test.ts、articles.test.ts、generated-links.test.ts、check:content、check:links、verify.yml |

テストファイルは `tests/unit/` と `tests/e2e/` に配置。実商品と異なるfixtureは試験専用ビルドへ分離した。通常ビルドは実商品2件・記事3件を含む12ページで、生成リンク147件を検査した。外部リンクへの自動HTTP巡回は行わない。

`npm run verify` は型検査、単体112件、記事・台帳検査、通常ビルド、生成リンク、両ブラウザのE2E32件を一括実行し、全件成功した。型検査は68ファイルでエラー・警告0件。最終結果はPRのCIと合わせて確認する。文書・設定は `git diff --check`、JSON構文、ローカル参照46件、上位PLANの参照コミットとのバイト一致・SHA-256を検査した。

## 画面と性能

375pxの検索・比較、1280pxの検索・比較、200%文字拡大の計算画面をキャプチャして目視した。比較表だけを横スクロールでき、ページ全体の横はみ出しを防ぐ。本文へのスキップリンクはWebKitでも最初のTabでフォーカスできる。商品画像は許諾済みのものだけ表示し、クレジットを併記する。

500販売条件を読み込み、検索と3件の壁計算を各100回、実ブラウザでフォーム送信からDOM更新まで測定した。直前の全検証では検索/計算p95がChromium 11/14ms、WebKit 12/8msで、いずれも200ms以内という目標を満たした。値はローカル環境の測定で、すべての端末の性能保証ではない。

## 残る受入と公開条件

実装TaskのCEO受入は未実施。登録した実商品はtoolboxと弘形工芸の2購入先で、通常の壁材概算ができる購入先はtoolboxのみ。BASEは429、WOODPROは注文条件の確認が残る。2購入先以上の通常概算という公開条件は未達。合成データで条件を補っていない。

広告は未登録、商品画像も未登録。広告の掲載・成果条件、画像を使う場合の許諾、公開先・ドメイン・訂正受付先を確認する。施工の安全性、現物、購入手続きの実地検証は本テストの対象外。再開時はNotionの実装Task本文、PR、[商品運営手順](catalog-operations.md)と[直接確認記録](research/2026-09-22-registration.md)を読む。
