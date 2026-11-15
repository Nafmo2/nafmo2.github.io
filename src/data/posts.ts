import { XMLParser } from "fast-xml-parser";
import excerpts from "./excerpts.json";
import { feedSources, type FeedSource } from "./feed-sources";
import { fetchQiitaTags, normalizeUrl } from "./qiita-tags";
import { getVisibleSitePosts, sitePostStatus, type SitePostStatus } from "./site-posts";

export interface Post {
	/** YYYY-MM-DD（time 要素の datetime 用） */
	date: string;
	/** YYYY.MM.DD（表示用） */
	displayDate: string;
	title: string;
	url: string;
	/** 一覧に表示する一言要約（上書きデータ or フィード summary の最初の文） */
	excerpt?: string;
	/** フィードの id（絞り込み用）。自サイト記事は "site" */
	source: string;
	sourceLabel: string;
	/** 記事のタグ。外部フィードにタグが無ければ空配列 */
	tags: string[];
	/** 開発中だけ付く非公開状態 */
	status?: SitePostStatus;
}

type XmlNode = Record<string, unknown>;

const FEED_TIMEOUT_MS = 15_000;

const parser = new XMLParser({
	ignoreAttributes: false, // Atom の <link href="..."> は属性側にある
	attributeNamePrefix: "@_",
	textNodeName: "#text",
	cdataPropName: "__cdata",
	removeNSPrefix: true,
	trimValues: true,
	processEntities: true,
	// 記事が 1 件だけのフィードでも配列で返す
	isArray: (name) => name === "item" || name === "entry",
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

function asArray(value: unknown): unknown[] {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
}

function isNode(value: unknown): value is XmlNode {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** CDATA・テキストノード・プレーン文字列をまとめて文字列にする */
function textOf(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.map(textOf).filter(Boolean).join(" ");
	}
	if (isNode(value)) {
		if ("__cdata" in value) return textOf(value.__cdata);
		if ("#text" in value) return textOf(value["#text"]);
	}
	return "";
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

function decodeEntities(text: string): string {
	return text.replace(
		/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi,
		(match, code: string) => {
			if (code[0] === "#") {
				const hex = code[1] === "x" || code[1] === "X";
				const value = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
				return Number.isFinite(value) && value > 0 && value <= 0x10ffff
					? String.fromCodePoint(value)
					: match;
			}
			return NAMED_ENTITIES[code.toLowerCase()] ?? match;
		},
	);
}

/** HTML を落としてタイトル用のプレーンテキストにする */
function plainText(value: unknown): string {
	let text = textOf(value);
	// エスケープされた HTML が二重になっているフィードもあるため、2 回通す
	for (let i = 0; i < 2; i += 1) {
		text = decodeEntities(text)
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<[^>]*>/g, " ");
	}
	return text.replace(/\s+/g, " ").trim();
}

/**
 * 一覧に出す概要文を決める。
 * 1. excerpts.json（URL キー）に上書きがあればそれを使う
 * 2. なければフィードの summary を使う
 * 3. HTML タグを除去し、最初の「。」までに切り詰める（「…」は付けない）
 *    全角ピリオド「．」で文を区切るフィードもあるため、同じ文末として扱う
 */
function excerptOf(url: string, summary: unknown): string | undefined {
	const override = (excerpts as Record<string, string>)[url];
	const text = plainText(
		typeof override === "string" && override.trim() ? override : summary,
	);
	if (!text) return undefined;
	const end = text.search(/[。．]/);
	return end >= 0 ? text.slice(0, end + 1) : text;
}

function attrOf(value: unknown, name: string): string {
	if (!isNode(value)) return "";
	const attr = value[`@_${name}`];
	return typeof attr === "string" ? attr : "";
}

/** RSS の category / Atom の category term をタグとして取り出す */
function tagsOf(item: XmlNode): string[] {
	const tags: string[] = [];
	for (const category of asArray(item.category)) {
		const raw =
			typeof category === "string"
				? category
				: attrOf(category, "term") || textOf(category);
		const tag = plainText(raw);
		if (tag && !tags.includes(tag)) tags.push(tag);
	}
	return tags;
}

function linkOf(item: XmlNode): string {
	const links = asArray(item.link);
	for (const link of links) {
		if (typeof link === "string" && link.trim()) return link.trim();
		const href = attrOf(link, "href");
		const rel = attrOf(link, "rel");
		if (href && (!rel || rel === "alternate")) return href;
	}
	for (const link of links) {
		const href = attrOf(link, "href");
		if (href) return href;
	}
	// Atom の id が URL になっているフィード向け
	const id = textOf(item.id).trim();
	return /^https?:\/\//i.test(id) ? id : "";
}

function parseDate(value: unknown): Date | null {
	const raw = textOf(value).trim();
	if (!raw) return null;
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** JST 固定で日付を表示用に整形する（ビルド環境の TZ に依存しない） */
export function formatDate(date: Date): Pick<Post, "date" | "displayDate"> {
	const parts = dateFormatter.formatToParts(date);
	const get = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? "";
	const year = get("year");
	const month = get("month");
	const day = get("day");
	return {
		date: `${year}-${month}-${day}`,
		displayDate: `${year}.${month}.${day}`,
	};
}

function itemsFrom(parsed: unknown): XmlNode[] {
	if (!isNode(parsed)) return [];
	const root = parsed;

	const rss = root.rss;
	if (isNode(rss) && isNode(rss.channel)) {
		return asArray(rss.channel.item).filter(isNode);
	}

	const feed = root.feed;
	if (isNode(feed)) {
		return asArray(feed.entry).filter(isNode);
	}

	// RSS 1.0 / RDF
	const rdf = root.RDF;
	if (isNode(rdf)) {
		return asArray(rdf.item).filter(isNode);
	}

	return [];
}

function parseFeed(xml: string, source: FeedSource): Post[] {
	const posts: Post[] = [];

	for (const item of itemsFrom(parser.parse(xml))) {
		const title = plainText(item.title);
		const url = linkOf(item);
		if (!title || !url) continue;

		const date =
			parseDate(item.pubDate) ??
			parseDate(item.published) ??
			parseDate(item.updated) ??
			parseDate(item.date) ??
			parseDate(item.created);
		if (!date) continue;

		const formatted = formatDate(date);
		if (source.since && formatted.date < source.since) continue;

		const excerpt = excerptOf(url, item.summary);

		posts.push({
			...formatted,
			title,
			url,
			excerpt,
			source: source.id,
			sourceLabel: source.label,
			tags: tagsOf(item),
		});
	}

	return posts;
}

async function loadSource(source: FeedSource): Promise<Post[]> {
	// [TODO: ...] のままの URL は取得しない
	if (!/^https?:\/\//i.test(source.feedUrl)) return [];

	try {
		const response = await fetch(source.feedUrl, {
			headers: {
				"user-agent":
					"Mozilla/5.0 (compatible; personal-site-feed-aggregator/1.0)",
			},
			signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return parseFeed(await response.text(), source);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`[posts] ${source.label} のフィードをスキップ: ${message}`);
		return [];
	}
}

function dedupe(posts: Post[]): Post[] {
	const seen = new Set<string>();
	return posts.filter((post) => {
		if (seen.has(post.url)) return false;
		seen.add(post.url);
		return true;
	});
}

function sortByDateDesc(posts: Post[]): Post[] {
	return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** 自サイトの記事を一覧用の Post に変換する（開発中は非公開記事も含む） */
async function loadSitePosts(now: Date): Promise<Post[]> {
	const entries = await getVisibleSitePosts(now);
	return entries.map((entry) => ({
		...formatDate(entry.data.pubDate),
		title: entry.data.title,
		url: `/posts/${entry.id}/`,
		excerpt: entry.data.summary?.trim() || undefined,
		source: "site",
		sourceLabel: "Hub",
		tags: entry.data.tags,
		status: import.meta.env.DEV ? sitePostStatus(entry, now) : undefined,
	}));
}

async function loadPosts(): Promise<Post[]> {
	const now = new Date();
	const [results, sitePosts] = await Promise.all([
		Promise.allSettled(feedSources.map(loadSource)),
		loadSitePosts(now),
	]);
	const feedPosts = results.flatMap((result) =>
		result.status === "fulfilled" ? result.value : [],
	);

	// Qiita のフィードにはタグが無いため、公式 API のタグを URL をキーに統合する
	const qiitaTags = await fetchQiitaTags(
		feedPosts
			.filter((post) => post.source === "qiita")
			.map((post) => post.url),
	);
	for (const post of feedPosts) {
		if (post.source !== "qiita") continue;
		const tags = qiitaTags.get(normalizeUrl(post.url));
		if (tags && tags.length > 0) {
			post.tags = [...new Set([...post.tags, ...tags])];
		}
	}

	return sortByDateDesc(dedupe([...sitePosts, ...feedPosts]));
}

let cache: Promise<Post[]> | undefined;

/** ビルド時に各フィードを取得し、新しい順の記事一覧を返す */
export function getPosts(): Promise<Post[]> {
	cache ??= loadPosts();
	return cache;
}
