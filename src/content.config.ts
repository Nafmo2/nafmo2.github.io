import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const about = defineCollection({
	loader: glob({ pattern: "about.md", base: "./src/content" }),
});

/**
 * 日時を日本時間として解釈する。
 * - オフセット（Z / +09:00 など）付きはその指定を優先
 * - 日付だけならその日の 0 時（JST）
 * - オフセットなしの日時は JST
 * - YAML が Date 型として読み込んだ場合はその絶対時刻をそのまま使う
 */
function toJstDate(value: string | Date): Date {
	if (value instanceof Date) return value;

	const raw = value.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		return new Date(`${raw}T00:00:00+09:00`);
	}
	if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
		return new Date(raw);
	}
	return new Date(`${raw}+09:00`);
}

const jstDate = z
	.union([z.string(), z.date()])
	.transform((value) => toJstDate(value));

const posts = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		pubDate: jstDate,
		updatedDate: jstDate.optional(),
		summary: z.string().optional(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

export const collections = { about, posts };
