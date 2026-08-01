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
