const https = require('https');
const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'assets', 'emoji-defaults');
const RAW_BASE = 'https://raw.githubusercontent.com/zhaoolee/ChineseBQB/master';

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// Folders we haven't downloaded from yet (skipped due to rate limit or not reached)
const REMAINING_FOLDERS = [
  { folder: '037XunLu_鲁迅BQB', category: 'funny' },
  { folder: '038Jacky_张学友BQB', category: 'funny' },
  { folder: '039YaoMing表情包三巨头_姚明BQB', category: 'funny' },
  { folder: '040HanazawaKana表情包三巨头_花泽香菜BQB', category: 'funny' },
  { folder: '041ChenguoCui表情包三巨头_崔成国BQB', category: 'funny' },
  { folder: '042HanZhang_张翰BQB', category: 'funny' },
  { folder: '043Altman_奥特曼BQB', category: 'funny' },
  { folder: '044YouLe_魔仙王子游乐BQB', category: 'funny' },
  { folder: '045MatchstickMen_火柴人BQB', category: 'funny' },
  { folder: '046WhatToWear_穿什么BQB', category: 'funny' },
  { folder: '047ShowSword亮剑BQB', category: 'funny' },
  { folder: '048SpongeBob_海绵宝宝BQB', category: 'funny' },
  { folder: '049CatEveryday_猫咪日常BQB', category: 'cute' },
  { folder: '050AntiHongKongIndependence_反港独BQB', category: 'funny' },
  { folder: '051Call_打电话BQB', category: 'work' },
  { folder: '052Squirtle_杰尼龟BQB', category: 'cute' },
  { folder: '053University大学BQB', category: 'work' },
  { folder: '054CatEyesThreeSisters_猫眼三姐妹BQB', category: 'cute' },
  { folder: '055AllHeart_全是心心BQB', category: 'cute' },
  { folder: '056Doraemon_哆啦A梦BQB', category: 'cute' },
  { folder: '057HappyDuck_开心鸭BQB', category: 'cute' },
  { folder: '060MurCat_Mur猫😺BQB', category: 'funny' },
  { folder: '061KeNan_柯南BQB', category: 'funny' },
  { folder: '062CaiXvKun_蔡徐坤🏀BQB', category: 'funny' },
  { folder: '063WebBrowser_浏览器BQB', category: 'work' },
  { folder: '064Trump_特朗普BQB', category: 'funny' },
  { folder: '065TravelFrog_旅行青蛙🐸BQB', category: 'cute' },
  { folder: '066Makeding_马克丁🐎BQB', category: 'work' },
  { folder: '067NegroCarryingACoffin_黑人抬棺⚰BQB', category: 'funny' },
  { folder: '070JOJO的奇妙冒险JQB', category: 'funny' },
  { folder: '071辉夜大小姐🎀BQB', category: 'cute' },
  { folder: '074BrotherGui_兄贵哲学BQB', category: 'funny' },
  { folder: '076Moe可爱萝莉_BQB', category: 'cute' },
  { folder: '077TuHi_土嗨_BQB', category: 'funny' },
  { folder: '079mabaoguo_马保国_BQB', category: 'funny' },
  { folder: '080GuiMie_鬼灭之刃_BQB', category: 'funny' },
  { folder: '081WuGang_吴刚_BQB', category: 'funny' },
  { folder: '082AttackOnTitan_进击的巨人_BQB', category: 'funny' },
  { folder: '083ChineseNewYear_中国春节_BQB', category: 'funny' },
  { folder: '084Wuliuqi_刺客伍六七_BQB', category: 'funny' },
  { folder: '085Wangbingbing_王冰冰_BQB', category: 'cute' },
  { folder: '086Yangchaoyue_杨超越_BQB', category: 'cute' },
  { folder: '087AgeOfAwakening_觉醒年代_BQB', category: 'funny' },
  { folder: '088YuanLongping_袁隆平_BQB', category: 'work' },
  { folder: '089TeaBoy_饮茶哥_BQB', category: 'funny' },
  { folder: '090SailorMoon_美少女战士_BQB', category: 'cute' },
  { folder: '091LetTheBulletsFly_让子弹飞_BQB', category: 'funny' },
  { folder: '092LuoXiang_罗翔_BQB', category: 'funny' },
  { folder: '093LiAn_李安_BQB', category: 'funny' },
  { folder: '094TeacherWang_夏洛特烦恼王老师_BQB', category: 'funny' },
  { folder: '095GenShin_原神_BQB', category: 'cute' },
  { folder: '097Tu_那年那兔那些事_BQB', category: 'funny' },
  { folder: '098spyxfamily_间谍过家家_BQB', category: 'cute' },
  { folder: '105_BlackMythWuKong_黑神话悟空🐒BQB', category: 'funny' },
  { folder: '106_Frieren_芙莉莲🪄BQB', category: 'cute' },
];

