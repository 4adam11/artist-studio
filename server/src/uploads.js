import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// Accepts photo uploads only (no SVG, which can carry scripts) and stores them
// in <dataDir>/uploads with random names.
export function imageUpload(dataDir, { maxFileSize, maxFiles, prefix = '' }) {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(dataDir, 'uploads'),
      filename: (req, file, done) => done(null, `${prefix}${Date.now()}-${randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`)
    }),
    limits: { fileSize: maxFileSize, files: maxFiles },
    fileFilter: (req, file, done) => {
      if (IMAGE_TYPES[file.mimetype]) return done(null, true);
      const error = new Error('Please upload JPG, PNG, WebP or GIF images');
      error.status = 400;
      error.expose = true;
      done(error);
    }
  });
}

export const uploadUrl = (file) => `/uploads/${file.filename}`;

// Removes files from a request that turned out to be invalid or spam.
export async function discardUploads(files = []) {
  await Promise.all(files.map((file) => unlink(file.path).catch(() => {})));
}
