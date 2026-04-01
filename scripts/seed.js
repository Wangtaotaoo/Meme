const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getDb } = require('../server/db/connection');
const { initDb } = require('../server/db/init');

function seed() {
  initDb();
  const db = getDb();

  // Seed categories
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

  for (const cat of categories) {
    insertCat.run(cat.id, cat.name, cat.icon, cat.sort_order);
  }

  // Seed emojis - using placeholder SVGs as built-in defaults
  const emojis = [
    { id: 'e001', name: '笑哭', slug: 'laugh-cry', tags: '搞笑,笑,哭', category_id: 'funny' },
    { id: 'e002', name: '无语', slug: 'speechless', tags: '搞笑,无语,汗', category_id: 'funny' },
    { id: 'e003', name: '鼓掌', slug: 'clap', tags: '搞笑,鼓掌,赞', category_id: 'funny' },
    { id: 'e004', name: '加油', slug: 'cheer-up', tags: '搞笑,加油,鼓励', category_id: 'funny' },
    { id: 'e005', name: '摸鱼', slug: 'slack-off', tags: '搞笑,摸鱼,偷懒,工作', category_id: 'funny' },
    { id: 'e006', name: '躺平', slug: 'lie-flat', tags: '搞笑,躺平,休息', category_id: 'funny' },
    { id: 'e007', name: '比心', slug: 'finger-heart', tags: '可爱,心,喜欢', category_id: 'cute' },
    { id: 'e008', name: '可爱', slug: 'cute-face', tags: '可爱,萌,表情', category_id: 'cute' },
    { id: 'e009', name: '抱抱', slug: 'hug', tags: '可爱,拥抱,安慰', category_id: 'cute' },
    { id: 'e010', name: '开心', slug: 'happy', tags: '可爱,开心,笑', category_id: 'cute' },
    { id: 'e011', name: '猫猫', slug: 'cat', tags: '可爱,猫咪,喵', category_id: 'cute' },
    { id: 'e012', name: '狗狗', slug: 'dog', tags: '可爱,狗狗,汪', category_id: 'cute' },
    { id: 'e013', name: '收到', slug: 'roger', tags: '工作,收到,确认', category_id: 'work' },
    { id: 'e014', name: '好的', slug: 'ok', tags: '工作,好的,确认', category_id: 'work' },
    { id: 'e015', name: '辛苦了', slug: 'good-job', tags: '工作,辛苦,感谢', category_id: 'work' },
    { id: 'e016', name: 'deadline', slug: 'deadline', tags: '工作,截止,紧张', category_id: 'work' },
    { id: 'e017', name: '开会中', slug: 'in-meeting', tags: '工作,会议,忙碌', category_id: 'work' },
    { id: 'e018', name: '休假中', slug: 'on-vacation', tags: '工作,休假,休息', category_id: 'work' },
    { id: 'e019', name: '冲鸭', slug: 'go-duck', tags: '搞笑,加油,冲', category_id: 'funny' },
    { id: 'e020', name: '棒', slug: 'awesome', tags: '搞笑,棒,厉害', category_id: 'funny' },
    { id: 'e021', name: '请查收', slug: 'please-check', tags: '工作,查收,文件', category_id: 'work' },
    { id: 'e022', name: '小花', slug: 'flower', tags: '可爱,花,自然', category_id: 'cute' },
    { id: 'e023', name: '彩虹', slug: 'rainbow', tags: '可爱,彩虹,颜色', category_id: 'cute' },
    { id: 'e024', name: '咖啡', slug: 'coffee', tags: '工作,咖啡,提神', category_id: 'work' },
    { id: 'e025', name: '摸头', slug: 'pat-head', tags: '可爱,摸头,安慰', category_id: 'cute' },
  ];

  const insertEmoji = db.prepare(
    `INSERT OR IGNORE INTO emojis (id, name, slug, image_url, source, category_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const emoji of emojis) {
    // Use a generated SVG placeholder
    const imageUrl = generatePlaceholderSvg(emoji.name, emoji.id);
    insertEmoji.run(emoji.id, emoji.name, emoji.slug, imageUrl, 'builtin', emoji.category_id, emoji.tags);
  }

  console.log(`Seeded ${categories.length} categories and ${emojis.length} emojis.`);
}

function generatePlaceholderSvg(name, id) {
  // We'll store the SVG as a data URI so it works without actual image files
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
  const colorIndex = parseInt(id.replace(/\D/g, ''), 10) % colors.length;
  const bgColor = colors[colorIndex];
  const initial = name.charAt(0);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="16" fill="${bgColor}"/>
    <text x="64" y="72" text-anchor="middle" font-size="48" font-family="sans-serif" fill="white">${initial}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

seed();
