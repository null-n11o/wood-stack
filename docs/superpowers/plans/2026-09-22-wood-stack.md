# wood-stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 同一作業ツリーの書込み担当は一人。CEOレビュー通過前に実行しない。

**Goal:** 板材・天板を複数店舗で検索・比較し、壁用板材の数量と材料費を概算できるサービスを実装する。

**Architecture:** Astroで商品と記事のHTMLを生成する。JSON台帳を検証して公開用データへ変換し、TypeScriptの純粋関数で数量・費用・順位を計算する。広告リンクは順位の確定後に結合する。

**Tech Stack:** Node.js 22系、npm、Astro 7系、TypeScript strict、Vitest、Playwright。依存は実装時に互換性確認後、package-lock.jsonへ固定。

**Spec:** [2026-09-22-wood-stack-design.md](../specs/2026-09-22-wood-stack-design.md)。作成日2026-09-22、設計・本計画ともレビュー待ち。以下のコードブロックは実装時の契約・テスト例であり、今回のPRには実行コードを作成しない。

## Global Constraints

- Node.js 22系（22.12.0以上）、npm、package-lock.jsonを使用する。
- Astro 7系、TypeScript strict、Vitest、Playwrightを候補とし、実装時に互換性を確認してlockfileへ固定する。
- 公開販売条件500件、記事100件、公開カタログJSON非圧縮1MiBを初版の上限とする。
- 寸法はmm整数、金額はJPY整数。実測小数は最小値を切り捨て、最大値を切り上げた包含範囲として登録する。
- 本番公開・デプロイ・マージは別途明示承認を必要とする。
- 広告の有無で順位を変えない。案件外商品にも通常リンクを付ける。
- 取込、公開、広告リンクの契約はspecを正本とし、旧調査や合成fixtureを実商品として掲載しない。

---

## 実行前の確認

CEOの設計・実装計画へのレビュー結果を `docs/review.md` へ記録し、承認された範囲をNotion Task本文と照合する。今回の準備Taskをそのまま実装承認として使わない。新しい実装依頼の範囲を `rules/tasks.md` に従って管理し、mainから実装用短命ブランチを作る。

設計を変更する場合は先にspecと計画を揃える。特に計算範囲、広告順位、商品登録元の変更を実装者の都合で広げない。既存依存はまだ存在しないため、インストール前に公開バージョンとNode互換性を確認する。

## ファイルと責務

| ファイル群 | 責務 |
|---|---|
| `src/catalog/types.ts`, `schema.ts`, `repository.ts` | 台帳の型・構造と参照整合性・読み込み |
| `src/data/catalog.json` | 手動確認済み台帳。画像権利の公開可能な根拠だけを保存 |
| `scripts/import-catalog.ts` | dry-run、SHA照合、全件検証、原子的な置換 |
| `src/calculator/wall.ts` | 純粋な幾何計算、範囲と不可理由 |
| `src/offers/cost.ts`, `links.ts`, `freshness.ts` | 費用、広告リンク選択、情報鮮度 |
| `src/search/state.ts`, `catalog.ts`, `compare.ts` | URL契約、検索と順位、比較状態 |
| `src/catalog/public.ts` | 非公開項目を除く公開JSONの生成 |
| `src/pages/`, `src/components/`, `src/styles/global.css` | 静的画面と共通表示 |
| `src/client/catalog.ts`, `wall.ts`, `compare.ts` | ブラウザのイベントと純粋関数の接続 |
| `src/content/articles/`, `src/content.config.ts`, `src/articles/related.ts` | 記事、プリセット、相互リンク |
| `tests/fixtures/catalog.ts`, `tests/unit/`, `tests/e2e/` | 合成fixtureと自動検証 |
| `scripts/check-content.ts`, `check-links.ts`, `.github/workflows/verify.yml` | 台帳・記事・生成リンク・CI検証（デプロイなし） |

## 共通の型と試験データ

Task 1はspec §5の全エンティティを `types.ts` に定義する。Dimension、Price、Shipping、Availabilityはspecの型をそのまま使う。文字列のenumはspecの値に固定し、Zodのstrict objectで未知キーを拒否する。`Catalog` はschemaVersion、sellers、products、variants、offers、adLinks、evidence、imagesの配列を持つ。

以下の関数型を各Taskで実装する。`CatalogRow` は公開済みのproduct・variant・offer・sellerを結合した型であり、広告データを含まない。型は `types.ts`、数量の型は `wall.ts`、検索の型は `state.ts` に定義する。

