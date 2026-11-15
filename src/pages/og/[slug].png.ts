import type { APIRoute, GetStaticPaths } from "astro";
import type { CollectionEntry } from "astro:content";
import { formatDate } from "../../data/posts";
import { getVisibleSitePosts } from "../../data/site-posts";
import { renderOgImage } from "../../lib/og-image";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getVisibleSitePosts();
	return posts.map((post) => ({
		params: { slug: post.id },
		props: { post },
	}));
};

interface Props {
	post: CollectionEntry<"posts">;
}

export const GET: APIRoute<Props> = async ({ props }) => {
	const { post } = props;
	const png = await renderOgImage({
		title: post.data.title,
		kickerLeft: post.data.tags.slice(0, 3).join(" / "),
		kickerRight: formatDate(post.data.pubDate).displayDate,
	});

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
