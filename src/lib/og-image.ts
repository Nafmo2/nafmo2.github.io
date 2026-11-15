import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const require = createRequire(import.meta.url);

/** フォントファイルは npm パッケージから読む（外部ダウンロードはしない） */
function fontFile(packageName: string, file: string): Buffer {
	const packageJson = require.resolve(`${packageName}/package.json`);
	const root = packageJson.slice(0, -"package.json".length);
	return readFileSync(`${root}files/${file}`);
}

let cachedFonts:
	| Array<{
			name: string;
			data: Buffer;
			weight: 400 | 500 | 600;
			style: "normal";
	  }>
	| undefined;

function fonts() {
	cachedFonts ??= [
		{
			name: "Noto Sans JP",
			data: fontFile(
				"@fontsource/noto-sans-jp",
				"noto-sans-jp-japanese-400-normal.woff",
			),
			weight: 400,
			style: "normal",
		},
		{
			name: "Noto Sans JP",
			data: fontFile(
				"@fontsource/noto-sans-jp",
				"noto-sans-jp-japanese-600-normal.woff",
			),
			weight: 600,
			style: "normal",
		},
		{
			name: "Noto Sans JP Latin",
			data: fontFile(
				"@fontsource/noto-sans-jp",
				"noto-sans-jp-latin-400-normal.woff",
			),
			weight: 400,
			style: "normal",
		},
		{
			name: "Noto Sans JP Latin",
			data: fontFile(
				"@fontsource/noto-sans-jp",
				"noto-sans-jp-latin-600-normal.woff",
			),
			weight: 600,
			style: "normal",
		},
		{
			name: "IBM Plex Mono",
			data: fontFile(
				"@fontsource/ibm-plex-mono",
				"ibm-plex-mono-latin-400-normal.woff",
			),
			weight: 400,
			style: "normal",
		},
		{
			name: "IBM Plex Mono",
			data: fontFile(
				"@fontsource/ibm-plex-mono",
				"ibm-plex-mono-latin-500-normal.woff",
			),
			weight: 500,
			style: "normal",
		},
	];
	return cachedFonts;
}

type Style = Record<string, string | number>;
type Child = string | null | undefined | Node | Child[];
interface Node {
	type: string;
	props: {
		style?: Style;
		children?: Child | Child[];
		src?: string;
		alt?: string;
	};
}

function el(type: string, style: Style, children?: Child | Child[]): Node {
	return { type, props: { style, children } };
}

/** カード右下のプロフィールアイコン（src/assets/melicon.jpg）を data URI で読む */
let cachedIcon: string | undefined;

function footerIcon(): string {
	cachedIcon ??= `data:image/jpeg;base64,${readFileSync(
		resolve(process.cwd(), "src/assets/melicon.jpg"),
	).toString("base64")}`;
	return cachedIcon;
}

export interface OgImageInput {
	title: string;
	/** 上部の小さな行の左側（記事はタグ、共通画像は Portfolio & Blog） */
	kickerLeft: string;
	/** 上部の小さな行の右側（記事は日付、共通画像は空） */
	kickerRight?: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CARD_OUTER_PADDING = 18;
const CONTENT_PADDING_X = 96;
const CONTENT_PADDING_Y = 72;
const PROFILE_ICON_SIZE = 160;
/** 右下のプロフィールアイコンの位置（内側カードの右端・下端から）。ここを変えるとアイコンだけ動く */
const PROFILE_ICON_RIGHT = 32;
const PROFILE_ICON_BOTTOM = 32;
/** 外枠の罫線・外側パディング・内側パディングを除いた本文の幅 */
const CONTENT_WIDTH =
	CARD_WIDTH -
	CARD_OUTER_PADDING * 2 -
	2 -
	CONTENT_PADDING_X * 2;
/**
 * タイトルは本文幅いっぱいを使う。
 * アイコンとの重なりは、アイコン位置（PROFILE_ICON_RIGHT / BOTTOM）側で調整する。
 */
const TITLE_MAX_WIDTH = CONTENT_WIDTH;

/**
 * デザイン時の OGP カードを 1200×630 に比例換算して描画する。
 * 表示用の値（タイトル 40px など）はカード幅 660px 前後を想定しているため、
 * 1200 / 660 ≒ 1.82 倍を目安にしている。
 */
export async function renderOgImage({
	title,
	kickerLeft,
	kickerRight,
}: OgImageInput): Promise<Buffer> {
	const titleLength = Array.from(title).length;
	const titleSize = titleLength > 64 ? 46 : titleLength > 42 ? 58 : 70;
	const titleClamp = titleLength > 64 ? 5 : titleLength > 42 ? 4 : 3;

	const card = el(
		"div",
		{
			width: `${CARD_WIDTH}px`,
			height: `${CARD_HEIGHT}px`,
			boxSizing: "border-box",
			border: "1px solid #d6d6cf",
			padding: `${CARD_OUTER_PADDING}px`,
			background: "#ffffff",
			display: "flex",
		},
		el(
			"div",
			{
				position: "relative",
				flex: 1,
				boxSizing: "border-box",
				border: "1px solid #e8e8e3",
				background: "#ffffff",
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-start",
				padding: `${CONTENT_PADDING_Y}px ${CONTENT_PADDING_X}px`,
				overflow: "hidden",
			},
			[
				el("div", {
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 0,
					width: "16px",
					background: "#c73e1d",
				}),
				el("div", { display: "flex", flexDirection: "column" }, [
					el(
						"div",
						{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "22px",
							fontFamily: "IBM Plex Mono",
							fontSize: "23px",
							lineHeight: 1.5,
							letterSpacing: "0.18em",
							textTransform: "uppercase",
							color: "#9a9a94",
						},
						[
							el(
								"span",
								{
									fontFamily:
										"IBM Plex Mono, Noto Sans JP, Noto Sans JP Latin",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									maxWidth: "58%",
								},
								kickerLeft,
							),
							el(
								"span",
								{
									fontFamily: "IBM Plex Mono",
									whiteSpace: "nowrap",
								},
								kickerRight ?? "",
							),
						],
					),
					el(
						"div",
						{
							marginTop: "22px",
							maxWidth: `${TITLE_MAX_WIDTH}px`,
							fontFamily: "Noto Sans JP, Noto Sans JP Latin",
							fontSize: `${titleSize}px`,
							fontWeight: 600,
							lineHeight: 1.4,
							color: "#1a1a18",
							lineClamp: titleClamp,
						},
						title,
					),
				]),
				el(
					"span",
					{
						position: "absolute",
						left: `${CONTENT_PADDING_X}px`,
						bottom: `${CONTENT_PADDING_Y}px`,
						fontFamily: "IBM Plex Mono",
						fontSize: "25px",
						lineHeight: 1,
						color: "#5c5c57",
					},
					"nafmo.dev",
				),
				{
					type: "img",
					props: {
						src: footerIcon(),
						alt: "",
						style: {
							position: "absolute",
							right: `${PROFILE_ICON_RIGHT}px`,
							bottom: `${PROFILE_ICON_BOTTOM}px`,
							width: `${PROFILE_ICON_SIZE}px`,
							height: `${PROFILE_ICON_SIZE}px`,
							borderRadius: "50%",
							objectFit: "cover",
						},
					},
				},
			],
		),
	);

	const svg = await satori(card as never, {
		width: 1200,
		height: 630,
		fonts: fonts(),
	});

	const png = new Resvg(svg, {
		fitTo: { mode: "width", value: 1200 },
	})
		.render()
		.asPng();
	return Buffer.from(png);
}