```ts
// src/calculator/wall.ts
export type WallInput = {
  ww: number; wh: number; direction: 'vertical' | 'horizontal';
  joint: 'none' | 'butt'; trim: number; kerf: number;
  reserve: number; extra: number;
};
export type Bound = {
  rows: number; perRow: number; installed: number; spare: number;
  required: number; units: number; purchased: number; excess: number;
};
export type EstimateResult =
  | { kind: 'estimate' | 'reference'; low: Bound; high: Bound; reasons: string[] }
  | { kind: 'unavailable'; reasons: string[] };
// CatalogRowは広告を持たない。priceとshippingはofferの一部。
export type CatalogRow = {
  product: Product; variant: Variant; offer: Offer; seller: Seller;
};
// src/offers/cost.ts
export type CostResult = {
  materialLowYen: number | null; materialHighYen: number | null;
  shippingYen: number | null; subtotalLowYen: number | null;
  subtotalHighYen: number | null; rankable: boolean; reasons: string[];
};
// src/search/state.ts
export type Filters = {
  category: 'board' | 'top'; q: string; species: string; finish: string;
  use: string; lmin: number | null; lmax: number | null;
  wmin: number | null; wmax: number | null; tmin: number | null;
  tmax: number | null; budget: number | null;
  sort: 'name' | 'checked' | 'unit-price'; page: number;
};
export type UrlState = {
  v: 1; filters: Filters; compare: string[]; wall: WallInput | null;
  materialBudget: number | null; // URLのmbudget、検索のbudgetとは別
};
export type SearchPage = {
  products: { productId: string; representativeOfferId: string;
    matchingOfferIds: string[]; purchaseSourceCount: number }[];
  total: number; page: number;
};
```

`Product/Variant/Offer/Seller` はspec §5の表とenumを満たす型。Productのspecies/finishはstring|null、usesはstring[]、dimensionとprice/shippingの不明は判別union、checkedAtはYYYY-MM-DD文字列。公開投影でEvidence.methodと対象項目・確認日を保持し、noteの運営メモは除く。

fixtureは外部の現在値に依存させない。次の初期値を `tests/fixtures/catalog.ts` に定義し、`fixtureRow(patch?: {product?: Partial<Product>; variant?: Partial<Variant>; offer?: Partial<Offer> }): CatalogRow` で浅いエンティティ単位の上書きを行う。`fixtureCatalog(rows?: CatalogRow[]): Catalog` は参照エンティティをIDで重複排除し、evidenceと画像なしの値を加える。

```ts
// 固定fixtureの値。URLはネットワーク取得せず型とリンク挙動だけに使う。
const sourceUrl = 'https://example.com/board';
// product: id='board-a', slug='board-a', name='A板', category='board',
// species='杉', finish='無塗装', uses=['wall'], description='試験用板材',
// status='published', identityEvidenceId='ev-a', imageId=null
// variant: id='variant-a', productId='board-a', sellerSku=null,
// length={kind:'bounded',minMm:1000,maxMm:1000},
// width=coverageWidth={kind:'bounded',minMm:100,maxMm:100},
// thickness={kind:'bounded',minMm:10,maxMm:10}, geometry='uniform', evidenceId='ev-a'
// offer: id='offer-a', variantId='variant-a', sellerId='seller-a',
// sourceUrl, purchaseUrl=sourceUrl, saleUnit='set', piecesPerUnit=10,
// price={kind:'fixed',yen:2000,tax:'included'},
// shipping={kind:'unknown',note:'送料未確認'}, availability='available',
// minimumUnits=1, unitStep=1, maxUnits=null, checkedAt='2026-09-22', evidenceIds=['ev-a']
// seller: id='seller-a', name='試験店', channel='direct',
// shopUrl='https://example.com/', purchaseHosts=['example.com']
// evidence: id='ev-a', url=sourceUrl, checkedAt='2026-09-22',
// method='direct', fields=['identity','dimensions','price','availability'], note='合成fixture'
// adLinks=[], images=[]、schemaVersion=1。実データファイルへコピーしない。
export const wallInput: WallInput = {
  ww: 1800, wh: 900, direction: 'vertical', joint: 'butt',
  trim: 5, kerf: 3, reserve: 10, extra: 0,
};
```

全テストは時刻を `'2026-09-22'` に固定し、関数のtoday引数で渡す。乱数試験はseed固定、外部商品ページや広告サイトへHTTPアクセスしない。

### Task 1: 台帳の検証と原子的なJSON取込

