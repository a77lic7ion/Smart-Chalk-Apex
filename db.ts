import Dexie, { type Table } from 'dexie';
import type { DbRecord, SavedTest, Presentation, Slide, ImagePlaceholder, LessonPlan, SavedExam, SavedHomework, SavedParsedExam, ManualExam, ImageLibraryRecord } from './types';

// Create the db instance and cast it to a type that includes the Dexie methods
// and our custom table properties. This is a robust pattern that avoids
// potential issues with class inheritance in some JS environments.
export const db = new Dexie('TrainingDataGeneratorDB') as Dexie & {
    trainingData: Table<DbRecord, number>;
    savedTests: Table<SavedTest, string>;
    presentations: Table<Presentation, string>;
    slides: Table<Slide, string>;
    imagePlaceholders: Table<ImagePlaceholder, string>;
    lessonPlans: Table<LessonPlan, string>;
    savedExams: Table<SavedExam, string>;
    savedHomework: Table<SavedHomework, string>;
    savedParsedExams: Table<SavedParsedExam, string>;
    savedManualExams: Table<ManualExam, string>;
    imageLibrary: Table<ImageLibraryRecord, string>;
};

// Now define the database versions and stores. This is the runtime part.
db.version(18).stores({
    trainingData: '++id, sourceId, userId, curriculum, standard, grade, subject, createdAt',
    savedTests: 'id, userId, name, createdAt',
    presentations: 'id, userId, name, createdAt',
    slides: 'id, presentationId',
    imagePlaceholders: 'id, presentationId',
    lessonPlans: 'id, userId, name, createdAt',
    savedExams: 'id, userId, name, createdAt',
    savedHomework: 'id, userId, name, createdAt',
    savedParsedExams: 'id, userId, name, createdAt',
    savedManualExams: 'id, userId, name, createdAt',
    imageLibrary: 'id, subject, topic, createdAt' // New table for reusable images
});
