import { api } from '../api.js';
import { state } from '../state.js';

export async function initFavorites() {
  const favs = await api.getFavorites();
  state.set('favorites', favs);
}
