import { state } from './state.js';
import { initCategoryNav } from './components/category-nav.js';
import { loadEmojis, setupInfiniteScroll } from './components/emoji-grid.js';
import { initSearchBar } from './components/search-bar.js';
import { initEmojiDetail } from './components/emoji-detail.js';
import { initUploadModal } from './components/upload-modal.js';
import { initFavorites } from './components/favorites-panel.js';
import { initFeishuSDK } from './feishu-sdk.js';

async function init() {
  // Initialize state defaults
  state.set('activeCategory', 'all');
  state.set('searchQuery', '');
  state.set('emojis', []);
  state.set('favorites', []);
  state.set('recentEmojis', []);

  // Initialize components
  try {
    await Promise.all([
      initCategoryNav(),
      initFavorites(),
    ]);

    // Load initial emojis
    await loadEmojis({ page: 1 });

    // Setup interactive components
    initSearchBar();
    initEmojiDetail();
    initUploadModal();
    setupInfiniteScroll();

    // Try Feishu SDK (non-blocking)
    initFeishuSDK().catch(() => {});
  } catch (err) {
    console.error('Failed to initialize app:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
