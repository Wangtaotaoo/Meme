export async function copyImageToClipboard(imageUrl) {
  // Try Clipboard API first (works on HTTPS / localhost)
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    if (blob.type === 'image/png') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }

    // For non-PNG, convert via canvas
    const pngBlob = await convertToPngBlob(imageUrl);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
    return true;
  } catch (err) {
    // Clipboard API failed (likely HTTP context), use fallback
    console.log('Clipboard API unavailable, using execCommand fallback');
    return fallbackCopyImage(imageUrl);
  }
}

function convertToPngBlob(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

function fallbackCopyImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      // Create a hidden contenteditable container
      const container = document.createElement('div');
      container.contentEditable = true;
      container.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(container);

      const clone = img.cloneNode();
      container.appendChild(clone);

      // Select the image node
      const range = document.createRange();
      range.selectNode(clone);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      try {
        const ok = document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(container);
        if (ok) resolve(true);
        else reject(new Error('execCommand copy returned false'));
      } catch (e) {
        sel.removeAllRanges();
        document.body.removeChild(container);
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageUrl;
  });
}

export function downloadImage(imageUrl, filename) {
  const a = document.createElement('a');
  a.href = imageUrl;
  a.download = filename || 'emoji.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
