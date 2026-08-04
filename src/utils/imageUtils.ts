/**
 * Optimizes an image file by resizing and compressing it.
 * Returns a Base64 string.
 * Target size is under 200KB.
 */
/**
 * Optimizes a base64 image string.
 */
export const optimizeBase64 = (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      const MAX_DIM = 600;
      if (width > height) {
        if (width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      let quality = 0.5;
      let base64 = canvas.toDataURL("image/jpeg", quality);

      // Aim for ~50KB
      // 50KB in Base64 is roughly 68,000 characters
      while (base64.length > 68000 && quality > 0.1) {
        quality -= 0.05;
        base64 = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(base64);
    };
    img.onerror = (err) => reject(err);
  });
};

export const optimizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      optimizeBase64(event.target?.result as string)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Uploads an image file or base64 string to ImgBB and returns the hosted URL.
 * Falls back to Telegra.ph or Catbox if ImgBB fails, ensuring base64 is never saved to DB.
 */
export const uploadImageToImgBB = async (fileOrBase64: File | string): Promise<string> => {
  let base64Data = '';
  if (fileOrBase64 instanceof File) {
    base64Data = await optimizeImage(fileOrBase64);
  } else if (typeof fileOrBase64 === 'string') {
    if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
      if (fileOrBase64.includes('ibb.co') || fileOrBase64.includes('imagebb') || fileOrBase64.includes('telegra.ph') || fileOrBase64.includes('catbox.moe')) return fileOrBase64;
    }
    base64Data = await optimizeBase64(fileOrBase64);
  }

  const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  // 1. Try client-side direct upload to ImgBB (bypasses Render cloud server IP Cloudflare blocks)
  try {
    const keyRes = await fetch('/api/imgbb-config');
    const keyData = await keyRes.json();
    const apiKey = keyData.apiKey || '2d5471413a9412f1f51086055bc7aa47';

    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', base64Clean);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // not JSON
    }
    if (data && data.success && data.data && data.data.url) {
      console.log('[CLIENT IMGBB] Uploaded successfully:', data.data.url);
      return data.data.url;
    }
  } catch (err) {
    console.warn('[CLIENT IMGBB] Direct upload failed, trying server:', err);
  }

  // 2. Try server-side upload endpoint
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Data }),
    });
    const data = await res.json();
    if (data && data.url && !data.url.startsWith('data:image')) {
      return data.url;
    }
  } catch (err) {
    console.error('Server upload error:', err);
  }

  // 3. Client-side fallback to Telegra.ph
  try {
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+-]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, 'image.jpg');

      const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (Array.isArray(data) && data[0] && data[0].src) {
        return `https://telegra.ph${data[0].src}`;
      }
    }
  } catch (err) {
    console.warn('Telegra.ph fallback failed:', err);
  }

  // 4. Client-side fallback to Catbox.moe
  try {
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+-]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', blob, 'image.jpg');

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      if (text && text.startsWith('http')) {
        return text.trim();
      }
    }
  } catch (err) {
    console.warn('Catbox fallback failed:', err);
  }

  console.error('All image upload methods failed, returning base64.');
  return base64Data;
};

