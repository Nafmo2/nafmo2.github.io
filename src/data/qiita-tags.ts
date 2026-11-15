/*
 * Qiita のフィードにはタグが含まれないため、公式 API から記事ごとのタグを補完する。
 * API はビルド時に 1 回だけ呼び、フィードに含まれる記事をカバーできた時点で止める。
 */

const QIITA_ITEMS_API = "https://qiita.com/api/v2/users/Nafmo2/items";
const PER_PAGE = 100;
const MAX_PAGES = 5;
const API_TIMEOUT_MS = 15_000;

interface QiitaItem {
	url?: unknown;
	tags?: unknown;
}

interface QiitaTag {
	name?: unknown;
}

/** URL 比較用に、クエリ・ハッシュ・末尾スラッシュ・大文字小文字の差を吸収する */
export function normalizeUrl(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.hash = "";
		parsed.search = "";
		return parsed.toString().replace(/\/$/, "").toLowerCase();
	} catch {
		return url.trim().replace(/\/$/, "").toLowerCase();
	}
}

function tagsOf(item: QiitaItem): string[] {
	const tags: string[] = [];
	if (!Array.isArray(item.tags)) return tags;
	for (const entry of item.tags as QiitaTag[]) {
		const name = typeof entry?.name === "string" ? entry.name.trim() : "";
		if (name && !tags.includes(name)) tags.push(name);
	}
	return tags;
}

/**
 * 指定した記事 URL に対応する Qiita のタグを取得する。
 * 失敗した場合は空の Map を返し、呼び出し側はタグなしのまま処理を続ける。
 */
export async function fetchQiitaTags(
	urls: string[],
): Promise<Map<string, string[]>> {
	const result = new Map<string, string[]>();
	if (urls.length === 0) return result;

	const wanted = new Set(urls.map(normalizeUrl));
	const found = new Set<string>();

	try {
		for (let page = 1; page <= MAX_PAGES; page += 1) {
			const response = await fetch(
				`${QIITA_ITEMS_API}?page=${page}&per_page=${PER_PAGE}`,
				{
					headers: {
						"user-agent":
							"Mozilla/5.0 (compatible; personal-site-feed-aggregator/1.0)",
					},
					signal: AbortSignal.timeout(API_TIMEOUT_MS),
				},
			);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data: unknown = await response.json();
			if (!Array.isArray(data)) {
				throw new Error("unexpected response");
			}

			for (const item of data as QiitaItem[]) {
				const url = typeof item?.url === "string" ? item.url : "";
				if (!url) continue;
				const key = normalizeUrl(url);
				if (!wanted.has(key)) continue;
				const tags = tagsOf(item);
				if (tags.length > 0) result.set(key, tags);
				found.add(key);
			}

			if (found.size >= wanted.size) break;
			if (data.length < PER_PAGE) break;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[posts] Qiita のタグ取得をスキップ: ${message}`);
		return new Map();
	}

	return result;
}
