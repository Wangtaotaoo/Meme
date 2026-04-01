const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');
const RAW = 'https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master';

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const CATEGORY_MAP = {
  'Funny': 'funny', 'CuteGirl': 'cute', 'CuteBoy': 'cute',
  'SmirkBoy': 'funny', ' 'Hamster': 'cute',
  'HappyDuck': 'cute',
  'Cat': 'cute',
  'Dog': 'cute',
  'Parrot': 'cute',
  'PigPecs': 'funny',
  'Programmer': 'work',
  'TATAN': 'funny',
  'SpongeBob': 'funny',
  'TomAndJerry': 'funny',
  'WhiteVillain': 'funny',
  'Pikachu': 'cute',
  'Doraemon': 'cute',
  'Squirtle': 'cute',
  'Altman': 'funny',
  'MatchstickMen': 'funny',
  'MurCat': 'funny',
  'CatEveryday': 'cute',
  'CatEyes': 'cute',
  'AllHeart': 'cute',
  'Eat_': 'funny',
  'University': 'work',
  'Call_': 'work',
  'FamousPerson': 'funny',
  'YaoMing': 'funny',
  'XunLu': 'funny',
  'Jacky_': 'funny',
  'mabaoguo': 'funny',
  'GuiMie': 'funny',
  'WuGang': 'funny',
  'AttackOnTitan': 'funny',
  'TeaBoy': 'funny',
  'SailorMoon': 'cute',
  'LuoXiang': 'funny',
  'TeacherWang': 'funny',
  'KeNan': 'funny',
  'Trump': 'funny',
  'TuHi': 'funny',
  'Wuliuqi': 'funny',
  'Wangbingbing': 'cute',
  'Yangchaoyue': 'cute',
  'JensenHuang': 'work',
  'BlackMythWuKong': 'funny',
  'Frieren': 'cute',
  'ChainsawMan': 'funny',
  'EmpressesInThePalace': 'funny',
  'spyxfamily': 'cute',
  'GenShin': 'cute',
  'LetTheBulletsFly': 'funny',
  'NegroCarryingACoffin': 'funny',
};

function getCategoryForFolder(folderName) {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (folderName.includes(keyword)) return cat;
  }
  return 'funny';
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

async function scrapeFolderPage(folderName) {
  // Fetch the GitHub page HTML to scrape file links
  const pageUrl = `https://github.com/zhaoolee/ChineseBQB/tree/master/${encodeURIComponent(folderName)}`;

  return new Promise((resolve, reject) => {
    https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract file links from the HTML
        const fileRegex = /href="\/zhaoolee\/ChineseBQB\/blob\/master\/[^"]+\.(gif|jpg|jpeg|png|webp)"/gi;
        const matches = [];
        let match;
        while ((match = fileRegex.exec(data)) !== null) {
          const href = match[1];
          // Extract filename from the href
          const filename = href.split('/').pop();
          matches.push(filename);
        }
        resolve(matches);
      });
    }).on('error', reject);
  });
}

async function main() {
  const { getDb } = require('../server/db/connection');
  const db = getDb();

  const currentCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  const needed = 250 - currentCount;

  console.log(`Current: ${currentCount}, Need: ${needed} more`);

  if (needed <= 0) {
    console.log('Already at 250!');
    return;
  }

  // Folders we still need to download from
  const ALL_FOLDERS = [
    '037XunLu_鲁迅BQB', '038Jacky_张学友BQB', '039YaoMing表情包三巨头_姚明BQB',
    '040HanazawaKana表情包三巨头_花泽香菜BQB', '041ChenguoCui表情包三巨头_崔成国BQB',
    '042HanZhang_张翰BQB', '043Altman_奥特曼BQB', '044YouLe_魔仙王子游乐BQB',
    '045MatchstickMen_火柴人BQB', '048SpongeBob_海绵宝宝BQB', '049CatEveryday_猫咪日常BQB',
    '051Call_打电话BQB', '052Squirtle_杰尼龟BQB', '053University大学BQB',
    '054CatEyesThreeSisters_猫眼三姐妹BQB', '055AllHeart_全是心心BQB',
    '056Doraemon_哆啦A梦BQB', '057HappyDuck_开心鸭BQB',
    '060MurCat_Mur猫😺BQB', '061KeNan_柯南BQB', '065TravelFrog_旅行青蛙🐸BQB',
    '066Makeding_马克丁🐎BQB', '067NegroCarryingACoffin_黑人抬棺⚰BQB',
    '079mabaoguo_马保国_BQB', '080GuiMie_鬼灭之刃_BQB', '081WuGang_吴刚_BQB',
    '082AttackOnTitan_进击的巨人_BQB', '083ChineseNewYear_中国春节_BQB',
    '084Wuliuqi_刺客伍六七_BQB', '085Wangbingbing_王冰冰_BQB',
    '086Yangchaoyue_杨超越_BQB', '088YuanLongping_袁隆平_BQB',
    '089TeaBoy_饮茶哥_BQB', '090SailorMoon_美少女战士_BQB',
    '091LetTheBulletsFly_让子弹飞_BQB', '092LuoXiang_罗翔_BQB',
    '094TeacherWang_夏洛特烦恼王老师_BQB', '095GenShin_原神_BQB',
    '097Tu_那年那兔那些事_BQB', '098spyxfamily_间谍过家家_BQB',
    '105_BlackMythWuKong_黑神话悟空🐒BQB', '106_Frieren_芙莉莲🪄BQB',
  ];

  let allNew = [];
  const PER_FOLDER = 4;

  for (const folder of ALL_FOLDERS) {
    if (allNew.length >= needed) break;

    const category = getCategoryForFolder(folder);
    console.log(`Scraping ${folder}...`);

    try {
      const filenames = await scrapeFolderPage(folder);
      const selected = filenames.slice(0, PER_FOLDER);

      for (const filename of selected) {
        if (allNew.length >= needed) break;

        const rawUrl = `${RAW}/${folder}/${filename}`;
        const localName = sanitizeFilename(filename);
        const localPath = path.join(DEST, localName);

        if (fs.existsSync(localPath)) continue;

        try {
          await downloadFile(rawUrl, localPath);
          const name = path.basename(filename, path.extname(filename))
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
          console.log(`  + ${filename}`);
        } catch (err) {
          // skip failures silently
        }
      }

      // Small delay between folders
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }

  console.log(`\nDownloaded ${allNew.length} new emojis`);

  // Insert into database
  if (allNew.length > 0) {
    const maxRow = db.prepare('SELECT id FROM emojis ORDER BY id DESC LIMIT 1').get();
    let nextNum = maxRow ? parseInt(maxRow.id.replace('real_', ''), 10) + 1 : 1;

    const insertEmoji = db.prepare(
      `INSERT OR IGNORE INTO emojis (id, name, slug, image_url, source, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const e of allNew) {
      const id = `real_${String(nextNum).padStart(3, '0')}`;
      const slug = `sticker-${nextNum}-${Date.now()}`;
      insertEmoji.run(id, e.name, slug, e.url, 'builtin', e.category, e.category);
      nextNum++;
    }
  }

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  console.log(`Total emojis in DB: ${finalCount}`);

  const counts = {};
  const rows = db.prepare('SELECT category_id, COUNT(*) as c FROM emojis GROUP BY category_id').all();
  for (const r of rows) counts[r.category_id] = r.c;
  console.log('By category:', counts);
}

main().catch(console.error);