// Use GitHub page scraping approach - try known filename patterns
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) { resolve(false); return; } // skip existing
    const file = fs.createWriteStream(destPath);
    const doRequest = (reqUrl) => {
      https.get(reqUrl, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          doRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
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

async function tryDownloadFromFolder(folder, category, targetCount) {
  // Try to fetch the GitHub page for this folder to get file listing
  const pageUrl = `https://github.com/zhaoolee/ChineseBQB/tree/master/${encodeURIComponent(folder)}`;

  const results = [];

  // Try common filename patterns
  const extensions = ['gif', 'jpg', 'png', 'jpeg', 'webp'];
  const maxTries = 20;
  let consecutiveFails = 0;

  for (let i = 1; i <= maxTries && results.length < targetCount; i++) {
    for (const ext of extensions) {
      if (results.length >= targetCount) break;

      // Try different naming patterns
      const candidates = [
        `${String(i).padStart(8, '0')}.${ext}`,
        `${String(i).padStart(6, '0')}.${ext}`,
        `${String(i).padStart(3, '0')}.${ext}`,
      ];

      for (const candidate of candidates) {
        const rawUrl = `${RAW_BASE}/${folder}/${candidate}`;
        const localName = sanitizeFilename(candidate);
        const localPath = path.join(DEST, `${folder.split('_')[0]}_${localName}`);

        try {
          const downloaded = await downloadFile(rawUrl, localPath);
          if (downloaded) {
            const name = path.basename(candidate, `.${ext}`).replace(/^\d+[-_]?/, '');
            results.push({
              filename: path.basename(localPath),
              name: name || candidate,
              url: `/assets/emoji-defaults/${path.basename(localPath)}`,
              category,
            });
            console.log(`    + ${candidate}`);
            consecutiveFails = 0;
          }
        } catch {
          // File doesn't exist, skip
        }
      }
    }
  }

  return results;
}

async function main() {
  const { getDb } = require('../server/db/connection');
  const db = getDb();

  const TARGET = 250;
  const currentCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  const needed = TARGET - currentCount;

  console.log(`Current: ${currentCount}, Target: ${TARGET}, Need: ${needed}`);

  if (needed <= 0) {
    console.log('Already at target!');
    return;
  }

  const PER_FOLDER = Math.ceil(needed / REMAINING_FOLDERS.length) + 1;
  let allNew = [];

  for (const { folder, category } of REMAINING_FOLDERS) {
    if (allNew.length >= needed) break;

    console.log(`Trying ${folder}...`);
    try {
      const results = await tryDownloadFromFolder(folder, category, Math.min(PER_FOLDER, needed - allNew.length));
      allNew.push(...results);
      console.log(`  Got ${results.length} from ${folder} (total new: ${allNew.length}/${needed})`);
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }

  if (allNew.length === 0) {
    console.log('No new emojis found with pattern matching. Using alternative approach...');
    return;
  }

  // Get current max ID
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

  const finalCount = db.prepare('SELECT COUNT(*) as c FROM emojis').get().c;
  console.log(`\nAdded ${allNew.length} new emojis. Total: ${finalCount}`);

  const counts = {};
  const rows = db.prepare('SELECT category_id, COUNT(*) as c FROM emojis GROUP BY category_id').all();
  for (const r of rows) counts[r.category_id] = r.c;
  console.log('By category:', counts);
}

main().catch(console.error);
