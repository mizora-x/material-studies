# Material Studies

ピクセルアートとガラスのノブで遊ぶ、トグルスイッチの小さな習作集です。
描画と音はライブラリなし（生の WebGL2 + Web Audio + CPU で描く 176×50 のピクセルバッファ）、ページは Astro で静的生成しています。

公開先: https://mizora-x.github.io/material-studies/

| No. | 作品 | テーマ |
| --- | --- | --- |
| 062 | [Daybreak Switch](https://mizora-x.github.io/material-studies/062-daybreak-switch/) | 夜 → 朝。猫の部屋に朝を引き込む |
| 063 | [Thaw Switch](https://mizora-x.github.io/material-studies/063-thaw-switch/) | 冬 → 春。雪の窪地に春を流し込む |

## 技術スタック

- **Astro**（静的出力、`base: /material-studies`）
- **TypeScript**（`astro/tsconfigs/strict`、`astro check` で型検査）
- **CSS Modules**（コンポーネントごとの `*.module.css`。ページ全体の土台だけ `src/styles/global.css`）
- **GitHub Actions** で `main` への push ごとに型検査 → ビルド → GitHub Pages へデプロイ。PR では型検査とビルドだけ実行

## 構成

```
src/
  engine/              全作品で共有する実行部分
    pixel.ts           176×50 のピクセルバッファと「スタンプ」（自動アウトライン＋上明/下暗）
    glass.ts           ベゼル・トラック・ジェリーガラスのノブを描く WebGL2 シェーダー
    audio.ts           Web Audio の共通配線（ミックス、ローパス、ダック、先読みクロック、合成ヘルパー）
    switch.ts          スプリング物理、ポインター/キー操作、ページ色、表示、毎フレームのループ
  studies/
    daybreak/          No. 062：scene.ts（部屋と物語）/ music.ts（曲と効果音）/ index.ts / SPEC.md
    thaw/              No. 063：同上
  components/
    SwitchStudy.astro  作品ページの共通レイアウト（+ SwitchStudy.module.css）
  pages/
    index.astro        一覧ページ
    062-daybreak-switch/index.astro
    063-thaw-switch/index.astro
  data/studies.ts      各作品のタイトル・キャプション・初期表示などの文言
```

## 開発

```sh
npm ci
npm run dev      # http://localhost:4321/material-studies/
npm run check    # 型検査
npm run build    # dist/ に静的出力
npm run preview
```

## 新しい作品を足す

1. `src/studies/<name>/` に `scene.ts`（`update(frame)` で物語を進めてピクセルバッファに描く）、`music.ts`（`Music` を実装）、`index.ts`（`Study` を export）を作る
2. `src/data/studies.ts` に文言を 1 件追加
3. `src/pages/<No>-<name>/index.astro` を既存ページと同じ形で作り、`mount(study)` する

一覧ページは `studies.ts` から自動で並びます。

## 操作

- ノブかトラックをドラッグ / タップで反対端へ
- キーボード: ← → / Home / End / Space / Enter
- 音は最初のタッチで始まり、「Sound on/off」で切り替え
