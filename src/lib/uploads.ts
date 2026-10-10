// Keep multipart uploads below Vercel's 4.5 MB function request limit.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateImageUpload(file: { size: number; type: string }) {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(file.type)) {
    return 'Choose a JPG, PNG, or WebP image up to 4 MB.';
  }
  return '';
}
