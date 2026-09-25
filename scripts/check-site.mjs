import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import config from '../astro.config.mjs';

// Inspect the actual output, so new routes need no manually maintained list.
const dist = resolve('dist');
const site = new URL(config.site);
const sitemapURL = new URL('/sitemap-index.xml', site).href;
const pages = new Map();
const titles = new Set();
const descriptions = new Set();

function elements(node, tag) {
	return (node.children ?? []).flatMap((child) => [
		...(child.name === tag ? [child] : []),
		...elements(child, tag),
	]);
}

function text(node) {
	return node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
}

function one(nodes, label) {
	assert.equal(nodes.length, 1, `Expected exactly one ${label}, found ${nodes.length}`);
	return nodes[0];
}

async function* htmlFiles(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* htmlFiles(path);
		else if (entry.name.endsWith('.html')) yield path;
	}
}

for await (const path of htmlFiles(dist)) {
	const file = relative(dist, path).replaceAll('\\', '/');
	// Host error documents are not ordinary public pages.
	if (file === '404.html' || file === '500.html') continue;
	assert.ok(file.endsWith('index.html'), `Expected a directory route: ${file}`);
	const url = new URL(file.slice(0, -'index.html'.length), site).href;
	const doc = parseDocument(await readFile(path, 'utf8'));
	const html = one(elements(doc, 'html'), `html element in ${file}`);
	assert.equal(html.attribs.lang, 'fi', `Missing Finnish language in ${file}`);
	const head = one(elements(html, 'head'), `head in ${file}`);
	const body = one(elements(html, 'body'), `body in ${file}`);
	const title = text(one(elements(head, 'title'), `title in ${file}`)).trim();
	const metas = elements(head, 'meta');
	const description = one(metas.filter((node) => node.attribs.name === 'description'),
		`description in ${file}`).attribs.content?.trim();
	assert.ok(title && description, `Empty title or description in ${file}`);
	assert.ok(!titles.has(title), `Duplicate page title: ${title}`);
	assert.ok(!descriptions.has(description), `Duplicate description in ${file}`);
	titles.add(title);
	descriptions.add(description);
	const links = elements(head, 'link');
	const canonical = one(links.filter((node) => node.attribs.rel === 'canonical'),
		`canonical in ${file}`).attribs.href;
	assert.equal(canonical, url, `Canonical must match the production route in ${file}`);
	const sitemap = one(links.filter((node) => node.attribs.rel === 'sitemap'),
		`sitemap link in ${file}`).attribs.href;
	assert.equal(new URL(sitemap, url).href, sitemapURL, `Wrong sitemap link in ${file}`);
	for (const meta of metas) {
		if (/^(robots|googlebot|bingbot)$/i.test(meta.attribs.name ?? '')) {
			assert.ok(!/\b(noindex|nofollow|none)\b/i.test(meta.attribs.content ?? ''),
				`Public page blocks indexing or link discovery: ${file}`);
		}
	}
	assert.ok(elements(body, 'h1').some((heading) => text(heading).trim()), `Missing visible heading in ${file}`);
	const targets = elements(body, 'a')
		.filter((node) => node.attribs.href && !/\bnofollow\b/i.test(node.attribs.rel ?? ''))
		.map((node) => new URL(node.attribs.href, url))
		.filter((target) => target.origin === site.origin)
		.map((target) => `${target.origin}${target.pathname}`);
	pages.set(url, targets);
}
assert.ok(pages.size > 0, 'No built HTML pages found. Run npm run build first.');

const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
assert.equal(robots.trim(), `User-agent: *\nAllow: /\n\nSitemap: ${sitemapURL}`,
	'robots.txt must allow crawling and point to the production sitemap index.');

async function sitemapLocations(url, rootTag) {
	const parsedURL = new URL(url);
	assert.equal(parsedURL.origin, site.origin, `Non-production sitemap URL: ${url}`);
	assert.ok(!parsedURL.search && !parsedURL.hash, `Unexpected sitemap query or fragment: ${url}`);
	const xml = parseDocument(await readFile(join(dist, parsedURL.pathname), 'utf8'), { xmlMode: true });
	const root = one(elements(xml, rootTag), `${rootTag} in ${url}`);
	assert.equal(root.attribs.xmlns, 'http://www.sitemaps.org/schemas/sitemap/0.9');
	const locations = elements(root, 'loc').map((node) => text(node).trim());
	assert.ok(locations.length > 0, `Empty sitemap: ${url}`);
	return locations;
}

const sitemapFiles = await sitemapLocations(sitemapURL, 'sitemapindex');
const listedPages = [];
for (const sitemap of sitemapFiles) listedPages.push(...await sitemapLocations(sitemap, 'urlset'));
assert.equal(new Set(listedPages).size, listedPages.length, 'Duplicate sitemap URLs.');
assert.deepEqual([...listedPages].sort(), [...pages.keys()].sort(),
	'Sitemap URLs must exactly match all built public pages and their canonicals.');

// A sitemap complements navigation; it must not become the only way to find a page.
const reachable = new Set();
const pending = [site.href];
while (pending.length) {
	const url = pending.pop();
	if (reachable.has(url) || !pages.has(url)) continue;
	reachable.add(url);
	pending.push(...pages.get(url));
}
const orphans = [...pages.keys()].filter((url) => !reachable.has(url));
assert.deepEqual(orphans, [], 'Add a normal link from an existing reachable page to each new page.');

console.log(`Site checks passed: ${pages.size} pages; metadata, canonicals, robots.txt, sitemap coverage and internal discovery.`);
