# wood-stack 開発規約

## 現在地と作業範囲

2026-09-22に詳細設計・実装計画のCEO承認と実装依頼を取得。長方形の壁一面・開口部差引きなし・端材再利用なしでTask順に実装する。既存リモートは `https://github.com/null-n11o/wood-stack.git`。接続先・公開範囲を独断で変更しない。

サービス名は `wood-stack`。利用者は個人DIYと小規模店舗オーナー。案件外商品も含めた複数店舗比較と通常リンクの案内を行い、広告報酬で順位を変えない。確定事項を再質問しない。

## 読む順

1. このファイルと `README.md`。
2. KCPの `AGENTS.md`、`workspace/technology/rules.md`、`rules/plans.md`、`rules/tasks.md`、`rules/git.md`。
3. `docs/README.md` と上位PLANコピー `docs/PLAN-20260922-301-wood-stack.md`。再開時にはKCPの正本との差分も確認する。
4. KCPの `workspace/product/ideas/2026-09-22-家具建具・機械器具の特化メディア/` 内の `00-brief.md`、`05-open-questions.md`、`06-selection-2026-09-22.md`、`07-service-concepts-2026-09-22.md`。
5. `docs/review.md`、`docs/superpowers/specs/2026-09-22-wood-stack-design.md`、`docs/research/2026-09-22-real-products.md`、`docs/superpowers/plans/2026-09-22-wood-stack.md`。

KCPのルートは `/Users/nakanokentaro/01_kcp`。別リポジトリである本リポにも上記規約を適用する。他環境ではKCPの配置を確認し、未読の規約を推測しない。旧調査の撤回済み推薦や仮定の収益を現在の決定として扱わない。

## Commands

```sh
# 現在の文書・設定の検証
git diff --check
git diff --cached --check
python3 -m json.tool .claude/settings.json
git status --short --branch

# 開発準備の再開時
python3 /Users/nakanokentaro/01_kcp/tools/kcp.py --root /Users/nakanokentaro/01_kcp context --dept technology
python3 /Users/nakanokentaro/01_kcp/tools/scripts/notion_tasks.py snapshot
```

現時点ではアプリの起動・ビルド・テストコマンドは存在しない。技術選定と実装時に実在するコマンドをここへ追記する。文書変更は参照先と差分を検証する。

## Architecture

- `README.md`: サービス概要と現在地。
- `docs/`: 上位PLANのスナップショットと参照情報。
- `docs/superpowers/specs/`: レビュー待ちの要件・詳細設計の正本。
- `docs/superpowers/plans/`: レビュー待ちの実装計画の正本。
- `.cursor/rules/coding-harness.mdc`: ハーネスの選択。
- `.claude/settings.json`: このプロジェクトのSuperpowers設定。

技術推奨案はAstro静的生成＋TypeScript＋JSON台帳＋Markdown記事。選定理由は `docs/decisions/2026-09-22-static-catalog.md`。Life Optimizerの調査結果は `docs/research/2026-09-22-lifeoptimizer-reuse.md`。

## Working rules

- 既存の未コミット変更を保持し、書き込み担当は一人とする。
- 通常の技術判断は推奨案を選び、理由を残す。事業方針や大きなトレードオフはCEOへ確認する。
- 継続作業の正本はNotion。今回のTaskは `https://app.notion.com/p/3e3208bc20a38111923ccfe2aa7f9b26`。再開時に本文を読み、目的が変わる実装作業は明示依頼と照合する。新規着手前にProjects/Tasksを完全取得して目的・対象・成果物を照合し、重複Taskを作らない。`rules/tasks.md` に従い依頼範囲の登録とIn Progressの書込確認後に進める。
- 開発の要件・設計・実装計画はこのリポジトリ、企画・経営の正本はKCPへ置く。
- 既定ブランチから `codex/<内容>` の短命ブランチを作る。検証した依頼範囲だけをコミットする。
- 今回の文書変更を含め、既存リモートへのpush・PR作成までを通常の完了処理とし、マージ・公開・支払い・本番反映には別途明示承認を必要とする。
- 秘密値、実際の `.env`、認証情報、作業中間物をコミットしない。ライセンスや公開範囲を独断で設定しない。

## 開発ハーネスとSkill routing

デフォルトは **Superpowers**。`/dev-harness` のインストール済み手順で選択済み。pstack・gstackを同時に有効にしない。ハーネス本体はリポジトリへコピーしない。

- 設計: `brainstorming`。
- 実装計画: `writing-plans`。
- レビュー通過後の実装: `test-driven-development`。計画のTask順に進め、Task単位でコミットする。
- 完了前の検証: `verification-before-completion`。
- 長文・技術記事: KCP指定の `japanese-tech-writing`、日本語校閲: `japanese-proofreading`。

直接呼べないスキルは `~/.codex/skills/<skill>/SKILL.md` またはインストール済みの実体を全文読んで手順に従う。ハーネス入口は `~/.agents/harnesses/dev-harness/SKILL.md`。Codexではスキル単体を使用し、ユーザー全域のプラグイン設定を変更しない。

## 実装前レビューの条件

詳細設計と実装計画を作成してCEOへ提示し、レビュー通過を記録してからプロダクトコードの実装を始める。初期セットアップや上位PLANの承認を実装承認とみなさない。

設計では画面遷移・入力条件・並び順・該当なし、商品と寸法バリエーション・販売条件・広告関係、張る方向・継ぎ方・寸法のばらつき・ロス・予備材・セット単位の計算を具体化する。送料不明と0円、材料費と総額を区別し、出典・確認日・更新手順・画像利用条件を記述する。

案件外を含む複数店舗の実商品比較例を用意する。計算・検索・広告に左右されない順位の受入条件と検証方法を実装計画に対応させる。未確認の広告条件と公開前の確認事項を残す。
