const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) { resolve(false); return; }
    const file = fs.createWriteStream(destPath);
    const mod = url.startsWith('https') ? https : http;
    const doRequest = (reqUrl) => {
      mod.get(reqUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          doRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };
    doRequest(url);
  });
}

// Extract image URLs from the XHS page
async function extractImagesFromPage(html) {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/);
  if (!match) return [];

  const raw = match[1].replace(/undefined/g, 'null');
  const data = JSON.parse(raw);

  // Navigate to note detail
  const noteMap = data?.note?.noteDetailMap;
  if (!noteMap) return [];

  const images = [];
  for (const [noteId, detail] of Object.entries(noteMap)) {
    const noteData = detail?.note;
    if (!noteData) continue;

    const imageList = noteData.imageList || [];
    for (const img of imageList) {
      const infoList = img.infoList || [];
      // Prefer original (WB_DFT), then preview
      let url = '';
      for (const info of infoList) {
        if (info.imageScene === 'WB_DFT') { url = info.url; break; }
      }
      if (!url && infoList.length > 0) url = infoList[0].url;
      if (url) {
        url = url.replace('http://', 'https://');
        // Remove size constraints to get original
        url = url.replace(/!nd_\w+/g, '');
        images.push(url);
      }
    }
  }
  return images;
}

// Fetch a XHS page with cookies
function fetchXHSPage(url, cookies) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cookie': cookies
      }
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetchXHSPage(res.headers.location, cookies).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Search XHS for emoji posts
async function searchEmojiPosts(cookies, keyword, page = 1) {
  // XHS search needs signed parameters, so we'll use the web page approach
  const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes&type=54&page=${page}`;
  const html = await fetchXHSPage(searchUrl, cookies);

  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/);
  if (!match) return [];

  const raw = match[1].replace(/undefined/g, 'null');
  try {
    const data = JSON.parse(raw);
    const feeds = data?.search?.feeds || [];
    return feeds.map(f => {
      const noteCard = f.noteCard || {};
      return {
        noteId: noteCard.noteId || noteCard.id,
        title: noteCard.title || '',
        xsecToken: noteCard.xsecToken || f.xsecToken || '',
      };
    }).filter(f => f.noteId);
  } catch (e) {
    console.log('Search parse error:', e.message);
    return [];
  }
}

async function main() {
  const Database = require('better-sqlite3');
  const db = new Database(path.join(__dirname, '..', 'data', 'emojis.db'));
  db.pragma('journal_mode = WAL');

  const cookies = process.argv[2] || '';
  if (!cookies) {
    console.log('Usage: node scrape-xhs.js "cookie_string"');
    console.log('Will use pre-fetched page at /tmp/xhs_page.html');
  }

  let allNew = [];
  let imgIndex = 0;

  // === Step 1: Download images from the original note ===
  console.log('=== Step 1: Downloading original note images ===');
  const pageHtml = fs.readFileSync('/tmp/xhs_page.html', 'utf-8');
  const noteImages = await extractImagesFromPage(pageHtml);
  console.log(`Found ${noteImages.length} images in the note`);

  for (const url of noteImages) {
    imgIndex++;
    const ext = url.includes('.webp') ? 'webp' : (url.includes('.png') ? 'png' : 'jpg');
    const localName = `xhs_${String(imgIndex).padStart(3, '0')}.${ext}`;
    const localPath = path.join(DEST, localName);

    try {
      await downloadFile(url, localPath);
      const stat = fs.statSync(localPath);
      if (stat.size < 1000) {
        fs.unlinkSync(localPath);
        console.log(`  x ${localName} too small (${stat.size}B), skipped`);
        continue;
      }
      allNew.push({
        filename: localName,
        name: `表情包 ${imgIndex}`,
        url: `/assets/emoji-defaults/${localName}`,
        category: 'funny'
      });
      console.log(`  + ${localName} (${(stat.size / 1024).toFixed(0)}KB)`);
    } catch (e) {
      console.log(`  x Failed: ${e.message}`);
    }
  }

  // === Step 2: Search for more emoji posts ===
  if (cookies) {
    console.log('\n=== Step 2: Searching for more emoji posts ===');
    const keywords = ['表情包', '搞笑表情包', '可爱表情包', '猫咪表情包', '打工表情包'];
    const visitedNotes = new Set(['694c9bc3000000000d00fb10']);

    for (const keyword of keywords) {
      if (allNew.length >= 250) break;
      console.log(`\nSearching: ${keyword}`);

      try {
        const posts = await searchEmojiPosts(cookies, keyword);
        console.log(`  Found ${posts.length} posts`);

        for (const post of posts) {
          if (allNew.length >= 250) break;
          if (visitedNotes.has(post.noteId)) continue;
          visitedNotes.add(post.noteId);

          const noteUrl = `https://www.xiaohongshu.com/explore/${post.noteId}?xsec_token=${post.xsecToken}&xsec_source=pc_search`;
          console.log(`  Fetching note: ${post.title.slice(0, 30)} (${post.noteId})`);

          try {
            const postHtml = await fetchXHSPage(noteUrl, cookies);
            const images = await extractImagesFromPage(postHtml);
            console.log(`    Found ${images.length} images`);

            for (const url of images) {
              if (allNew.length >= 250) break;
              imgIndex++;
              const ext = url.includes('.webp') ? 'webp' : (url.includes('.png') ? 'png' : 'jpg');
              const localName = `xhs_${String(imgIndex).padStart(3, '0')}.${ext}`;
              const localPath = path.join(DEST, localName);

              try {
                await downloadFile(url, localPath);
                const stat = fs.statSync(localPath);
                if (stat.size < 2000) {
                  fs.unlinkSync(localPath);
                  continue;
                }
                allNew.push({
                  filename: localName,
                  name: `表情包 ${imgIndex}`,
                  url: `/assets/emoji-defaults/${localName}`,
                  category: 'funny'
                });
                console.log(`    + ${localName} (${(stat.size / 1024).toFixed(0)}KB)`);
              } catch (e) {
                // skip
              }
            }
            await new Promise(r => setTimeout(r, 1500));
          } catch (e) {
            console.log(`    Failed: ${e.message.slice(0, 60)}`);
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.log(`  Search failed: ${e.message.slice(0, 60)}`);
      }
    }
  }

  console.log(`\nTotal downloaded: ${allNew.length} emojis`);

  // Insert into DB
  if (allNew.length > 0) {
    const maxRow = db.prepare('SELECT id FROM emojis ORDER BY id DESC LIMIT 1').get();
    let nextNum = maxRow ? parseInt(maxRow.id.replace('real_', ''), 10) + 1 : 1;

    const insert = db.prepare(
      `INSERT OR IGNORE INTO emojis (id, name, slug, image_url, source, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const e of allNew) {
      const id = `real_${String(nextNum).padStart(3, '0')}`;
      insert.run(id, e.name, `sticker-${nextNum}-${Date.now()}`, e.url, 'builtin', e.category, e.category);
      nextNum++;
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  console.log(`Total in DB: ${finalCount}`);

  const counts = {};
  for (const r of db.prepare('SELECT category_id, COUNT(*) as c FROM emojis GROUP BY category_id').all()) {
    counts[r.category_id] = r.c;
  }
  console.log('By category:', counts);
  db.close();
}

main().catch(console.error);
