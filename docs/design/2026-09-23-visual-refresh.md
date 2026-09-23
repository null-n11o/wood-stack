# 初版の画面デザイン改善

2026-09-23のCEO依頼「01_kcpのデザインのスキルで使えそうなものがあればインストールして使ってほしい。質素すぎる」を受け、初版受入の改善として既存画面を改修した。検索・計算・順位・広告・台帳の仕様は承認済み設計を継続する。既存実装TaskとPR #2を再利用し、別Taskは作成していない。

## 使用したスキル

KCPのtechnology規約から参照するマシン共通スキルを確認した。以下はすでに `~/.codex/skills/` から `~/.agents/skills/` へのsymlinkで導入済みだったため、重複インストールは行っていない。

- `redesign-existing-projects`: 既存スタックと機能を保ち、現状確認、問題点の整理、対象を絞った改善を行う。
- `design-taste-frontend`: トップの素材表現と文字・余白の強弱に適用。検索フォーム・比較表には適用せず、既存の入力・操作要件を優先する。
- `imagegen`: トップ用の工房イメージを組込みツールで生成。実商品画像の代用には使わない。

Superpowersは継続。既存画面の見た目に絞った改修として扱い、通常の技術判断を委任された範囲で具体化した。追加の表示・導線は失敗するE2Eを先に確認し、完了前に全検証を実行する。ユーザー全域のプラグイン設定と開発ハーネスは変更していない。

## 問題と改善

改修前のトップをブラウザで確認した。文字と同じ形の枠が中心で、素材を選ぶサービスだと伝える視覚情報が不足していた。主な操作が同じ強さで並び、検索フォームは項目のまとまりを把握しにくい状態だった。

深緑、明るい紙色、控えめな木の色を基調とし、トップは文章と素材イメージの2列に変更した。板材の検索を主な入口にして天板の入口と強弱を付け、計算の使い方と記事を別の構成で配置した。作風の判断は素材見本帳と木材選びの記事を組み合わせたもの。トップの表現差・動き・密度は6/2/4とし、常時アニメーションは使わない。

商品一覧は検索条件と結果を分け、寸法・予算は必要なときに開く形式にした。URLに有効な寸法条件があれば開いた状態で復元する。画像未掲載の商品には素材区分と寸法を表示し、実物写真があるようには見せない。比較リスト、現在ページの表示、計算入力と結果、記事、フッターの文字と余白も統一した。

## イメージ素材

保存先: `src/assets/wood-workbench.png`。組込みimage_genで生成し、AstroのImageで幅1200pxのWebPへ変換する。通常ビルドで約105KB。トップの画像下に「AI生成のイメージ。掲載商品の写真ではありません。」と明示する。商品台帳の画像権利レコードには加えない。

生成プロンプト:

```text
Use case: photorealistic-natural. Asset type: editorial hero photograph for wood-stack, a Japanese wood/material comparison website for home DIY and small shop owners. Create one refined natural-light still-life photograph, landscape 3:2, of carefully stacked real-looking pale cedar boards and a few medium-brown hardwood sample blocks on a substantial timber workbench in a quiet Japanese woodworking studio. Strong tactile visible end grain, subtle saw marks, softly worn edges, warm restrained wood tones. Composition: stack dominates right half and center, one long plank crosses diagonally in foreground, little studio background at top with soft neutral plaster and dark forest-green cabinet out of focus. Architectural design-magazine quality, directional window light, crisp natural shadows, understated atmospheric depth, beautiful material grain. No people, no hands, no brand labels, no printed text, no watermarks, no UI, no logos, no bright orange varnish, no sawdust chaos. This is a conceptual lifestyle image, not a depiction of any particular merchant's product. Deliver a single finished photograph.
```

## 検証と再開

`npm run verify` は型検査69ファイルでエラー・警告0件、単体112件、Chromium/WebKitのE2E42件、通常ビルド12ページ、生成リンク163件が成功した。追加E2Eはトップから板材への移動、現在位置、375px/1280pxのトップ・商品詳細、寸法条件の開閉とURL復元と不正URLからの入力欄への案内を確認した。既存の検索・比較・計算・記事、JS無効、200%文字拡大、キーボードも成功。スクリーンショットを目視し、実商品台帳のトップ・商品一覧はChromeでも確認した。768pxのタブレット幅も確認済み。テスト出力の画像はGitには追加しない。

500販売条件で各100回測定した検索/3件計算のp95はChromium 24/28ms、WebKit 35/16ms。どちらも200ms以内。ローカルNode 22.22.3での結果であり、全端末の性能保証ではない。

実装受入・マージ・公開は未実施。通常壁材概算が可能な2購入先以上の商品条件など、公開前の残課題は[実装検証](../implementation-verification.md)から継続する。
