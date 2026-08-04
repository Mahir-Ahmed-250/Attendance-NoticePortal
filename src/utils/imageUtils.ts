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
 * Falls back to optimized base64 if upload fails.
 */
export const uploadImageToImgBB = async (fileOrBase64: File | string): Promise<string> => {
  let base64Data = '';
  if (fileOrBase64 instanceof File) {
    base64Data = await optimizeImage(fileOrBase64);
  } else if (typeof fileOrBase64 === 'string') {
    if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
      if (fileOrBase64.includes('ibb.co') || fileOrBase64.includes('imagebb')) return fileOrBase64;
    }
    base64Data = await optimizeBase64(fileOrBase64);
  }

  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Data }),
    });
    const data = await res.json();
    if (data && data.url) {
      return data.url;
    } else {
      console.warn('Server ImgBB upload response error, falling back to base64:', data);
      return base64Data;
    }
  } catch (err) {
    console.error('Server ImgBB upload network error, falling back to base64:', err);
    return base64Data;
  }
};

