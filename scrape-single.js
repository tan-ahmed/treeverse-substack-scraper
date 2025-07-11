// scrape-single.js
import puppeteer from "puppeteer";
import { createRequire } from "node:module";
import fs from "fs-extra";
import path from "path";
import slugify from "slugify";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const cheerio = require("cheerio");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const link = process.argv[2];
const titleArg = process.argv[3];

if (!link || !titleArg) {
  console.error('❌ Usage: pnpm run scrape:single <URL> "Post Title"');
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // debug
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto(link, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector(".available-content", { timeout: 10000 });
  } catch (err) {
    console.warn(`⚠️  available-content not found for: ${titleArg}`);
  }

  const html = await page.content();
  const $ = cheerio.load(html);

  let date = $("time").attr("datetime") || "";
  if (!date) {
    const dateDiv = $('[aria-label="Post UFI"]')
      .find("div")
      .filter((_, el) => {
        return $(el)
          .text()
          .match(/[A-Za-z]{3,} \d{1,2}, \d{4}/);
      })
      .first();
    date = dateDiv.text().trim();
  }

  let content =
    $(".available-content").html()?.trim() ||
    $(".post-content").html()?.trim() ||
    $("article").html()?.trim() ||
    "";

  const postData = {
    title: titleArg,
    link,
    date,
    content,
  };

  const dataDir = path.join(__dirname, "data", "p");
  fs.ensureDirSync(dataDir);

  const slug = slugify(titleArg, { lower: true, strict: true });
  const filePath = path.join(dataDir, `${slug}.json`);
  fs.writeJsonSync(filePath, postData, { spaces: 2 });

  console.log(`✅ Saved single post to ${filePath}`);
  await browser.close();
})();
