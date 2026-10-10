'use client';
import { validateImageUpload } from '@/lib/uploads';
export function ImageUpload({ name, required = false }: { name: string; required?: boolean }) {
  return (
    <input
      type="file"
      name={name}
      required={required}
      accept="image/jpeg,image/png,image/webp"
      onChange={(event) => {
        const field = event.currentTarget;
        const file = field.files?.[0];
        field.setCustomValidity(file ? validateImageUpload(file) : '');
        if (file) field.reportValidity();
      }}
    />
  );
}
