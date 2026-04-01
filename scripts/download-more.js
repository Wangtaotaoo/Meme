const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.github.com/repos/zhaoolee/ChineseBQB/contents';
const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');
const RAW = 'https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master';

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const CATEGORY_MAP = {
  'Funny': 'funny', 'CuteGirl': 'cute', 'CuteBoy': 'cute',
  'SmirkBoy': 'funny', 'Hamster': 'cute', 'HappyDuck': 'cute',
  'Cat': 'cute', 'Dog': 'cute', 'Parrot': 'cute',
  'PigPecs': 'funny', 'Pig_': 'cute', 'Programmer': 'work',
  'TATAN': 'funny', 'SpongeBob': 'funny', 'TomAndJerry': 'funny',
  'WhiteVillain': 'funny', 'Pikachu': 'cute', 'Doraemon': 'cute',
  'Squirtle': 'cute', 'Altman': 'funny', 'MatchstickMen': 'funny',
  'CatEveryday': 'cute', 'CatEyes': 'cute', 'MurCat': 'funny',
  'AllHeart': 'cute', 'Eat_': 'funny', 'University': 'work',
  'Call_': 'work', 'FamousPerson': 'funny', 'Hanazawa': 'funny',
  'ChenguoCui': 'funny', 'HanZhang': 'funny', 'YaoMing': 'funny',
  'YouLe': 'funny', 'XunLu': 'funny', 'Jacky_': 'funny',
  'mabaoguo': 'funny', 'GuiMie': 'funny', 'WuGang': 'funny',
  'AttackOnTitan': 'funny', 'TeaBoy': 'funny', 'SailorMoon': 'cute',
  'LuoXiang': 'funny', 'TeacherWang': 'funny', 'KeNan': 'funny',
  'CaiXvKun': 'funny', 'Trump': 'funny', 'Wuliuqi': 'funny',
  'Wangbingbing': 'cute', 'Yangchaoyue': 'cute', 'JensenHuang': 'work',
  'BlackMythWuKong': 'funny', 'Frieren': 'cute', 'ChainsawMan': 'funny',
  'spyxfamily': 'cute', 'GenShin': 'cute', 'LetTheBulletsFly': 'funny',
  'NegroCarryingACoffin': 'funny', 'TravelFrog': 'cute',
  'ChineseNewYear': 'funny', 'YuanLongping': 'funny',
  'EmpressesInThePalace': 'funny', 'ShowSword': 'funny',
};

function getCategoryForFolder(folderName) {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (folderName.includes(keyword)) return cat;
  }
  return 'funny';
}

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
    if (fs.existsSync(destPath)) { resolve(false); return; }
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

  // Get top-level listing
  console.log('Fetching repository listing...');
  const topDirs = await fetchJSON(BASE);
  const bqbDirs = topDirs.filter(d => d.type === 'dir' && /^\d{3}/.test(d.name));
  console.log(`Found ${bqbDirs.length} sticker pack folders`);

  const allNew = [];
  const PER_FOLDER = 8; // more per folder since we have fewer folders to visit

  for (const dir of bqbDirs) {
    if (allNew.length >= needed) break;

    try {
      const items = await fetchJSON(`${BASE}/${dir.name}`);
      const files = items.filter(i =>
        i.type === 'file' &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(i.name) &&
        i.size > 1000 &&
        i.size < 800000
      );

      if (files.length === 0) continue;

      const category = getCategoryForFolder(dir.name);

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
          console.log(`  + [${allNew.length}/${needed}] ${item.name} (${category})`);
        } catch (err) {
          // skip
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  Skipped ${dir.name}: ${err.message.slice(0, 60)}`);
    }
  }

  console.log(`\nDownloaded ${allNew.length} new emojis`);

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
