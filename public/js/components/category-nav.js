import { $, $$ } from '../utils/dom.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { loadEmojis } from './emoji-grid.js';

const SYSTEM_CATS = ['all', 'favorites', 'recent'];

export async function initCategoryNav() {
  const categories = await api.getCategories();
  state.set('categories', categories);
  render(categories);
}

function render(categories = []) {
  const navEl = $('#category-nav');
  if (!navEl) return;
  navEl.innerHTML = '';

  let addedSeparator = false;

  for (const cat of categories) {
    if (!addedSeparator && !SYSTEM_CATS.includes(cat.id)) {
      const sep = document.createElement('div');
      sep.className = 'nav-separator';
      navEl.appendChild(sep);
      addedSeparator = true;
    }

    const btn = document.createElement('button');
    btn.className = `nav-item${cat.id === 'all' ? ' active' : ''}`;
    btn.dataset.categoryId = cat.id;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'nav-icon';
    iconSpan.textContent = getCatIcon(cat.icon || cat.id);
    btn.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat.name;
    btn.appendChild(nameSpan);

    if (cat.emoji_count !== undefined && !SYSTEM_CATS.includes(cat.id)) {
      const countSpan = document.createElement('span');
      countSpan.className = 'nav-count';
      countSpan.textContent = cat.emoji_count;
      btn.appendChild(countSpan);
    }

    btn.addEventListener('click', () => {
      navEl.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      state.set('activeCategory', cat.id);
      handleCategoryClick(cat.id);
    });

    navEl.appendChild(btn);
  }
}

async function handleCategoryClick(categoryId) {
  if (categoryId === 'favorites') {
    const favs = state.get('favorites') || [];
    state.set('emojis', favs);
    return;
  }
  if (categoryId === 'recent') {
    const recent = state.get('recentEmojis') || [];
    state.set('emojis', recent);
    return;
  }

  await loadEmojis({
    category: categoryId !== 'all' ? categoryId : undefined,
    page: 1,
  });
}

function getCatIcon(icon) {
  const icons = {
    grid: '\u25A6',
    star: '\u2605',
    clock: '\u23F0',
    laugh: '\uD83D\uDE02',
    heart: '\u2764',
    briefcase: '\uD83D\uDCBC',
    'plus-circle': '\u2795',
  };
  return icons[icon] || '\u25CF';
}
