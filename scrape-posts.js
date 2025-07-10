// scrape-posts.js
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs-extra";
import path from "path";
import slugify from "slugify";

const __dirname = path.resolve();

(async () => {
  const archivePath = path.join(__dirname, "data", "archive.json");
  if (!fs.existsSync(archivePath)) {
    console.error("❌ archive.json not found. Run scrape-archive.js first.");
    process.exit(1);
  }

  const archive = fs.readJsonSync(archivePath);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  const dataDir = path.join(__dirname, "data", "p");
  fs.ensureDirSync(dataDir);

  for (const post of archive) {
    console.log(`Scraping: ${post.title}`);
    const page = await browser.newPage();
    await page.goto(post.link, { waitUntil: "networkidle2" });

    const html = await page.content();
    const $ = cheerio.load(html);

    // ✅ Better DATE fallback
    let date = $("time").attr("datetime") || "";
    if (!date) {
      const dateDiv = $('[aria-label="Post UFI"]')
        .find("div")
        .filter((_, el) =>
          $(el)
            .text()
            .match(/[A-Za-z]{3,} \d{1,2}, \d{4}/)
        )
        .first();
      date = dateDiv.text().trim() || "";
    }

    // ✅ More robust CONTENT fallback:
    let content = $("article").html()?.trim() || "";

    if (!content) {
      // Try known container classes as fallback
      const fallbackSelectors = [
        ".single-post-container",
        ".single-post",
        "main",
        "[role='main']",
      ];

      for (const selector of fallbackSelectors) {
        const alt = $(selector).html();
        if (alt && alt.trim().length > 0) {
          content = alt.trim();
          break;
        }
      }
    }

    // Clean up
    content = content.replace(/\s+/g, " ").trim();

    const postData = {
      title: post.title,
      link: post.link,
      date: date.trim(),
      content,
    };

    const slug = slugify(post.title, { lower: true, strict: true });
    const filePath = path.join(dataDir, `${slug}.json`);
    fs.writeJsonSync(filePath, postData, { spaces: 2 });

    await page.close();
  }

  console.log(`🎉 All individual posts saved to ${dataDir}`);
  await browser.close();
})();
