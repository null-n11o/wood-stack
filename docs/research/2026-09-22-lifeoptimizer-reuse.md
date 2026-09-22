# Life Optimizerの再利用調査

確認日: 2026-09-22。参照先: `/Users/nakanokentaro/02_dev/lifeoptimizer`。参照コミット: `5756d9e5bb7b6f6e557f5e8543201245a571d5e1`。コードは読取のみで確認し、既存サイトの操作検証やwood-stackへの移植は実施していない。

| 参照ファイル | 確認内容 | wood-stackへの適用 |
|---|---|---|
| `package.json` | Astro 7、TypeScript、npm、Vitest、Pagefind | 静的ページと小規模なブラウザ処理の構成を採る。バージョンや依存を一括コピーしない |
| `src/lib/directory-state.ts` | NFKCによる検索語正規化、公開対象の絞り込み、安定した名前順、最大3件比較、URL hashの復元 | 純粋関数と状態の分離を再利用。wood-stackはquery string、商品・寸法・販売条件の組を比較キーにする |
| `src/lib/directory-schema.ts` | 出典URLと確認日、nullで未確認を表現、ID・参照整合性の検証 | 出典モデルの考え方を継承。金額・寸法・送料・広告は専用の判別可能な型へ置換 |
| `src/components/directory/DirectoryExplorer.astro` | 静的一覧、JSによる機能追加、比較トレイ、該当なし、読み上げ用状態通知 | HTMLで読める商品一覧を先に出力。検索・比較・計算だけをJSで追加 |
| `src/lib/article-directory.ts` | 記事から掲載商品へのID対応 | wood-stackの記事frontmatterへ商品IDと検索条件を保存し、逆方向の関連記事も生成 |
| `src/content.config.ts` | MarkdownをContent Collectionsで検証、WordPress移行メタデータ | Markdownとスキーマ検証を採る。WordPressのsourceId・targetPath・wpSlugは持ち込まない |

AIツール／モデルの料金・機能比較を板材の寸法やケース価格へ直接転用できない。同一商品の販売店違い、寸法違い、セット枚数違いを分離し、計算できない商品も比較表に残す設計が必要となる。

初版では記事の件数が少ないため、記事一覧のタイトル・説明文検索をブラウザで行う。本文の全文検索を担うPagefindは初版の依存へ入れず、記事数の増加や全文検索要求が出た時点で評価する。

再利用単位は責務の分け方と検証観点。既存コードの一括複製、既存サイトのデータ・画像・移行資産のコピー、共通パッケージ化は行わない。
