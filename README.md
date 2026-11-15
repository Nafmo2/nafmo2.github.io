# Nafmo Hub

Nafmo のプロフィールと、Hatena / Zenn / Qiita / 自サイトの記事をまとめた静的サイトです。

公開 URL: <https://nafmo.dev>

- `/` プロフィールと最新記事
- `/posts/` 記事一覧（媒体・タグ・作成年月・キーワードで絞り込み）
- `/about/` About
- `/index.xml` RSS

## 技術構成

- [Astro](https://astro.build/) 7（静的生成）
- 自サイト記事: Astro Content Collections（Markdown）
- 外部記事: RSS / Atom フィードをビルド時に取得（`fast-xml-parser`）
- OGP 画像: `satori` + `@resvg/resvg-js` でビルド時に生成
- フォント: サイト表示は Google Fonts、OGP 生成は Fontsource（Noto Sans JP / IBM Plex Mono）

## 開発

Node.js 22.23.4 以上が必要です。

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に静的ファイルを出力
npm run check    # 型チェック（astro check）
npm run preview  # ビルド結果をローカルで確認
```

ローカル固有の設定・メモ・上書きファイルは、`*.local.*`（例: `settings.local.json`）または `local/` ディレクトリに置いてください。Git 管理対象外になります。

## 記事を書く

新しい記事はコマンドで作成します。

```sh
npm run new -- my-first-post
```

- スラッグは半角英小文字・数字・ハイフンのみ
- `src/content/posts/<slug>.md` が作成される
- 作成直後は `draft: true`。公開時に `false` へ変更する
- 未来の `pubDate` を指定した記事は、その時刻を過ぎてからビルドするまで表示されない

フロントマター、日時の扱い、下書き・公開予約の運用は [ARTICLE-GUIDE.md](./ARTICLE-GUIDE.md) を参照してください。

## 設定

| ファイル | 内容 |
| --- | --- |
| `src/config/site.ts` | サイト名・URL・説明・Google Analytics・表示フォント・既定 OGP |
| `src/data/feed-sources.ts` | 集約する外部フィード（Hatena / Zenn / Qiita） |
| `src/data/excerpts.json` | 一覧に表示する要約の上書きデータ |
| `src/styles/global.css` | サイト全体のスタイル。`:root` に色・フォント・本文幅などの共通値 |

外部フィードはビルド時に取得します。取得に失敗したフィードはスキップされ、ビルドは継続します。

## ディレクトリ構成

```text
src/
├── components/      # 一覧・タグ・アイコンなど
├── config/          # サイト設定
├── content/
│   ├── about.md
│   └── posts/       # 自サイト記事
├── data/            # 外部フィード取得・記事データ
├── layouts/
├── lib/             # OGP 画像生成
├── pages/           # ルーティング
└── styles/

scripts/new-article.mjs       # 記事作成コマンド
templates/article-template.md # 記事テンプレート
ARTICLE-GUIDE.md              # 記事の書き方
public/CNAME                  # 独自ドメイン
```

## 補足

- ルートは静的生成です。公開はビルド済みの `dist/` を配信します。