**Files:** Create `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `vitest.config.ts`, `src/catalog/types.ts`, `src/catalog/schema.ts`, `src/catalog/repository.ts`, `scripts/import-catalog.ts`, `tests/fixtures/catalog.ts`, `tests/unit/catalog.test.ts`, `tests/unit/import.test.ts`。Modify `.gitignore`（取込一時ファイルを除外）。

**Interfaces:**
- Consumes: spec §5・§7の台帳定義。
- Produces: `parseCatalog(input: unknown, today: string): Catalog`（失敗はpath付きエラー）、`loadCatalog(path: string, today: string): Promise<Catalog>`、`importCatalog(inputPath: string, targetPath: string, options: { apply: boolean; expectedSha?: string; today: string }): Promise<{sha: string; added: string[]; updated: string[]}>`。

- [ ] **Step 1:** Node互換性を確認し、実装依存を完全バージョンで記録する。`npm view astro@7 version engines`、`npm view vitest version engines`、`npm view typescript version`、`npm view zod version engines`、`npm view tsx version engines`を確認。Node22で動く版を選び、`npm install --save-exact` を使う。package nameはwood-stack、private=true、type=module。scriptsは `test: vitest run`、`import:catalog: tsx scripts/import-catalog.ts` を登録。
- [ ] **Step 2:** fixtureと失敗テストを作る。重複・不正・参照切れとunknown許容を分ける。

```ts
import { expect, test } from 'vitest';
import { parseCatalog } from '../../src/catalog/schema';
import { fixtureCatalog } from '../fixtures/catalog';
test('unknown送料を保持し、0円へ変換しない', () => {
  const c = parseCatalog(fixtureCatalog(), '2026-09-22');
  expect(c.offers[0].shipping).toEqual({kind:'unknown', note:'送料未確認'});
});
test('参照先のない販売条件を拒否する', () => {
  const c = fixtureCatalog(); c.offers[0].variantId = 'missing';
  expect(() => parseCatalog(c, '2026-09-22')).toThrow(/variantId/);
});
```

- [ ] **Step 3:** `npm test -- tests/unit/catalog.test.ts` を実行し、未実装のimportまたは参照検証の失敗を確認する。テストランナー自体の設定エラーは先に直す。
- [ ] **Step 4:** Zodのstrict構造検証→エンティティ別ID集合→参照検証→公開条件検証の順で実装。URLはHTTPS・認証情報なし・host許可、日付は実在日かつtoday以下、数値はsafe integerと範囲、offerの最大購入量と最少量の整合を検証する。失敗例ごとにJSON pathを返す。公開販売条件500件と公開JSON 1MiBの制限はpublic投影を実装するTask 5で検証する。

```ts
// schema.tsの参照検証。構造検証を通過したCatalogに適用する。
const variantIds = new Set(catalog.variants.map(v => v.id));
for (const [i, offer] of catalog.offers.entries()) {
  if (!variantIds.has(offer.variantId)) {
    throw new Error(`offers[${i}].variantId: missing reference`);
  }
}
```

- [ ] **Step 5:** 取込テストを一時ディレクトリ上で追加。dry-run前後のバイト一致、2行目不正で全件不変、expectedSha不一致で不変、ファイルサイズ超過、同ID更新、欠落行を保持するケースを固定する。CLIは `--input <file> [--apply --expected-sha <sha>]` とし、targetは `src/data/catalog.json`。importCatalog本体は任意のtargetPathを受けて試験可能にする。

```ts
// 保存順: 検証→差分→現在ファイルのSHA再照合→同じディレクトリへ一時保存→rename。
// ファイルがない初回の現在SHAは空バイト列のSHA-256とする。
const sha = createHash('sha256').update(currentBytes).digest('hex');
if (options.apply && options.expectedSha !== sha) throw new Error('catalog changed');
// createHashはnode:crypto、readFile/writeFile/rename/unlinkはnode:fs/promisesからimportする。
```

- [ ] **Step 6:** `npm test -- tests/unit/catalog.test.ts tests/unit/import.test.ts` が全件PASSすることを確認。`git diff --check` 後、対象ファイルを列挙してstageし `git commit -m "feat: validate and import catalog data"`。

### Task 2: 壁材の枚数・セット数計算

**Files:** Create `src/calculator/wall.ts`, `tests/unit/wall.test.ts`。

**Interfaces:** Consumes `CatalogRow`, `WallInput`。Produces `estimateWall(row: CatalogRow, input: WallInput): EstimateResult`。today・広告・価格への依存は持たない。利用可否と数量のみを返す。

- [ ] **Step 1:** 固定fixtureで数値テストを書く。

```ts
import { expect, test } from 'vitest';
import { estimateWall } from '../../src/calculator/wall';
import { fixtureRow, wallInput } from '../fixtures/catalog';
test('施工18枚に予備2枚を加えて2セット買う', () => {
  const r = estimateWall(fixtureRow(), wallInput);
  expect(r.kind).toBe('estimate');
  if (r.kind === 'unavailable') throw new Error(r.reasons.join(','));
  expect(r.high).toEqual({ rows:18, perRow:1, installed:18, spare:2,
    required:20, units:2, purchased:20, excess:0 });
});
test('短い寸法で継ぎなしが成立しなければ購入目安なし', () => {
  const row = fixtureRow({variant:{length:{kind:'bounded',minMm:900,maxMm:1000}}});
  expect(estimateWall(row, {...wallInput,joint:'none'}).kind).toBe('unavailable');
});
```

- [ ] **Step 2:** `npm test -- tests/unit/wall.test.ts` で未実装によるFAILを確認。
- [ ] **Step 3:** 入力・対象条件を検証してから、min/maxのそれぞれへ次の整数計算を実装する。理由コードは `invalid-input, unsupported-category, unknown-dimensions, nominal-dimensions, mixed-geometry, select-dimensions, unknown-pack, insufficient-length, invalid-effective-length, purchase-limit` に固定する。

```ts
const ceilDiv = (a: number, b: number) => Math.floor((a + b - 1) / b);
const effective = lengthMm - 2 * input.trim - input.kerf;
const span = input.direction === 'vertical' ? input.wh : input.ww;
const cross = input.direction === 'vertical' ? input.ww : input.wh;
// effective<=0、joint=none && span>effectiveはunavailableを返して終了。
const rows = ceilDiv(cross, widthMm);
const perRow = input.joint === 'none' ? 1 : ceilDiv(span, effective);
const installed = rows * perRow;
const spare = ceilDiv(installed * input.reserve, 100) + input.extra;
const required = installed + spare;
const rawUnits = ceilDiv(required, row.offer.piecesPerUnit);
const units = row.offer.minimumUnits + ceilDiv(
  Math.max(0, rawUnits - row.offer.minimumUnits), row.offer.unitStep
) * row.offer.unitStep;
const purchased = units * row.offer.piecesPerUnit;
const bound = { rows, perRow, installed, spare, required, units,
  purchased, excess: purchased-required };
