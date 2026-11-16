import fs from 'node:fs/promises';
import path from 'node:path';
import { isValidObjectId } from 'mongoose';
import { coversDirectory, coversPublicPath } from '../config/uploads.js';
import { Trip } from '../models/trip.model.js';
import { AppError } from '../utils/app-error.js';

// Firmas binarias ("magic bytes") de cada formato permitido. El mimetype lo
// declara el navegador y se puede falsificar; el contenido real no.
function matchesImageSignature(header: Buffer): boolean {
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = ['GIF87a', 'GIF89a'].includes(header.subarray(0, 6).toString('ascii'));
  const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF'
    && header.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
}

async function readFileHeader(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

// Borra del disco la portada referenciada por una coverUrl. Solo toma el nombre
// del archivo, así que nunca puede salir de la carpeta de portadas.
export async function deleteCoverFile(coverUrl: string | null | undefined): Promise<void> {
  if (!coverUrl || !coverUrl.startsWith(`${coversPublicPath}/`)) return;
  const fileName = path.basename(coverUrl);
  try {
    await fs.unlink(path.join(coversDirectory, fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Could not delete cover', error);
  }
}

async function findOwnedTrip(userId: string, tripId: unknown) {
  if (typeof tripId !== 'string' || !isValidObjectId(tripId)) {
    throw new AppError(400, 'INVALID_TRIP_ID', 'Trip id is invalid');
  }
  const trip = await Trip.findOne({ _id: tripId, user: userId, isActive: true });
  if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip was not found');
  return trip;
}

export async function setTripCover(userId: string, tripId: unknown, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, 'COVER_REQUIRED', 'A cover image is required in the "cover" field');
  }

  try {
    if (!matchesImageSignature(await readFileHeader(file.path))) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Cover must be a JPG, PNG, GIF or WebP image');
    }

    const trip = await findOwnedTrip(userId, tripId);
    const previousCoverUrl = trip.coverUrl;

    trip.coverUrl = `${coversPublicPath}/${file.filename}`;
    await trip.save();

    // Solo cuando la nueva portada ya quedó guardada se borra la anterior.
    await deleteCoverFile(previousCoverUrl);
    return trip;
  } catch (error) {
    // Si algo falla, el viaje no cambia y el archivo recién subido no se queda huérfano.
    await fs.unlink(file.path).catch(() => undefined);
    throw error;
  }
}

export async function removeTripCover(userId: string, tripId: unknown) {
  const trip = await findOwnedTrip(userId, tripId);
  const previousCoverUrl = trip.coverUrl;

  if (previousCoverUrl) {
    trip.coverUrl = '';
    await trip.save();
    await deleteCoverFile(previousCoverUrl);
  }

  return trip;
}
