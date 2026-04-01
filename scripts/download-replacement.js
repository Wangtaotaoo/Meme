const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.github.com/repos/zhaoolee/ChineseBQB/contents';
const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// Higher quality folders with popular stickers - targeting specific ones
const PRIORITY_FOLDERS = [
  // Popular meme characters
  '048SpongeBob_海绵宝宝BQB',
  '049CatEveryday_猫咪日常BQB',
  '052Squirtle_杰尼龟BQB',
  '056Doraemon_哆啦A梦BQB',
  '060MurCat_Mur猫😺BQB',
  '065TravelFrog_旅行青蛙🐸BQB',
  '071辉夜大小姐🎀BQB',
  '076Moe可爱萝莉_BQB',
  '079mabaoguo_马保国_BQB',
  '080GuiMie_鬼灭之刃_BQB',
  '082AttackOnTitan_进击的巨人_BQB',
  '084Wuliuqi_刺客伍六七_BQB',
  '090SailorMoon_美少女战士_BQB',
  '091LetTheBulletsFly_让子弹飞_BQB',
  '092LuoXiang_罗翔_BQB',
  '098spyxfamily_间谍过家家_BQB',
  '105_BlackMythWuKong_黑神话悟空🐒BQB',
  '106_Frieren_芙莉莲🪄BQB',
];

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

function sanitizeFilename(name) {
  return name.replace(/[^\w\u4e00-\u9fff.\-]/g, '_');
}

async function main() {
  const Database = require('better-sqlite3');
  const db = new Database(path.join(__dirname, '..', 'data', 'emojis.db'));
  db.pragma('journal_mode = WAL');

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  const needed = 250 - currentCount;
  console.log(`Current: ${currentCount}, Need: ${needed} more`);

  if (needed <= 0) {
    console.log('Already at 250!');
    db.close();
    return;
  }

  // Also clean up broken files on disk
  const brokenFiles = [
    '043Altman_018.webp', '046WhatToWear_00000017.gif',
    '043Altman_00000019.gif', '051Call_00000008.jpg',
    '罗永浩00004-苟利国家生死以嘛.gif',
    '是喵星人啦00003-公主你的士兵报道猫.jpg',
    '是喵星人啦00005-我一脚丫子踹死你猫.jpg',
    '名人明星00003-你要是唠这个我可不困了啊.gif'
  ];
  for (const f of brokenFiles) {
    const p = path.join(DEST, f);
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log('Removed broken:', f); }
  }

  const CATEGORY_MAP = {
    'SpongeBob': 'funny', 'CatEveryday': 'cute', 'Squirtle': 'cute',
    'Doraemon': 'cute', 'MurCat': 'funny', 'TravelFrog': 'cute',
    '辉夜': 'cute', 'Moe': 'cute', 'mabaoguo': 'funny',
    'GuiMie': 'funny', 'AttackOnTitan': 'funny', 'Wuliuqi': 'funny',
    'SailorMoon': 'cute', 'LetTheBulletsFly': 'funny',
    'LuoXiang': 'funny', 'spyxfamily': 'cute',
    'BlackMythWuKong': 'funny', 'Frieren': 'cute',
  };

  function getCategory(folder) {
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
      if (folder.includes(kw)) return cat;
    }
    return 'funny';
  }

  const allNew = [];

  for (const folder of PRIORITY_FOLDERS) {
    if (allNew.length >= needed) break;

    console.log(`\n[${allNew.length}/${needed}] Fetching ${folder}...`);

    try {
      const items = await fetchJSON(`${BASE}/${folder}`);
      // Prefer GIF > PNG > JPG, and larger files (higher quality)
      const files = items.filter(i =>
        i.type === 'file' &&
        /\.(gif|png|jpg|jpeg|webp)$/i.test(i.name) &&
        i.size > 5000 &&  // at least 5KB
        i.size < 800000
      ).sort((a, b) => {
        // Prefer GIF
        const aGif = a.name.endsWith('.gif') ? 1 : 0;
        const bGif = b.name.endsWith('.gif') ? 1 : 0;
        if (aGif !== bGif) return bGif - aGif;
        // Then by size (larger = higher quality)
        return b.size - a.size;
      });

      const category = getCategory(folder);
      let count = 0;

      for (const item of files) {
        if (allNew.length >= needed) break;
        const localName = sanitizeFilename(item.name);
        const localPath = path.join(DEST, localName);

        if (fs.existsSync(localPath)) continue;

        try {
          await downloadFile(item.download_url, localPath);
          const name = path.basename(item.name, path.extname(item.name))
            .replace(/^\d+[-_]?/, '')
            .replace(/[-_]/g, ' ')
            .slice(0, 30)
            .trim();

          allNew.push({
            filename: localName,
            name: name || localName,
            url: `/assets/emoji-defaults/${localName}`,
            category,
          });
          count++;
          console.log(`  + ${item.name} (${(item.size / 1024).toFixed(0)}KB) -> ${category}`);
        } catch (err) {
          // skip
        }
      }

      if (count === 0) console.log('  (all already exist or no suitable files)');

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  Failed: ${err.message.slice(0, 80)}`);
    }
  }

  console.log(`\nDownloaded ${allNew.length} new high-quality emojis`);

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
