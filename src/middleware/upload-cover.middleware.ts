import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { COVER_MAX_BYTES, COVER_MIME_TYPES, coversDirectory } from '../config/uploads.js';
import { AppError } from '../utils/app-error.js';

const storage = multer.diskStorage({
  destination: coversDirectory,
  // Nombre aleatorio: nunca se usa el nombre original del archivo.
  filename: (_request, file, callback) => {
    callback(null, `${randomUUID()}${COVER_MIME_TYPES[file.mimetype]}`);
  }
});

export const uploadCover = multer({
  storage,
  limits: { fileSize: COVER_MAX_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!COVER_MIME_TYPES[file.mimetype]) {
      callback(new AppError(400, 'INVALID_FILE_TYPE', 'Cover must be a JPG, PNG, GIF or WebP image'));
      return;
    }
    callback(null, true);
  }
});
