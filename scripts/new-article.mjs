#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const slug = process.argv[2]?.trim();

if (!slug) {
	console.error("使い方: npm run new -- <slug>");
	console.error("例: npm run new -- my-first-post");
	process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
	console.error(
		"スラッグは半角英小文字・数字・ハイフンだけで指定してください: " + slug,
	);
	process.exit(1);
}

const templatePath = resolve(root, "templates/article-template.md");
const outputPath = resolve(root, "src/content/posts", `${slug}.md`);

if (existsSync(outputPath)) {
	console.error(
		"同じスラッグの記事が既にあります（上書きしません）: " +
			relative(root, outputPath),
	);
	process.exit(1);
}

const today = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
}).format(new Date());
const pubDate = `${today}T00:00:00`;

const template = readFileSync(templatePath, "utf8");
const content = template
	.replace(/^pubDate:.*$/m, `pubDate: "${pubDate}"`)
	.replace(/^updatedDate:.*$/m, `updatedDate: "${pubDate}"`);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, "utf8");

console.log("作成しました: " + relative(root, outputPath));
