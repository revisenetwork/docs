const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// CONFIGURATION
const BLOG_DIR = 'blog';
const CATEGORY_BASE_DIR = 'categories';
const MAIN_INDEX_FILE = 'index.mdx';

// Helper: Clean Category Name (e.g., "Security & Safety" -> "security-and-safety")
function getCleanCategory(category) {
  if (!category) return 'uncategorized';
  return category.toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Helper: Generate Card HTML
function generateCard(post, icon = "newspaper") {
  return `<Card title="${post.title}" icon="${icon}" href="${post.url}">
  ${post.description}
</Card>`;
}

// Helper: Generate Featured Card HTML (Larger/Different)
function generateFeaturedCard(post) {
  return `<Card title="${post.title}" icon="star" href="${post.url}" size="large">
  <img src="${post.image}" alt="${post.title}" />
  ${post.description}
</Card>`;
}

// 1. MOVE NEW FILES
function moveNewFiles() {
  if (!fs.existsSync(BLOG_DIR)) return;
  const files = fs.readdirSync(BLOG_DIR);

  files.forEach(file => {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) return;

    const sourcePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const parsed = matter(content);

    const category = parsed.data.category || 'uncategorized';
    const cleanCategory = getCleanCategory(category);
    const targetDir = path.join(CATEGORY_BASE_DIR, cleanCategory);

    // Create Category Folder
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Create Category Index if missing
    const catIndex = path.join(targetDir, 'index.mdx');
    if (!fs.existsSync(catIndex)) {
      const initialContent = `---
title: "${category}"
---

# ${category}

## All Articles
`;
      fs.writeFileSync(catIndex, initialContent);
    }

    // Move File
    const targetPath = path.join(targetDir, file);
    fs.renameSync(sourcePath, targetPath);
    console.log(`Moved ${file} to ${targetDir}`);
  });
}

// 2. GATHER ALL POSTS
function getAllPosts() {
  let allPosts = [];
  if (!fs.existsSync(CATEGORY_BASE_DIR)) return [];

  const categories = fs.readdirSync(CATEGORY_BASE_DIR);

  categories.forEach(cat => {
    const catDir = path.join(CATEGORY_BASE_DIR, cat);
    if (!fs.statSync(catDir).isDirectory()) return;

    const files = fs.readdirSync(catDir);
    files.forEach(file => {
      if ((!file.endsWith('.mdx') && !file.endsWith('.md')) || file === 'index.mdx') return;

      const fullPath = path.join(catDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const parsed = matter(content);

      const url = `${CATEGORY_BASE_DIR}/${cat}/${path.parse(file).name}`;

      allPosts.push({
        title: parsed.data.title,
        date: new Date(parsed.data.date || 0),
        image: parsed.data.image,
        description: parsed.data.description || '',
        categorySlug: cat,
        url: url
      });
    });
  });

  // Sort Descending (Newest First)
  return allPosts.sort((a, b) => b.date - a.date);
}

// 3. UPDATE MAIN INDEX
function updateMainIndex(allPosts) {
  if (allPosts.length === 0) return;

  const featured = allPosts[0]; // Newest is featured
  const latest = allPosts.slice(1); // Rest are latest

  let indexContent = fs.readFileSync(MAIN_INDEX_FILE, 'utf8');

  // Replace Featured
  const featuredHTML = generateFeaturedCard(featured);
  // Regex looks for "## Featured" and replaces everything until the next "##" or end of file
  indexContent = indexContent.replace(
    /(## Featured\n)([\s\S]*?)(?=\n##|$)/, 
    `$1\n${featuredHTML}\n`
  );

  // Replace Latest
  let latestHTML = '<CardGroup cols={2}>\n';
  latest.forEach(post => latestHTML += `  ${generateCard(post)}\n`);
  latestHTML += '</CardGroup>';

  indexContent = indexContent.replace(
    /(## Latest\n)([\s\S]*?)(?=\n##|$)/, 
    `$1\n${latestHTML}\n`
  );

  fs.writeFileSync(MAIN_INDEX_FILE, indexContent);
  console.log('Updated Main Index');
}

// 4. UPDATE CATEGORY INDEXES
function updateCategoryIndexes(allPosts) {
  // Group posts by category slug
  const postsByCat = {};
  allPosts.forEach(post => {
    if (!postsByCat[post.categorySlug]) postsByCat[post.categorySlug] = [];
    postsByCat[post.categorySlug].push(post);
  });

  Object.keys(postsByCat).forEach(catSlug => {
    const catIndexPath = path.join(CATEGORY_BASE_DIR, catSlug, 'index.mdx');
    if (!fs.existsSync(catIndexPath)) return;

    let catContent = fs.readFileSync(catIndexPath, 'utf8');
    const posts = postsByCat[catSlug]; // Already sorted by date

    let listHTML = '<CardGroup cols={1}>\n';
    posts.forEach(post => listHTML += `  ${generateCard(post)}\n`);
    listHTML += '</CardGroup>';

    // Update under "## All Articles"
    // Using markers for safety in category files, or fallback to header regex
    if (catContent.includes('')) {
        catContent = catContent.replace(
            /()([\s\S]*?)()/,
            `$1\n${listHTML}\n$3`
        );
    } else {
        // Fallback: Just look for ## All Articles
        catContent = catContent.replace(
            /(## All Articles\n)([\s\S]*?)(?=\n##|$)/,
            `$1\n${listHTML}\n`
        );
    }

    fs.writeFileSync(catIndexPath, catContent);
    console.log(`Updated Category Index: ${catSlug}`);
  });
}

// EXECUTE
moveNewFiles();
const posts = getAllPosts();
updateMainIndex(posts);
updateCategoryIndexes(posts);
