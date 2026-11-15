export interface FeedSource {
	id: string;
	label: string;
	feedUrl: string;
	/** この日付以降の記事だけ取り込む（YYYY-MM-DD） */
	since?: string;
}

/*
 * 記事を集約するフィード。
 * ビルド時に取得するので、外部サービスが落ちていてもビルドは継続する
 * （取得できなかったフィードはスキップされる）。
 */
export const feedSources: FeedSource[] = [
	{
		id: "hatena",
		label: "Hatena",
		feedUrl: "https://nafmo.hatenablog.jp/feed",
		since: "2025-01-01",
	},
	{ id: "zenn", label: "Zenn", feedUrl: "https://zenn.dev/nafmo2/feed" },
	{ id: "qiita", label: "Qiita", feedUrl: "https://qiita.com/Nafmo2/feed" },
];
