import Dexie, { type Table } from 'dexie';
import type { DbRecord, SavedTest, Presentation, Slide, ImagePlaceholder, LessonPlan, SavedExam, SavedHomework, SavedParsedExam, ManualExam, ImageLibraryRecord, CurriculumSourceRecord } from './types';

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
    curriculumSources: Table<CurriculumSourceRecord, string>;
};

// Now define the database versions and stores. This is the runtime part.
const coreStores = {
    trainingData: '++id, sourceId, userId, curriculum, standard, grade, subject, createdAt, syncStatus',
    savedTests: 'id, userId, name, createdAt, syncStatus',
    presentations: 'id, userId, name, createdAt, syncStatus',
    slides: 'id, presentationId, syncStatus',
    imagePlaceholders: 'id, presentationId, syncStatus',
    lessonPlans: 'id, userId, name, createdAt, syncStatus',
    savedExams: 'id, userId, name, createdAt, syncStatus',
    savedHomework: 'id, userId, name, createdAt, syncStatus',
    savedParsedExams: 'id, userId, name, createdAt, syncStatus',
    savedManualExams: 'id, userId, name, createdAt, syncStatus',
    imageLibrary: 'id, subject, topic, createdAt, syncStatus'
};

db.version(19).stores(coreStores);
db.version(20).stores({
    ...coreStores,
    curriculumSources: 'id, userId, curriculum, publisher, grade, subject, importedAt, syncStatus'
});
