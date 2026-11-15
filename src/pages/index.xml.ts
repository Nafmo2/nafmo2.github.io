import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { siteConfig } from "../config/site";
import { getPublishedSitePosts } from "../data/site-posts";

export const GET: APIRoute = async (context) => {
	const posts = await getPublishedSitePosts();
	const items = posts
		.slice()
		.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
		.map((post) => ({
			title: post.data.title,
			link: `/posts/${post.id}/`,
			pubDate: post.data.pubDate,
			description: post.data.summary?.trim() || undefined,
		}));

	return rss({
		title: siteConfig.name,
		description: siteConfig.description,
		site: context.site ?? siteConfig.url,
		items,
		customData: "<language>ja</language>",
	});
};
