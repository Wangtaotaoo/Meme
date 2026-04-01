const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.github.com/repos/zhaoolee/ChineseBQB/contents';
const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// Category mapping: folder keyword -> our category
const CATEGORY_MAP = {
  'Funny': 'funny',
  'CuteGirl': 'cute',
  'CuteBoy': 'cute',
  'SmirkBoy': 'funny',
  'ShowerheadBoy': 'funny',
  'Hamster': 'cute',
  'Tiger': 'funny',
  'HappyDuck': 'cute',
  'KumamotoBear': 'cute',
  'Cat': 'cute',
  'Dog': 'cute',
  'Parrot': 'cute',
  'PigPecs': 'funny',
  'Pig_': 'cute',
  'Programmer': 'work',
  'TATAN': 'funny',
  'Squirtle': 'cute',
  'Pikachu': 'cute',
  'Doraemon': 'cute',
  'SpongeBob': 'funny',
  'TomAndJerry': 'funny',
  'WhiteVillain': 'funny',
  'Altman': 'funny',
  'MatchstickMen': 'funny',
  'CatEveryday': 'cute',
  'CatEyes': 'cute',
  'MurCat': 'funny',
  'AllHeart': 'cute',
  'Eat_': 'funny',
  'University': 'work',
  'Call_': 'work',
  'FamousPerson': 'funny',
  'Hanazawa': 'funny',
  'ChenguoCui': 'funny',
  'HanZhang': 'funny',
  'YaoMing': 'funny',
  'YouLe': 'funny',
  'ShowSword': 'funny',
  'XunLu': 'funny',
  'Jacky_': 'funny',
  'mabaoguo': 'funny',
  'GuiMie': 'funny',
  'WuGang': 'funny',
  'AttackOnTitan': 'funny',
  'TeaBoy': 'funny',
  'SailorMoon': 'cute',
  'LuoXiang': 'funny',
  'LiAn': 'funny',
  'TeacherWang': 'funny',
  'KeNan': 'funny',
  'CaiXvKun': 'funny',
  'Trump': 'funny',
  'TuHi': 'funny',
  'Wuliuqi': 'funny',
  'Wangbingbing': 'cute',
  'Yangchaoyue': 'cute',
  'JensenHuang': 'work',
  'BlackMythWuKong': 'funny',
  'Frieren': 'cute',
  'FLittleBrother': 'funny',
  'ChainsawMan': 'funny',
  'Friends_': 'funny',
  'EmpressesInThePalace': 'funny',
  'spyxfamily': 'cute',
  'GenShin': 'cute',
  'LetTheBulletsFly': 'funny',
  'NegroCarryingACoffin': 'funny',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) resolve(parsed);
          else reject(new Error(parsed.message || 'Not an array'));
        } catch (e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const doRequest = (reqUrl) => {
      https.get(reqUrl, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          doRequest(res.headers.location);
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };
    doRequest(url);
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^\w\u4e00-\u9fff.\-]/g, '_');
}

function getCategoryForFolder(folderName) {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (folderName.includes(keyword)) return cat;
  }
  return 'funny';
}

async function main() {
  // Clean up
  const dbPath = path.join(__dirname, '..', 'data', 'emojis.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  // Clean existing images
  if (fs.existsSync(DEST)) {
    for (const f of fs.readdirSync(DEST)) {
      fs.unlinkSync(path.join(DEST, f));
    }
  }

  // Get top-level listing
  console.log('Fetching repository listing...');
  const topDirs = await fetchJSON(BASE);
  const bqbDirs = topDirs.filter(d => d.type === 'dir' && /^\d{3}/.test(d.name));
  console.log(`Found ${bqbDirs.length} sticker pack folders`);

  const TARGET = 250;
  const allEmojis = [];
  const PER_FOLDER = 5; // download 5 per folder to spread variety

  for (const dir of bqbDirs) {
    if (allEmojis.length >= TARGET) break;

    try {
      const items = await fetchJSON(`${BASE}/${dir.name}`);
      const files = items.filter(i =>
        i.type === 'file' &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(i.name) &&
        i.size > 1000 &&
        i.size < 800000
      );

      const needed = Math.min(PER_FOLDER, TARGET - allEmojis.length);
      const selected = files.slice(0, needed);
      if (selected.length === 0) continue;

      const category = getCategoryForFolder(dir.name);
      console.log(`  [${allEmojis.length}/${TARGET}] ${dir.name} -> ${selected.length} images`);

      for (const item of selected) {
        const localName = sanitizeFilename(item.name);
        const localPath = path.join(DEST, localName);

        // Skip if file with same name already exists (from another folder)
        if (fs.existsSync(localPath)) continue;

        try {
          await downloadFile(item.download_url, localPath);
          const name = path.basename(item.name, path.extname(item.name))
            .replace(/^\d+[-_]?/, '')
            .replace(/[-_]/g, ' ')
            .slice(0, 30)
            .trim();

          allEmojis.push({
            filename: localName,
            name: name || localName,
            url: `/assets/emoji-defaults/${localName}`,
            category,
          });
        } catch (err) {
          console.error(`    Failed: ${item.name} - ${err.message}`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      // Skip folders that fail (rate limit, not found, etc.)
      console.log(`  Skipped ${dir.name}: ${err.message}`);
    }
  }

  console.log(`\nTotal downloaded: ${allEmojis.length} emojis`);

  // Init database and seed
  const { initDb } = require('../server/db/init');
  const { getDb } = require('../server/db/connection');

  initDb();
  const db = getDb();

  const categories = [
    { id: 'all', name: '全部', icon: 'grid', sort_order: -10 },
    { id: 'favorites', name: '收藏', icon: 'star', sort_order: -9 },
    { id: 'recent', name: '最近', icon: 'clock', sort_order: -8 },
    { id: 'funny', name: '搞笑', icon: 'laugh', sort_order: 1 },
    { id: 'cute', name: '可爱', icon: 'heart', sort_order: 2 },
    { id: 'work', name: '工作', icon: 'briefcase', sort_order: 3 },
    { id: 'custom', name: '自定义', icon: 'plus-circle', sort_order: 4 },
  ];

  const insertCat = db.prepare(
    `INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)`
  );
  for (const cat of categories) insertCat.run(cat.id, cat.name, cat.icon, cat.sort_order);

  const insertEmoji = db.prepare(
    `INSERT OR IGNORE INTO emojis (id, name, slug, image_url, source, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < allEmojis.length; i++) {
    const e = allEmojis[i];
    const id = `real_${String(i + 1).padStart(3, '0')}`;
    const slug = `sticker-${i + 1}-${Date.now()}`;
    insertEmoji.run(id, e.name, slug, e.url, 'builtin', e.category, e.category);
  }

  console.log(`Seeded ${allEmojis.length} emojis into database.`);

  // Count by category
  const counts = {};
  for (const e of allEmojis) {
    counts[e.category] = (counts[e.category] || 0) + 1;
  }
  console.log('By category:', counts);
}

main().catch(console.error);
