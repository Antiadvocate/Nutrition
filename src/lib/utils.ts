export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Re-encode an image file at a sane size before it goes to a vision model.
 * Full-resolution phone photos are several megabytes of base64 and cost real
 * money per request without making the estimate any better.
 */
export function readImageDownscaled(file: File, maxEdge = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      // If the browser cannot decode it, fall back to the raw data URL.
      img.onerror = () => resolve(original);
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        if (scale === 1 && original.length < 1_500_000) return resolve(original);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(original);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}
