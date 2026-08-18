import { db } from '../db';
import { compressImage, saveImageAsset } from './imageAssetService';

const migrateQuestionTable = async (table: any, metadata: { subject?: string; topic?: string } = {}) => {
  const records = await table.toArray();
  for (const record of records) {
    if (!Array.isArray(record.questions)) continue;
    let changed = false;
    const questions = await Promise.all(record.questions.map(async (question: any) => {
      if (!question.imageData || question.imageAssetId) return question;
      try {
        const imageAssetId = await saveImageAsset(question.imageData, metadata);
        const { imageData, ...withoutInlineImage } = question;
        changed = true;
        return { ...withoutInlineImage, imageAssetId };
      } catch {
        return question;
      }
    }));
    if (changed) await table.put({ ...record, questions });
  }
};

/**
 * Migrates legacy records in the background. It is deliberately idempotent:
 * records with imageAssetId are skipped and failed conversions retain imageData.
 */
export const migrateLegacyImageStorage = async (): Promise<void> => {
  const [slides, placeholders, trainingData, libraryImages] = await Promise.all([
    db.slides.toArray(),
    db.imagePlaceholders.toArray(),
    db.trainingData.toArray(),
    db.imageLibrary.toArray(),
  ]);

  // Compress existing library entries in place first so every future reference
  // points to a compact canonical copy.
  for (const image of libraryImages) {
    if (!image.imageData?.startsWith('data:image/')) continue;
    try {
      const compressed = await compressImage(image.imageData);
      if (compressed !== image.imageData) await db.imageLibrary.put({ ...image, imageData: compressed });
    } catch {
      // Keep the legacy library item usable if a browser cannot decode it.
    }
  }

  for (const slide of slides) {
    if (!slide.imageData || slide.imageAssetId) continue;
    try {
      const imageAssetId = await saveImageAsset(slide.imageData, { slideId: slide.id, presentationId: slide.presentationId });
      const { imageData, ...withoutInlineImage } = slide;
      await db.slides.put({ ...withoutInlineImage, imageAssetId });
    } catch {
      // Keep legacy inline data if conversion fails.
    }
  }

  for (const placeholder of placeholders) {
    if (!placeholder.imageData || placeholder.imageAssetId) continue;
    try {
      const imageAssetId = await saveImageAsset(placeholder.imageData);
      const { imageData, ...withoutInlineImage } = placeholder;
      await db.imagePlaceholders.put({ ...withoutInlineImage, imageAssetId });
    } catch {
      // Keep legacy inline data if conversion fails.
    }
  }

  for (const record of trainingData) {
    if (!record.imageData || record.imageAssetId) continue;
    try {
      const imageAssetId = await saveImageAsset(record.imageData, { subject: record.subject, topic: record.standard });
      const { imageData, ...withoutInlineImage } = record;
      await db.trainingData.put({ ...withoutInlineImage, imageAssetId });
    } catch {
      // Keep legacy inline data if conversion fails.
    }
  }

  await migrateQuestionTable(db.savedTests);
  await migrateQuestionTable(db.savedExams);
  await migrateQuestionTable(db.savedHomework);
  await migrateQuestionTable(db.lessonPlans);
};
