const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const databaseId = process.env.NOTION_PHASES_DATABASE_ID;

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        fs.unlink(filepath, () => reject(err));
      });
  });
}

function toSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
}

async function downloadInlineImages(markdown, dateStr, slug) {
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(imgRegex)];
  if (matches.length === 0) return markdown;

  const dir = path.join(__dirname, "../images/phases");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let result = markdown;
  let idx = 0;
  for (const m of matches) {
    const [full, alt, url] = m;
    if (!/^https?:\/\//.test(url)) continue;

    idx++;
    let ext = ".jpg";
    try {
      const pathname = new URL(url).pathname;
      ext = path.extname(pathname) || ".jpg";
    } catch (_) {
      // keep default
    }
    const filename = `${dateStr}-${slug}-${idx}${ext}`;
    const localPath = path.join(dir, filename);

    try {
      await downloadFile(url, localPath);
      const webPath = `/images/phases/${filename}`;
      result = result.split(full).join(`![${alt}](${webPath})`);
      console.log(`  downloaded inline image → ${webPath}`);
    } catch (err) {
      console.warn(`  failed to download ${url}: ${err.message}`);
    }
  }

  return result;
}

async function syncPhases() {
  if (!databaseId) {
    console.error("No NOTION_PHASES_DATABASE_ID provided.");
    process.exit(1);
  }

  console.log("Querying Notion Phases database for 'Ready to Review' entries...");
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Status",
      status: { equals: "Ready to Review" },
    },
  });

  const pages = response.results;
  console.log(`Found ${pages.length} phase entries Ready to Review.`);

  for (const page of pages) {
    const title = page.properties.Title?.title?.[0]?.plain_text || "untitled";
    const children =
      page.properties.Child?.multi_select?.map((c) => c.name) || [];
    const dateStr =
      page.properties.Date?.date?.start ||
      new Date().toISOString().split("T")[0];
    const location =
      page.properties.Location?.rich_text?.[0]?.plain_text || "London, ON";
    const relatedText =
      page.properties.Related?.rich_text?.[0]?.plain_text || "";
    const related = relatedText
      ? relatedText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const isPrivate = page.properties.Private?.checkbox === true;

    if (children.length === 0) {
      console.warn(`Skipping "${title}" — no Child selected.`);
      continue;
    }

    const slug = toSlug(title) || page.id;

    const filename = `${dateStr}-${slug}.md`;
    const phasesDir = path.join(__dirname, "../_phases");
    if (!fs.existsSync(phasesDir)) fs.mkdirSync(phasesDir, { recursive: true });

    console.log(`\nConverting "${title}" (${children.join(", ")})...`);
    const mdblocks = await n2m.pageToMarkdown(page.id);
    let mdString = n2m.toMarkdownString(mdblocks).parent || "";

    mdString = await downloadInlineImages(mdString, dateStr, slug);

    const childrenYaml = `[${children.map((c) => JSON.stringify(c)).join(", ")}]`;
    const relatedYaml = related.length
      ? `[${related.map((r) => JSON.stringify(r)).join(", ")}]`
      : "[]";

    const frontmatter = `---
schema_version: 2
child: ${childrenYaml}
title: ${JSON.stringify(title)}
location: ${JSON.stringify(location)}
related_to: ${relatedYaml}
private: ${isPrivate}
---

${mdString.trim()}
`;

    const outPath = path.join(phasesDir, filename);
    fs.writeFileSync(outPath, frontmatter);
    console.log(`  wrote ${path.relative(path.join(__dirname, ".."), outPath)}`);

    console.log(`  flipping Notion status to 'In Review'...`);
    await notion.pages.update({
      page_id: page.id,
      properties: {
        Status: { status: { name: "In Review" } },
      },
    });
  }

  console.log("\nPhases sync complete!");
}

syncPhases().catch((err) => {
  console.error(err);
  process.exit(1);
});
