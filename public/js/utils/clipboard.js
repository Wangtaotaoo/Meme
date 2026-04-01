export async function copyImageToClipboard(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Convert to PNG if needed
    if (blob.type === 'image/png') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }

    // For non-PNG, convert via canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob }),
            ]);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  } catch (err) {
    console.error('Failed to copy image:', err);
    throw err;
  }
}

export function downloadImage(imageUrl, filename) {
  const a = document.createElement('a');
  a.href = imageUrl;
  a.download = filename || 'emoji.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