```

上のコードはpiecesPerUnitがnumberと確定した分岐内に置く。nominalはmmを使ってreferenceとする。selectable等はunavailable。low/highのどちらかがnoneの長さ条件で失敗したら全体unavailable。

- [ ] **Step 4:** [実商品の例](../../research/2026-09-22-real-products.md)のTについて、909〜911×134〜136、10枚・最低1・刻み1のfixtureを追加。E1/E2/E3のhigh.unitsが4/3/8、requiredが31/24/80であることを確認。方向変更、0%/30%、追加100、注文刻み、unknown pack、NaN、限界値も独立テストにする。
- [ ] **Step 5:** 単調性をseed固定の100条件で検証する。壁を大きくする・有効寸法を小さくする・予備を増やすとhigh.unitsが減らない。余剰枚数は0以上。`npm test -- tests/unit/wall.test.ts` がPASSしたら `git commit -m "feat: estimate wall board quantities"`。

### Task 3: 費用・鮮度・広告リンク

**Files:** Create `src/offers/cost.ts`, `src/offers/freshness.ts`, `src/offers/links.ts`, `tests/unit/cost.test.ts`, `tests/unit/links.test.ts`。

**Interfaces:**
- Consumes `CatalogRow`, `EstimateResult`, Catalogのevidence/adLinks/images。
- Produces `calculateCost(row: CatalogRow, estimate: EstimateResult, evidence: Evidence[], today: string): CostResult`、`freshness(checkedAt: string, today: string, limitDays: number): 'fresh'|'stale'`、`purchaseLink(offer: Offer, seller: Seller, ad: AdLink | undefined, today: string): {href: string; label: string; rel: string}`、`canShowImage(image: ImageRight, today: string): boolean`。

- [ ] **Step 1:** 未確認送料と0円送料のテストを作る。

```ts
import {expect,test} from 'vitest';
import {calculateCost} from '../../src/offers/cost';
import {estimateWall} from '../../src/calculator/wall';
import {fixtureRow,fixtureCatalog,wallInput} from '../fixtures/catalog';
test('送料未確認でも材料費は計算し、小計は出さない', () => {
  const row=fixtureRow();
  const cost=calculateCost(row,estimateWall(row,wallInput),fixtureCatalog().evidence,'2026-09-22');
  expect(cost.materialHighYen).toBe(4000);
  expect(cost.subtotalHighYen).toBeNull();
});
```

- [ ] **Step 2:** `npm test -- tests/unit/cost.test.ts tests/unit/links.test.ts` のFAILを確認。
- [ ] **Step 3:** fixed/includedかつdirect・価格30日以内・仕様90日以内・通常概算かつavailabilityがavailable/made-to-orderの場合のみrankableにする。stale・税区分unknown・from・quote・unavailableはrankable=false。材料費の参考値を返す場合もreasonsで原因を出す。送料free/fixedは全国・対象数量内だけ適用する。

```ts
const materialLowYen = price.kind === 'fixed' && price.tax === 'included'
  ? estimate.low.units * price.yen : null;
