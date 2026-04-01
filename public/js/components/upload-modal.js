import { $, show, hide } from '../utils/dom.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { loadEmojis } from './emoji-grid.js';

let selectedFile = null;

export async function initUploadModal() {
  const modalEl = $('#upload-modal');
  const openBtn = $('#upload-btn');
  const closeBtn = $('#upload-close');
  const dropzone = $('#dropzone');
  const fileInput = $('#file-input');
  const previewArea = $('#preview-area');
  const previewImg = $('#preview-image');
  const removePreviewBtn = $('#remove-preview');
  const form = $('#upload-form');
  const submitBtn = $('#upload-submit');
  const nameInput = $('#emoji-name');
  const categorySelect = $('#emoji-category');
  const tagsInput = $('#emoji-tags');

  // Populate category select
  const categories = await api.getCategories();
  for (const cat of categories) {
    if (['all', 'favorites', 'recent'].includes(cat.id)) continue;
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  }

  // Open/close
  openBtn.addEventListener('click', () => show(modalEl));
  closeBtn.addEventListener('click', closeModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });

  // Dropzone click
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // Remove preview
  removePreviewBtn.addEventListener('click', clearFile);

  // Submit
  form.addEventListener('submit', handleSubmit);

  function handleFile(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('不支持的文件格式', 'error');
      return;
    }
    if (file.size > 1024 * 1024) {
      showToast('文件大小不能超过 1MB', 'error');
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      show(previewArea);
      hide(dropzone);
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    selectedFile = null;
    previewImg.src = '';
    hide(previewArea);
    show(dropzone);
    fileInput.value = '';
  }

  function closeModal() {
    hide(modalEl);
    clearFile();
    nameInput.value = '';
    tagsInput.value = '';
    categorySelect.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedFile) {
      showToast('请选择一个图片文件', 'error');
      return;
    }

    const name = nameInput.value.trim();
    if (!name) {
      showToast('请输入表情名称', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '上传中...';

    try {
      // 1. Upload image
      const uploadResult = await api.uploadImage(selectedFile);

      // 2. Create emoji record
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now();
      await api.createEmoji({
        name,
        slug,
        image_url: uploadResult.url,
        source: 'user',
        category_id: categorySelect.value || undefined,
        tags: tagsInput.value.trim(),
      });

      showToast('上传成功', 'success');
      closeModal();

      // Refresh grid
      loadEmojis({ page: 1 });
    } catch (err) {
      showToast('上传失败: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '上传';
    }
  }
}
