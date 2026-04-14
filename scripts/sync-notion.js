const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const databaseId = process.env.NOTION_DATABASE_ID;

// Helper to download images from Notion
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(filepath, () => reject(err));
    });
  });
}

function toSlug(title) {
  return title.toLowerCase().replace(/[\s_]/g, '-').replace(/[^\w-]/g, '');
}

async function syncNotion() {
  if (!databaseId) {
    console.error("No NOTION_DATABASE_ID provided.");
    process.exit(1);
  }

  console.log("Querying Notion Database for 'Ready to Review' posts...");
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Status",
      status: {
        equals: "Ready to Review"
      }
    }
  });

  const pages = response.results;
  console.log(`Found ${pages.length} posts Ready to Review.`);

  for (const page of pages) {
    const title = page.properties.Title?.title[0]?.plain_text || "Untitled";
    const dateStr = page.properties["Publish Date"]?.date?.start || new Date().toISOString().split('T')[0];
    const author = page.properties.Author?.select?.name || "pan";
    const description = page.properties.Description?.rich_text[0]?.plain_text || "";
    const tags = page.properties.Tags?.multi_select?.map(tag => tag.name) || [];
    const wordCount = page.properties["Word Count"]?.number || 0;
    
    let featureImageUrl = "";
    if (page.properties["Feature Image"]?.files?.length > 0) {
      featureImageUrl = page.properties["Feature Image"].files[0].file.url;
    }

    let slug = page.properties.Slug?.rich_text[0]?.plain_text;
    if (!slug) {
      slug = toSlug(title) || page.id;
    }
    const postFilename = `${dateStr}-${slug}.md`;
    let frontmatterImage = "";

    // Download Feature Image if exists
    if (featureImageUrl) {
      console.log(`Downloading feature image for ${title}...`);
      const imagesDir = path.join(__dirname, "../images", dateStr.replace(/-/g, ''));
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      const imageFilename = `cover-${slug}.jpg`;
      const localImagePath = path.join(imagesDir, imageFilename);
      await downloadImage(featureImageUrl, localImagePath);
      frontmatterImage = `/images/${dateStr.replace(/-/g, '')}/${imageFilename}`;
    }

    console.log(`Converting ${title} to Markdown...`);
    const mdblocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdblocks);

    // Build Jekyll Front Matter
    const frontmatter = `---
layout: post
title: "${title}"
date: ${dateStr}
author: "${author}"
description: "${description}"
tags: [${tags.join(', ')}]
feature_image: "${frontmatterImage}"
word_count: ${wordCount}
---

${mdString.parent}
`;

    // Save to _posts directory
    const postPath = path.join(__dirname, "../_posts", postFilename);
    fs.writeFileSync(postPath, frontmatter);
    console.log(`Created post at: ${postPath}`);

    // Update Notion Status to 'In Review' so we don't fetch it again
    console.log(`Updating Notion status for ${title} to 'In Review'...`);
    await notion.pages.update({
      page_id: page.id,
      properties: {
        Status: {
          status: {
            name: "In Review"
          }
        }
      }
    });
  }

  console.log("Notion sync complete!");
}

syncNotion().catch(console.error);
