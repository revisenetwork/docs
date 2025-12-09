const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // You will install this in the Action

// CONFIGURATION
const BLOG_DIR = 'blog';
const CATEGORY_BASE_DIR = 'category';
const INDEX_FILE = 'index.mdx';

function getCleanCategory(category) {
  if (!category) return 'uncategorized';
  return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function moveNewFiles() {
  if (!fs.existsSync(BLOG_DIR)) return;

  const files = fs.readdirSync(BLOG_DIR);

  files.forEach(file => {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) return;

    const sourcePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const parsed = matter(content);

    // 1. Determine Category
    const category = parsed.data.category || 'uncategorized';
    const cleanCategory = getCleanCategory(category);
    const targetDir = path.join(CATEGORY_BASE_DIR, cleanCategory);

    // 2. Create Directory if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 3. Move File
    const targetPath = path.join(targetDir, file);
    fs.renameSync(sourcePath, targetPath);
    console.log(`Moved ${file} to ${targetDir}`);
  });
}

function updateIndex() {
  // 1. Scan all files in category folders
  let allPosts = [];
  
  if (fs.existsSync(CATEGORY_BASE_DIR)) {
    const categories = fs.readdirSync(CATEGORY_BASE_DIR);
    
    categories.forEach(cat => {
      const catDir = path.join(CATEGORY_BASE_DIR, cat);
      if (fs.statSync(catDir).isDirectory()) {
        const files = fs.readdirSync(catDir);
        files.forEach(file => {
          if (!file.endsWith('.mdx') && !file.endsWith('.md')) return;
          
          const fullPath = path.join(catDir, file);
          const content = fs.readFileSync(fullPath, 'utf8');
          const parsed = matter(content);
          
          // Construct the URL (Mintlify style usually relies on file path)
          const url = `${cat}/${path.parse(file).name}`;
          
          allPosts.push({
            title: parsed.data.title,
            date: new Date(parsed.data.date || 0), // Default to epoch if no date
            image: parsed.data.image,
            description: parsed.data.description || '',
            url: url
          });
        });
      }
    });
  }

  // 2. Sort by Date Descending
  allPosts.sort((a, b) => b.date - a.date);

  if (allPosts.length === 0) return;

  // 3. Generate Content
  const featured = allPosts[0];
  const latest = allPosts.slice(1, 6); // Items 2,3,4,5,6

  // Featured HTML/MDX
  const featuredContent = `
<Card
  title="${featured.title}"
  icon="star"
  href="${featured.url}"
>
  <img src="${featured.image}" alt="Featured" />
  ${featured.description}
</Card>
`;

  // Latest List HTML/MDX
  let latestContent = '<CardGroup cols={2}>\n';
  latest.forEach(post => {
    latestContent += `  <Card title="${post.title}" href="${post.url}" icon="newspaper">\n    ${post.description}\n  </Card>\n`;
  });
  latestContent += '</CardGroup>';

  // 4. Inject into index.mdx
  let indexContent = fs.readFileSync(INDEX_FILE, 'utf8');

  // Regex to replace content between markers
  indexContent = indexContent.replace(
    /()([\s\S]*?)()/,
    `$1\n${featuredContent}\n$3`
  );

  indexContent = indexContent.replace(
    /()([\s\S]*?)()/,
    `$1\n${latestContent}\n$3`
  );

  fs.writeFileSync(INDEX_FILE, indexContent);
  console.log('Updated index.mdx');
}

// EXECUTE
moveNewFiles();
updateIndex();
