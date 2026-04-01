const https = require('https');
const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');
const RAW_BASE = 'https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master';
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) { resolve(false); return; }
    const file = fs.createWriteStream(destPath);
    const doReq = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) { doReq(res.headers.location); return; }
        if (res.statusCode !== 200) { fs.unlink(destPath, () => {}); reject(new Error(`HTTP ${res.statusCode}`)); return; }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      }).on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
    };
    doReq(url);
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^\w\u4e00-\u9fff.\-]/g, '_');
}

// Scrape file list from GitHub folder page (no API needed)
function scrapeFileList(folder) {
  return new Promise((resolve, reject) => {
    const url = `https://github.com/zhaoolee/ChineseBQB/tree/master/${encodeURIComponent(folder)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        // Extract image filenames from the HTML response
        const regex = /"name":"([^"]+\.(?:gif|jpg|jpeg|png|webp))"/gi;
        const files = [];
        let m;
        while ((m = regex.exec(data)) !== null) {
          if (!m[1].includes('README')) files.push(m[1]);
        }
        // Deduplicate
        resolve([...new Set(files)]);
      });
    }).on('error', reject);
  });
}

const FOLDERS = [
  ['037XunLu_鲁迅BQB', 'funny'],
  ['038Jacky_张学友BQB', 'funny'],
  ['039YaoMing表情包三巨头_姚明BQB', 'funny'],
  ['040HanazawaKana表情包三巨头_花泽香菜BQB', 'funny'],
  ['041ChenguoCui表情包三巨头_崔成国BQB', 'funny'],
  ['042HanZhang_张翰BQB', 'funny'],
  ['043Altman_奥特曼BQB', 'funny'],
  ['045MatchstickMen_火柴人BQB', 'funny'],
  ['048SpongeBob_海绵宝宝BQB', 'funny'],
  ['049CatEveryday_猫咪日常BQB', 'cute'],
  ['052Squirtle_杰尼龟BQB', 'cute'],
  ['054CatEyesThreeSisters_猫眼三姐妹BQB', 'cute'],
  ['055AllHeart_全是心心BQB', 'cute'],
  ['056Doraemon_哆啦A梦BQB', 'cute'],
  ['060MurCat_Mur猫😺BQB', 'funny'],
  ['061KeNan_柯南BQB', 'funny'],
  ['062CaiXvKun_蔡徐坤🏀BQB', 'funny'],
  ['063WebBrowser_浏览器BQB', 'work'],
  ['065TravelFrog_旅行青蛙🐸BQB', 'cute'],
  ['066Makeding_马克丁🐎BQB', 'work'],
  ['067NegroCarryingACoffin_黑人抬棺⚰BQB', 'funny'],
  ['071辉夜大小姐🎀BQB', 'cute'],
  ['074BrotherGui_兄贵哲学BQB', 'funny'],
  ['076Moe可爱萝莉_BQB', 'cute'],
  ['079mabaoguo_马保国_BQB', 'funny'],
  ['080GuiMie_鬼灭之刃_BQB', 'funny'],
  ['082AttackOnTitan_进击的巨人_BQB', 'funny'],
  ['083ChineseNewYear_中国春节_BQB', 'funny'],
  ['084Wuliuqi_刺客伍六七_BQB', 'funny'],
  ['085Wangbingbing_王冰冰_BQB', 'cute'],
  ['086Yangchaoyue_杨超越_BQB', 'cute'],
  ['088YuanLongping_袁隆平_BQB', 'funny'],
  ['089TeaBoy_饮茶哥_BQB', 'funny'],
  ['090SailorMoon_美少女战士_BQB', 'cute'],
  ['091LetTheBulletsFly_让子弹飞_BQB', 'funny'],
  ['092LuoXiang_罗翔_BQB', 'funny'],
  ['094TeacherWang_夏洛特烦恼王老师_BQB', 'funny'],
  ['095GenShin_原神_BQB', 'cute'],
  ['097Tu_那年那兔那些事_BQB', 'funny'],
  ['098spyxfamily_间谍过家家_BQB', 'cute'],
  ['105_BlackMythWuKong_黑神话悟空🐒BQB', 'funny'],
  ['106_Frieren_芙莉莲🪄BQB', 'cute'],
];

async function main() {
  const Database = require('better-sqlite3');
  const db = new Database(path.join(__dirname, '..', 'data', 'emojis.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  const needed = 250 - currentCount;
  console.log(`Current: ${currentCount}, Need: ${needed}`);

  if (needed <= 0) { console.log('Done!'); db.close(); return; }

  const allNew = [];
  const PER_FOLDER = 4;

  for (const [folder, category] of FOLDERS) {
    if (allNew.length >= needed) break;

    console.log(`[${allNew.length}/${needed}] Scraping ${folder}...`);
    let files;
    try {
      files = await scrapeFileList(folder);
    } catch (e) {
      console.log(`  Failed to scrape: ${e.message}`);
      continue;
    }

    if (files.length === 0) {
      console.log(`  No files found`);
      continue;
    }

    const selected = files.slice(0, PER_FOLDER);
    console.log(`  Found ${files.length} files, downloading ${selected.length}...`);

    for (const filename of selected) {
      if (allNew.length >= needed) break;
      const rawUrl = `${RAW_BASE}/${folder}/${filename}`;
      const localName = sanitizeFilename(filename);
      const localPath = path.join(DEST, localName);

      try {
        await downloadFile(rawUrl, localPath);
        const name = path.basename(filename, path.extname(filename))
          .replace(/^\d+[-_]?/, '').replace(/[-_]/g, ' ').slice(0, 30).trim();
        allNew.push({ filename: localName, name: name || localName, url: `/assets/emoji-defaults/${localName}`, category });
        console.log(`    + ${filename}`);
      } catch (e) {
        // skip
      }
    }
    await new Promise(r => setTimeout(r, 200));
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
  for (const r of db.prepare('SELECT category_id, COUNT(*) as c FROM emojis GROUP BY category_id').all()) counts[r.category_id] = r.c;
  console.log('By category:', counts);
  db.close();
}

main().catch(console.error);
