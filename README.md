# Material Studies

ピクセルアートとガラスのノブで遊ぶ、トグルスイッチの小さな習作集です。
各作品はライブラリなしの静的ファイルだけで動きます（生の WebGL2 + Web Audio + CPU で描く 176×50 のピクセルバッファ）。

| No. | 作品 | テーマ |
| --- | --- | --- |
| 062 | [Daybreak Switch](062-daybreak-switch/) | 夜 → 朝。猫の部屋に朝を引き込む |
| 063 | [Thaw Switch](063-thaw-switch/) | 冬 → 春。雪の窪地に春を流し込む |

各フォルダの `SPEC.md` が、その作品を作ったときの仕様です。

## 構成

```
index.html               一覧ページ
062-daybreak-switch/     index.html / style.css / main.js / SPEC.md
063-thaw-switch/         index.html / style.css / main.js / SPEC.md
.nojekyll                GitHub Pages で Jekyll 処理を止める
```

## ローカルで見る

ES モジュールや fetch は使っていないので `index.html` を直接開いても動きますが、静的サーバー経由が確実です。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## 公開

GitHub Pages（`main` ブランチの `/`）から配信しています。ビルド工程はありません。

## 操作

- ノブかトラックをドラッグ / タップで反対端へ
- キーボード: ← → / Home / End / Space / Enter
- 音は最初のタッチで始まり、「Sound on/off」で切り替え
