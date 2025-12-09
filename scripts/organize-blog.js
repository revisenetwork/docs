const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// CONFIGURATION
const BLOG_DIR = 'blog';
// CHANGED: Folder name is now plural 'categories'
const CATEGORY_BASE_DIR = 'categories'; 
const INDEX_FILE = 'index.mdx';

// Helper to match your folder naming convention (kebab-case)
function getCleanCategory(category) {
  if (!category) return 'uncategorized';
  // Converts "Code Intelligence" -> "code-intelligence"
  return category.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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

    // 2. Create Directory if not exists (matches your specific folder list)
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
  let allPosts = [];
  
  if (fs.existsSync(CATEGORY_BASE_DIR)) {
    // Reads all folders: architecture, code-intelligence, etc.
    const categories = fs.readdirSync(CATEGORY_BASE_DIR);
    
    categories.forEach(cat => {
      const catDir = path.join(CATEGORY_BASE_DIR, cat);
      // Ensure we only look at directories (ignores .DS_Store, etc.)
      if (fs.statSync(catDir).isDirectory()) {
        const files = fs.readdirSync(catDir);
        files.forEach(file => {
          if (!file.endsWith('.mdx') && !file.endsWith('.md')) return;
          
          const fullPath = path.join(catDir, file);
          const content = fs.readFileSync(fullPath, 'utf8');
          const parsed = matter(content);
          
          // Construct URL: categories/code-intelligence/my-post
          const url = `${CATEGORY_BASE_DIR}/${cat}/${path.parse(file).name}`;
          
          allPosts.push({
            title: parsed.data.title,
            date: new Date(parsed.data.date || 0),
            image: parsed.data.image,
            description: parsed.data.description || '',
            url: url
          });
        });
      }
    });
  }

  // Sort by Date Descending
  allPosts.sort((a, b) => b.date - a.date);

  if (allPosts.length === 0) return;

  const featured = allPosts[0];
  const latest = allPosts.slice(1, 6); 

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

  // Inject into index.mdx
  let indexContent = fs.readFileSync(INDEX_FILE, 'utf8');

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

moveNewFiles();
updateIndex();
