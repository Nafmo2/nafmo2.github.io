import type { APIRoute } from "astro";
import { siteConfig } from "../../config/site";
import { renderOgImage } from "../../lib/og-image";

export const prerender = true;

export const GET: APIRoute = async () => {
	const png = await renderOgImage({
		title: siteConfig.name,
		kickerLeft: "Portfolio & Blog",
	});

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
