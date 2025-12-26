#!/usr/bin/env node

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();

const CATEGORY_MAP = {
  "Architecture": "architecture",
  "Code Intelligence": "code-intelligence",
  "Runtime Signals": "runtime-signals",
  "LLM Reasoning": "llm-reasoning",
  "Debugging Cases": "debugging-cases",
  "Engineering Lessons": "engineering-lessons",
  "Security & Safety": "security-and-safety",
  "Future of Debugging": "future-of-debugging"
};

const DEFAULT_ICON = "file-text";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function getRootMdxFiles() {
  return fs.readdirSync(ROOT).filter(f =>
    f.endsWith(".mdx") &&
    f !== "index.mdx" &&
    !f.startsWith("categories")
  );
}

function findStarCard(content) {
  const regex = /<Card[\s\S]*?icon="star"[\s\S]*?<\/Card>/g;
  const matches = content.match(regex) || [];
  if (matches.length !== 1) {
    fail(`Expected exactly one icon="star" card, found ${matches.length}`);
  }
  return matches[0];
}

function main() {
  const files = getRootMdxFiles();
  if (files.length === 0) {
    console.log("ℹ️ No new root-level MDX files found.");
    return;
  }

  files.forEach(file => {
    const filePath = path.join(ROOT, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);

    const { title, description, category, icon, image } = data;

    if (!title || !description || !category) {
      fail(`${file} missing required frontmatter`);
    }

    const slug = CATEGORY_MAP[category];
    if (!slug) {
      fail(`Invalid category "${category}" in ${file}`);
    }

    const targetDir = path.join(ROOT, "categories", slug);
    const targetPath = path.join(targetDir, file);

    if (!fs.existsSync(targetDir)) {
      fail(`Missing category directory: ${targetDir}`);
    }

    if (fs.existsSync(targetPath)) {
      fail(`Target file already exists: ${targetPath}`);
    }

    // Move file
    fs.renameSync(filePath, targetPath);

    // Update category index
    const categoryIndex = path.join(targetDir, "index.mdx");
    let indexContent = fs.readFileSync(categoryIndex, "utf8");

    const href = `/categories/${slug}/${file.replace(".mdx", "")}`;

    if (!indexContent.includes(href)) {
      const anchor = "<CardGroup cols={1}>";
      if (!indexContent.includes(anchor)) {
        fail(`Missing CardGroup anchor in ${categoryIndex}`);
      }

      const card = `
<Card
  title="${title}"
  icon="${icon || DEFAULT_ICON}"
  href="${href}"
>
  ${description}
</Card>
`;

      indexContent = indexContent.replace(anchor, `${anchor}\n${card}`);
      fs.writeFileSync(categoryIndex, indexContent);
    }

    // Update root index
    const rootIndexPath = path.join(ROOT, "index.mdx");
    let rootIndex = fs.readFileSync(rootIndexPath, "utf8");

    const starCard = findStarCard(rootIndex);

    const newStarCard = `<Card
  title="${title}"
  icon="star"
  href="${href}"
  img="${image || ""}"
  cta="Read more"
>
  ${description}
</Card>`;

    rootIndex = rootIndex.replace(starCard, newStarCard);
    fs.writeFileSync(rootIndexPath, rootIndex);

    console.log(`✅ Processed ${file}`);
  });
}

main();
