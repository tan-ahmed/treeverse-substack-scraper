// scrape-archive.js
import puppeteer from "puppeteer";
import { createRequire } from "node:module";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const cheerio = require("cheerio");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  const archiveUrl = "https://endlessclouds.substack.com/archive";
  await page.goto(archiveUrl, { waitUntil: "networkidle2" });

  console.log("Scrolling to load all posts...");
  let previousHeight;
  while (true) {
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((res) => setTimeout(res, 1500));
    const newHeight = await page.evaluate("document.body.scrollHeight");
    if (newHeight === previousHeight) break;
  }
  console.log("✅ Finished scrolling");

  const content = await page.content();
  const $ = cheerio.load(content);

  const posts = [];
  $(".container-Qnseki").each((_, el) => {
    const title = $(el)
      .find('[data-testid="post-preview-title"]')
      .text()
      .trim();
    const link = $(el).find('[data-testid="post-preview-title"]').attr("href");
    const description = $(el)
      .find('a:not([data-testid="post-preview-title"])')
      .text()
      .trim();
    const date = $(el).find("time").attr("datetime") || "";
    const image = $(el).find("img").attr("src") || "";
    posts.push({
      title,
      link: link.startsWith("http")
        ? link
        : `https://endlessclouds.substack.com${link}`,
      description,
      date,
      image,
    });
  });

  const dataDir = path.join(__dirname, "data");
  fs.ensureDirSync(dataDir);
  const filePath = path.join(dataDir, "archive.json");
  fs.writeJsonSync(filePath, posts, { spaces: 2 });

  console.log(`🎉 Saved ${posts.length} posts to ${filePath}`);

  await browser.close();
})();
