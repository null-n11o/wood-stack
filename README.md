# wood-stack

個人DIYと小規模店舗オーナー向けの、木材・内装資材の検索・比較・便利機能と記事を組み合わせるサービス。

## 現在の状態

2026-09-22の設計承認を受け、初版の検索・比較・壁材計算・記事を実装しました。実装の受入と公開前の商品条件確認が残っています。公開・本番反映は行っていません。

[レビュー案内](docs/review.md)から設計書・実商品比較・実装計画を確認できます。

## 確定方針

- 木材・内装資材を起点に、関連するレントラックス案件があるカテゴリーまで拡張可能。
- 掲載商品は案件外も含め、複数店舗を横断比較する。
- アフィリエイト案件の有無で順位を変えない。
- 案件外の商品には通常リンクで購入先を案内する。

## 初期機能

板材・天板の商品検索、最大3商品の比較、商品詳細と購入先リンク、壁用板材の必要数量・セット数・材料費の概算、記事一覧・詳細と検索への相互導線を実装しています。商品登録は手動確認とファイル取込で行います。

会員、サイト内決済、3D、全店舗の自動収集は初期対象外です。

## 開発の入口

[AGENTS.md](AGENTS.md)に作業規約、[docs/README.md](docs/README.md)に上位PLANの正本・参照時点と今後の資料配置を記載しています。

開発ハーネスは **Superpowers**。構成はAstro静的生成＋TypeScript＋JSON台帳＋Markdown記事です。壁材計算は長方形の壁一面・開口部差引きなし・端材再利用なしです。

Node 22.22.3を使用します。

```sh
npm ci
npx playwright install chromium webkit
npm run dev            # ローカル確認
npm run verify         # 型・単体・内容・ビルド・リンク・E2E
npm run build          # 実商品台帳でdistを生成
npm run preview        # 生成物のローカル確認
git diff --check
git status --short --branch
python3 -m json.tool .claude/settings.json
```

[実装検証](docs/implementation-verification.md)、[商品更新手順](docs/catalog-operations.md)、[実商品の確認状況](docs/research/2026-09-22-registration.md)を参照してください。設計用draftと試験用fixtureは公開台帳へ取り込みません。
