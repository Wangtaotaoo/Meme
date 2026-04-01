import { $, $$ } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';
import { state } from '../state.js';
import { loadEmojis } from './emoji-grid.js';

export function initSearchBar() {
  const searchInput = $('#search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    state.set('searchQuery', query);

    // Reset active category to 'all'
    state.set('activeCategory', 'all');
    const navEl = $('#category-nav');
    if (navEl) {
      navEl.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.categoryId === 'all');
      });
    }

    loadEmojis({
      search: query || undefined,
      page: 1,
    });
  }, 300));

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
      state.set('searchQuery', '');
      loadEmojis({ page: 1 });
    }
  });
}
