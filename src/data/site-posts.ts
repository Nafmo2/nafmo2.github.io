import { getCollection, type CollectionEntry } from "astro:content";

export type SitePost = CollectionEntry<"posts">;
export type SitePostStatus = "draft" | "scheduled";

/** 開発中だけ表示する非公開状態を返す */
export function sitePostStatus(
	post: SitePost,
	now: Date = new Date(),
): SitePostStatus | undefined {
	if (post.data.draft) return "draft";
	if (post.data.pubDate.getTime() > now.getTime()) return "scheduled";
	return undefined;
}

/** 下書きではなく、公開日時を過ぎている記事だけを公開対象にする */
export function isPublishedSitePost(
	post: SitePost,
	now: Date = new Date(),
): boolean {
	return sitePostStatus(post, now) === undefined;
}

let loggedUnpublished = false;

/** 本番ビルド時だけ、非公開記事のタイトルをログに出す */
async function logUnpublishedSitePosts(now: Date): Promise<void> {
	if (!import.meta.env.PROD || loggedUnpublished) return;
	loggedUnpublished = true;

	const posts = await getCollection("posts");
	const drafts = posts.filter((post) => post.data.draft);
	const scheduled = posts.filter(
		(post) =>
			!post.data.draft && post.data.pubDate.getTime() > now.getTime(),
	);

	if (drafts.length === 0 && scheduled.length === 0) return;

	const lines = ["[posts] 本番ビルドでは非公開の記事"];
	if (drafts.length > 0) {
		lines.push("下書き:");
		lines.push(...drafts.map((post) => `  - ${post.data.title}`));
	}
	if (scheduled.length > 0) {
		lines.push("投稿予約:");
		lines.push(...scheduled.map((post) => `  - ${post.data.title}`));
	}
	console.log(lines.join("\n"));
}

/** 開発中は下書き・投稿予約も含め、本番は公開記事だけを返す */
export async function getVisibleSitePosts(
	now: Date = new Date(),
): Promise<SitePost[]> {
	await logUnpublishedSitePosts(now);
	const posts = await getCollection("posts");
	if (import.meta.env.DEV) return posts;
	return posts.filter((post) => isPublishedSitePost(post, now));
}

export async function getPublishedSitePosts(
	now: Date = new Date(),
): Promise<SitePost[]> {
	await logUnpublishedSitePosts(now);
	const posts = await getCollection("posts");
	return posts.filter((post) => isPublishedSitePost(post, now));
}