const materialHighYen = price.kind === 'fixed' && price.tax === 'included'
  ? estimate.high.units * price.yen : null;
const subtotalHighYen = materialHighYen !== null && shippingYen !== null
  ? materialHighYen + shippingYen : null;
// estimateがunavailableの場合はこの分岐に入らず、金額は全てnull。
```

- [ ] **Step 4:** 送料の証拠がないfree、地域限定free、数量上限超えfixedを確定小計に使わないテストを追加。30/31日、90/91日、未来日、image expired、AdLink pending/suspended/期限切れ/host不正を検証。通常購入先host自体が不正ならスキーマ検証で拒否する。
- [ ] **Step 5:** リンク分岐を実装。approvedかつ期限内かつ許可hostのみ広告URL、それ以外は通常URL。通常URLを失うことがないようにする。

```ts
return validApprovedAd
  ? {href:ad.url, label:'広告・販売店で確認', rel:'sponsored noopener'}
  : {href:offer.purchaseUrl, label:'販売店で確認', rel:'noopener'};
```

- [ ] **Step 6:** 単体テストPASS後、 `git commit -m "feat: separate material costs shipping and affiliate links"`。

### Task 4: URL状態・検索順位・比較状態

**Files:** Create `src/search/state.ts`, `src/search/catalog.ts`, `src/search/compare.ts`, `tests/unit/search.test.ts`, `tests/unit/state.test.ts`, `tests/unit/compare.test.ts`。

**Interfaces:**
- Consumes Task 1のCatalog、Task 3の費用・鮮度関数。
- Produces `parseState(query: string, catalog: Catalog): {state: UrlState; warnings: string[]}`、`encodeState(state: UrlState): string`、`defaultState(): UrlState`（board、空文字の語句条件、nullの寸法・予算、name順、page=1、比較空、wall=null、materialBudget=null）、`searchCatalog(catalog: Catalog, filters: Filters, today: string): SearchPage`、`toggleCompare(ids: string[], offerId: string, catalog: Catalog): {ids: string[]; reason: string | null}`。
- `searchCatalog` は内部で広告を除いたCatalogRowへ投影する。商品単価と壁材費用の順位は別関数 `rankWallCosts(rows: {offerId:string; cost:CostResult}[]): string[]` とし、rankableな最多側材料費→offerId順を返す。

- [ ] **Step 1:** URL round-tripと広告中立性のテストを書く。

```ts
import {expect,test} from 'vitest';
import {defaultState,encodeState,parseState} from '../../src/search/state';
import {searchCatalog} from '../../src/search/catalog';
import {fixtureCatalog} from '../fixtures/catalog';
test('URLに日本語と比較対象を保持する', () => {
  const state=defaultState();state.filters.q='杉 無塗装';state.compare=['offer-a'];
  expect(parseState(encodeState(state),fixtureCatalog()).state).toEqual(state);
});
test('広告レコードを変えても順位は不変', () => {
  const c=fixtureCatalog(); const before=searchCatalog(c,defaultState().filters,'2026-09-22');
  c.adLinks=[{offerId:'offer-a',state:'approved',url:'https://ads.example/1',
    allowedHosts:['ads.example'],checkedAt:'2026-09-22',expiresAt:null}];
  expect(searchCatalog(c,defaultState().filters,'2026-09-22')).toEqual(before);
});
```

- [ ] **Step 2:** `npm test -- tests/unit/search.test.ts tests/unit/state.test.ts tests/unit/compare.test.ts` がFAILすることを確認。
- [ ] **Step 3:** spec §4の正規化・検証→offerで絞り込み→stable sort→product集約→ページングを実装する。順位関数に広告を渡さず、比較可能な単価は丸め前の数値を使う。

```ts
const normalize = (s:string) => s.normalize('NFKC').toLowerCase().trim();
const tokens = normalize(filters.q).split(/\s+/).filter(Boolean);
const textMatches = tokens.every(token => normalize(searchText).includes(token));
const fits = (d:Dimension,min:number|null,max:number|null) =>
  min===null && max===null || d.kind==='bounded'
    && (min===null || d.minMm>=min) && (max===null || d.maxMm<=max);
