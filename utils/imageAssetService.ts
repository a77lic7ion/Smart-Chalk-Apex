import { db } from '../db';
import type { ImageLibraryRecord } from '../types';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.78;

const readBlobAsDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Could not read image data.'));
  reader.readAsDataURL(blob);
});

const loadImage = (dataUrl: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not decode image data.'));
  image.src = dataUrl;
});

/** Compresses an image for local persistence, keeping dimensions suitable for lesson/PPTX/DOCX output. */
export const compressImage = async (input: Blob | string): Promise<string> => {
  const sourceData = typeof input === 'string' ? input : await readBlobAsDataUrl(input);
  if (!sourceData.startsWith('data:image/')) return sourceData;

  try {
    const image = await loadImage(sourceData);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return sourceData;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    // Keep the original data as a safe fallback for unusual browser image formats.
    return sourceData;
  }
};

export const saveImageAsset = async (imageData: string, metadata: { subject?: string; topic?: string; slideId?: string; presentationId?: string } = {}): Promise<string> => {
  const compressed = await compressImage(imageData);
  const existing = (await db.imageLibrary.toArray()).find(record => record.imageData === compressed);
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const record: ImageLibraryRecord = {
    id,
    imageData: compressed,
    subject: metadata.subject ?? '',
    topic: metadata.topic ?? '',
    slideId: metadata.slideId,
    presentationId: metadata.presentationId,
    createdAt: Date.now(),
    syncStatus: 'dirty',
  };
  await db.imageLibrary.put(record);
  return id;
};

export const getImageAsset = async (imageAssetId?: string): Promise<string | undefined> => {
  if (!imageAssetId) return undefined;
  return (await db.imageLibrary.get(imageAssetId))?.imageData;
};

/** Resolves a new reference first, then supports legacy inline data and legacy remote URLs. */
export const resolveImageAsset = async (imageAssetId?: string, legacyImageData?: string): Promise<string | undefined> => {
  const referenced = await getImageAsset(imageAssetId);
  if (referenced) return referenced;
  if (legacyImageData?.startsWith('data:image/')) return legacyImageData;
  if (legacyImageData) {
    try {
      const response = await fetch(legacyImageData);
      if (response.ok) return await compressImage(await response.blob());
    } catch {
      // A legacy remote URL is optional; callers can render a placeholder if unavailable.
    }
  }
  return undefined;
};

export const migrateInlineImageToAsset = async (imageData?: string, metadata: { subject?: string; topic?: string } = {}): Promise<string | undefined> => {
  if (!imageData) return undefined;
  return saveImageAsset(imageData, metadata);
};
