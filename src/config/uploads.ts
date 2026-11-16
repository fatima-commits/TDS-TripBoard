import fs from 'node:fs';
import path from 'node:path';

// Carpeta física donde viven las portadas y prefijo público con el que se sirven.
export const coversDirectory = path.join(process.cwd(), 'uploads', 'covers');
export const coversPublicPath = '/uploads/covers';

export const COVER_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Tipos permitidos y la extensión con la que se guarda cada uno.
export const COVER_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

fs.mkdirSync(coversDirectory, { recursive: true });