// searchTextは商品名・材種・仕上げ・販売店名をスペースで連結した文字列。
```

- [ ] **Step 4:** 2商品以上の同値fixtureで、全3並び順の広告有無入替、広告削除、入力配列逆順を検証。同じ商品2variantで購入先数1、別sellerで2を確認。25商品で2ページ、0件、page超過、未知ID、同カテゴリー3件、4件目拒否、異カテゴリ拒否を試験する。
- [ ] **Step 5:** 不正数値・重複query・未知v・2048文字超・全角入力・戻り値のwarningsを固定値で確認し、PASS後 `git commit -m "feat: add neutral catalog search and shareable state"`。

### Task 5: 静的ページと公開データ

**Files:** Create `astro.config.mjs`, `src/env.d.ts`, `src/catalog/public.ts`, `src/pages/index.astro`, `src/pages/products/index.astro`, `src/pages/products/[slug].astro`, `src/pages/catalog.json.ts`, `src/pages/policy.astro`, `src/pages/404.astro`, `src/layouts/Base.astro`, `src/components/ProductCard.astro`, `src/components/OfferList.astro`, `src/components/Price.astro`, `src/styles/global.css`, `tests/unit/public.test.ts`。Modify `package.json`, `tsconfig.json`, `src/data/catalog.json`。

**Interfaces:** Consumes parseCatalog/purchaseLink/canShowImage。Produces `toPublicCatalog(catalog: Catalog, today: string): Catalog`（note等の内部項目を空にした同形データ）、静的ルート、public catalog JSON。`catalog.json.ts` はビルド時に `JSON.stringify(toPublicCatalog(...))` を返すprerendered endpoint。

- [ ] **Step 1:** 非公開商品の全関連データと無許可画像、契約メモが公開JSONへ出ないテストを作る。広告の報酬額フィールドを未知キーとして登録拒否する試験も確認。
- [ ] **Step 2:** `npm test -- tests/unit/public.test.ts` でFAILを確認する。
- [ ] **Step 3:** Astro依存と `@astrojs/check` を互換版で追加。scriptsは `dev: astro dev`, `check: astro check`, `build: astro build`, `preview: astro preview`。static outputで作成し、公開商品だけのgetStaticPathsと404、全ページ共通のナビと掲載方針を実装。

```astro
---
import {loadCatalog} from '../../catalog/repository';
export async function getStaticPaths() {
  const catalog = await loadCatalog('src/data/catalog.json', new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'}));
  return catalog.products.filter(p=>p.status==='published')
    .map(product=>({params:{slug:product.slug},props:{product,catalog}}));
}
const {product,catalog}=Astro.props;
---
<h1>{product.name}</h1>
```

この断片にBase、寸法選択、OfferList、確認日・出典・関連記事を接続する。price表示は「1ケース」「1枚」を常に付ける。画像権利未確認時は画像URLをHTMLへ出さない。
- [ ] **Step 4:** 台帳へ掲載する実商品を出典から再確認する。少なくとも2購入先と板材・天板を各1件以上用意。計算できない見積もり天板はquoteで登録し、架空価格を作らない。公開前には2購入先で通常概算可能な板材を用意する条件を満たす。満たせない時は公開を保留して未確認項目を記録する。
- [ ] **Step 5:** `npm run check`、`npm test -- tests/unit/public.test.ts`、`npm run build`。生成HTMLでJSなしでも商品情報・記事入口・出典・通常購入先が読めることを確認し `git commit -m "feat: render catalog and product detail pages"`。

### Task 6: 検索・比較・壁材計算の画面接続

**Files:** Create `src/pages/compare.astro`, `src/pages/calculator/wall.astro`, `src/components/CompareTray.astro`, `src/components/WallForm.astro`, `src/components/Estimate.astro`, `src/client/catalog.ts`, `src/client/compare.ts`, `src/client/wall.ts`, `playwright.config.ts`, `tests/e2e/catalog.spec.ts`。Modify `src/pages/products/index.astro`, `src/pages/products/[slug].astro`, `package.json`。

**Interfaces:** Consumes Task 2〜5の関数とcatalog.json。Produces spec §3のフォーム・状態通知とURL遷移。HTMLのdata属性は `data-product-id`, `data-offer-id` に限定し、テストはlabel/roleを優先する。

- [ ] **Step 1:** Playwrightを導入し、`test:e2e: playwright test` を登録。テスト専用ビルドは `WOOD_STACK_TEST_DATA=1` の時だけ `tests/fixtures/catalog.ts` をrepositoryが読み、`dist-test` へ生成する。通常buildはこの変数が存在したらエラーにして合成データの公開を防ぐ。PlaywrightのwebServerはテストビルド＋localhost previewを起動する。
- [ ] **Step 2:** 検索→比較→計算の失敗E2Eを書く。

```ts
import {expect,test} from '@playwright/test';
test('壁の条件を適用して比較列へ戻せる', async ({page}) => {
  await page.goto('/products/?v=1&category=board');
  await page.getByLabel('検索語').fill('A板');
  await page.getByRole('button',{name:'条件を適用',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'1件'})).toBeVisible();
  await page.getByRole('button',{name:'A板を比較に追加'}).click();
  await page.getByRole('link',{name:'比較を見る'}).click();
  await expect(page.getByRole('columnheader',{name:/A板/})).toBeVisible();
  await page.getByRole('link',{name:'壁材の数量を計算'}).click();
  await page.getByLabel('壁の幅（mm）').fill('1800');
  await page.getByLabel('壁の高さ（mm）').fill('900');
  await page.getByLabel('長手方向の継ぎ').selectOption('butt');
  await page.getByRole('button',{name:'計算する',exact:true}).click();
  await expect(page.getByText('材料費 4,000円',{exact:true})).toBeVisible();
  await expect(page.getByText('送料未確認',{exact:true}).first()).toBeVisible();
});
```

- [ ] **Step 3:** `npm run test:e2e -- tests/e2e/catalog.spec.ts` で要素がないFAILを確認する。fixtureビルドの設定エラーは挙動テストのFAILと区別して修正。
- [ ] **Step 4:** フォームsubmit→入力検証→純粋関数→結果描画→pushStateを接続。popstateでparseStateから再描画。比較変更はreplaceState。DOMへ商品名や検索語を入れるときはtextContentを使い、innerHTMLへ渡さない。

```ts
form.addEventListener('submit', event => {
  event.preventDefault();
  // readFormはstate.tsの数値パーサーを使う画面専用関数。
  const parsed = readForm(form);
  if (parsed.errors.length) { renderErrors(parsed.errors); clearEstimate(); return; }
  renderState(parsed.state);
  history.pushState(null, '', '?' + encodeState(parsed.state));
});
window.addEventListener('popstate', () => renderState(parseState(location.search,catalog).state));
```

`readForm(form: HTMLFormElement): {state:UrlState;errors:string[]}`、`renderErrors(errors:string[]):void`、`clearEstimate():void`、`renderState(state:UrlState):void` を各clientファイル内の画面専用関数として定義する。readFormで壁寸法の片側空欄を検証し、renderStateでwarnings・件数・結果・リンクを一括更新する。
- [ ] **Step 5:** 0件、4件目、カテゴリ違い、比較空、入力誤り後の旧計算消去、戻る、直リンク再現、読込失敗・再試行、JS無効をE2Eへ追加。成功後 `git commit -m "feat: connect search comparison and wall calculator"`。

### Task 7: 記事と検索の相互導線

**Files:** Create `src/content.config.ts`, `src/articles/related.ts`, `src/pages/articles/index.astro`, `src/pages/articles/[slug].astro`, `src/content/articles/board-quantity.md`, `src/content/articles/dimension-variation.md`, `src/content/articles/price-and-shipping.md`, `tests/unit/articles.test.ts`, `tests/e2e/articles.spec.ts`, `scripts/check-content.ts`。Modify 商品詳細と検索ページの関連記事欄。

**Interfaces:** Consumes Catalog、Filters、encodeState。Produces `relatedArticleSlugs(productId:string,category:string,articles:Article[]):string[]` と `presetHref(filters:Partial<Filters>):string`。Articleの全frontmatter型はspec §5に従う。

- [ ] **Step 1:** 商品ID一致をカテゴリ一致より優先し、同点で更新日→slug順になるテストを書く。記事プリセットがparseStateで同値に復元されることを確認する。

```ts
import {expect,test} from 'vitest';
import {presetHref} from '../../src/articles/related';
import {parseState} from '../../src/search/state';
import {fixtureCatalog} from '../fixtures/catalog';
test('記事の条件が検索へ引き継がれる', () => {
  const href=presetHref({category:'board',finish:'無塗装'});
  const {state}=parseState(new URL(href,'https://example.com').search,fixtureCatalog());
  expect(state.filters.finish).toBe('無塗装');
});
```

- [ ] **Step 2:** `npm test -- tests/unit/articles.test.ts` でFAILを確認。
- [ ] **Step 3:** Markdown frontmatterをZodで検証し、公開記事だけgetStaticPathsで生成。presetHrefはencodeStateにdefaultStateとプリセットを渡す。関連記事の順位関数へadLinksを渡さない。

```ts
export function presetHref(filters: Partial<Filters>): string {
  const state = defaultState();
  state.filters = {...state.filters, ...filters, page:1};
  return '/products/?'+encodeState(state);
}
```

- [ ] **Step 4:** 3記事を実装時の確認済み情報と自作文で作る。各記事に対象費用・計算の仮定・条件付き検索リンクを付ける。check-contentで存在しない商品ID、未知検索値、draft参照、未来日を検出し、`check:content` コマンドを登録する。
- [ ] **Step 5:** 記事→無塗装検索→商品→関連記事のE2E、記事0件、タイトルAND検索、12件ページングを確認。`npm run check:content` と該当テストPASS後 `git commit -m "feat: link articles with product discovery"`。

### Task 8: 受入検証・運営手順・CI

**Files:** Create `scripts/check-links.ts`, `.github/workflows/verify.yml`, `tests/e2e/accessibility.spec.ts`, `tests/unit/acceptance.test.ts`, `docs/catalog-operations.md`, `docs/implementation-verification.md`。Modify `package.json`, `README.md`, `AGENTS.md`, `docs/review.md`。

**Interfaces:** Consumes 完成した全機能。Produces `npm run verify` と公開を伴わない検証記録。verifyは型検査→単体→コンテンツ→通常build→生成リンク検証→テストビルドのE2Eを1回ずつ実行する。

- [ ] **Step 1:** 未充足の受入条件をspec A01〜A14で照合し、テストを追加。主に広告入替の全順序、実商品Tの3条件、情報不足W/K・展示C、500 offerとJSON上限、古い日付を試験する。

```ts
import {expect,test} from 'vitest';
import {calculateCost} from '../../src/offers/cost';
import {estimateWall} from '../../src/calculator/wall';
import {fixtureCatalog,fixtureRow,wallInput} from '../fixtures/catalog';
test.each([[1800,900,'vertical',24800],[900,1800,'vertical',18600],[2700,2400,'horizontal',49600]] as const)
('現行toolbox仕様 %i×%i %s = %i円', (ww,wh,direction,expected) => {
 const row=fixtureRow({variant:{length:{kind:'bounded',minMm:909,maxMm:911},
  width:{kind:'bounded',minMm:134,maxMm:136},coverageWidth:{kind:'bounded',minMm:134,maxMm:136}},
  offer:{price:{kind:'fixed',yen:6200,tax:'included'}}});
 const result=estimateWall(row,{...wallInput,ww,wh,direction});
 expect(calculateCost(row,result,fixtureCatalog().evidence,'2026-09-22').materialHighYen).toBe(expected);
});
```

- [ ] **Step 2:** `npm test -- tests/unit/acceptance.test.ts`。既存機能でPASSする受入テストを無理に壊さず、不足分のFAILを特定して修正する。
- [ ] **Step 3:** `check-links.ts` はdist内のローカルhrefと画像参照の存在を検証。外部URLの型・hostは検査し、自動HTTPアクセスはしない。公開HTML/JSONへdraft、無許可画像、運営メモが含まれないことを確認する。
- [ ] **Step 4:** verifyスクリプトとCIを登録。GitHub Actionsはpush/PRの検証だけとし、デプロイ、広告申請、外部書込を実行しない。CIは `npm ci`、Playwrightブラウザ導入、`npm run verify`。失敗時は生成物を公開せず、ログとテストレポートを保管する。

```json
{
  "verify": "npm run check && npm test && npm run check:content && npm run build && npm run check:links && npm run test:e2e",
  "check:links": "tsx scripts/check-links.ts"
}
```

- [ ] **Step 5:** 375px/1280px、キーボードのみ、200%拡大、比較表の横スクロール、JS無効で手動確認する。500 offerの検索・3件計算p95を計測し、環境と値を記録。ChromiumとWebKitのE2Eを実行する。
- [ ] **Step 6:** catalog-operationsに登録・再確認周期・画像権利・広告停止・取込復旧を記述。通常buildに試験fixtureが含まれないことを確認し、READMEとAGENTSへ実在するコマンドを反映。
- [ ] **Step 7:** `npm run verify`、`git diff --check` の結果とA01〜A14の証跡を保存。 `git commit -m "test: verify wood-stack acceptance and editorial workflow"`、既存リモートへpushしてPRを作成。CEOへ受入を求め、マージ・公開は行わない。

## 計画の自己点検

specのA01〜A14を各Taskへ対応付けた。金額やURLの関数は画面内に重複させず、Task 1〜4の戻り値を使う。テストコード中のURLと商品名は試験専用であり、Task 5の実商品登録で採用しない。参考計算のrankable=false、送料null、広告の後結合を各Taskの境界で保持する。

実行方式は一人の作業担当による `executing-plans` を推奨する。レビュー通過後に実装を始める時点で確定し、今回の設計PRを実行開始の合図にしない。
