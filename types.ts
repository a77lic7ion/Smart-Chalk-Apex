export type AIProvider = 'gemini' | 'mistral' | 'ollama' | 'cloudOllama' | 'lmStudio' | 'openRouter' | 'nous' | 'custom' | 'openai';
export type ContentType = 'test' | 'presentation' | 'lesson' | 'exam' | 'homework' | 'parsedExam' | 'manualExam';

export interface AISettings {
  provider: AIProvider;
  geminiApiKey: string;
  openAIKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  providerApiKeys: Partial<Record<AIProvider, string>>;
  providerEndpoints: Partial<Record<AIProvider, string>>;
  selectedModels: Partial<Record<AIProvider, string>>;
  customProviderName: string;
  customEndpoint: string;
  customApiKey: string;
}

export type Curriculum = 'CAPS' | 'IEB' | 'Cambridge' | 'Other';
export type SyncStatus = 'synced' | 'dirty';

export interface CurriculumSourceRecord {
  id: string;
  userId?: string;
  curriculum: 'CAPS' | 'IEB';
  publisher: 'DBE' | 'IEB';
  name: string;
  sourceUrl: string;
  sourceText: string;
  subject: string;
  grade: string;
  importedAt: number;
  lastVerifiedAt: number;
  syncStatus: SyncStatus;
}

export interface CurriculumEvidence {
  sourceId: string;
  publisher: 'DBE' | 'IEB';
  sourceName: string;
  sourceUrl: string;
  importedAt: number;
  alignmentStatus: 'source-grounded';
}

export interface CurriculumGroundingContext extends CurriculumEvidence {
  sourceExcerpt: string;
}

// Type for the data structure used in the staging area (after AI processing).
// A client-side UUID is used for React keys and edit/delete operations.
export interface TrainingQuestion {
  id: string; 
  question: string;
  answer: string;
  curriculum: Curriculum;
  standard: string;
  grade: string;
  subject: string;
  imageData?: string; // Legacy inline image data; new records use imageAssetId
  imageAssetId?: string;
  curriculumEvidence?: CurriculumEvidence;
}

// Type for the actual record stored in the IndexedDB database.
// 'id' is an auto-incrementing number managed by Dexie.
export interface DbRecord {
  id?: number; 
  question: string;
  answer: string;
  curriculum: Curriculum;
  standard: string;
  grade: string;
  subject: string;
  createdAt: number;
  imageData?: string; // Legacy inline image data
  imageAssetId?: string;
  curriculumEvidence?: CurriculumEvidence;
  sourceId?: string; // Links back to the parent document (SavedTest, LessonPlan etc.)
  syncStatus: SyncStatus;
}

// --- User Profile ---
export interface UserProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}


// --- Test Generator Types ---

export interface TestGenerationParams {
  grade: string;
  subject: string;
  topic: string;
  curriculum: Curriculum;
  questionTypes: string;
  bloomsLevel: string;
}

export interface SavedTest {
  id: string; // uuid
  name: string;
  params: TestGenerationParams;
  questions: TrainingQuestion[];
  curriculumEvidence?: CurriculumEvidence;
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}

// --- Formal Test Generator Types ---
export interface FormalTestParams extends TestGenerationParams {
    totalMarks: string;
    timeLimit: string;
    testType: string;
}

export interface SavedExam {
  id: string; // uuid
  name: string;
  params: FormalTestParams;
  questions: TrainingQuestion[];
  curriculumEvidence?: CurriculumEvidence;
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}


// --- Presentation Generator Types ---

export interface Presentation {
    id: string; // uuid
    name: string;
    params: TestGenerationParams;
    curriculumEvidence?: CurriculumEvidence;
    createdAt: number;
    userId?: string;
    syncStatus: SyncStatus;
}

export interface Slide {
    id: string; // uuid
    presentationId: string;
    slideNumber: number;
    title: string;
    content: string;
    imageData?: string; // Legacy inline image data
    imageAssetId?: string;
    isIntro?: boolean;
    syncStatus: SyncStatus;
}

export interface ImagePlaceholder {
    id:string; // uuid
    presentationId: string; // Can also hold lessonPlanId
    slideNumber: number; // Not relevant for lessons, can be 0
    placeholderId: string; // AI-generated ID for linking
    description: string;
    status: 'pending' | 'generating' | 'uploaded';
    imageData?: string; // Legacy inline image data
    imageAssetId?: string;
    syncStatus: SyncStatus;
}

// --- Lesson Plan Types ---
export interface LessonGenerationParams extends TestGenerationParams {
    duration: '30 minutes' | '1 hour';
}

export interface LessonPlan {
    id: string; // uuid
    name: string;
    params: LessonGenerationParams;
    curriculumEvidence?: CurriculumEvidence;
    content: string; // Generated lesson plan content, with image placeholder IDs
    questions: TrainingQuestion[]; // Assessment questions
    createdAt: number;
    userId?: string;
    syncStatus: SyncStatus;
}

// --- Homework Generator Types ---
export interface HomeworkGenerationParams extends TestGenerationParams {
    instructions: string;
}

export interface SavedHomework {
  id: string; // uuid
  name: string;
  params: HomeworkGenerationParams;
  questions: TrainingQuestion[];
  curriculumEvidence?: CurriculumEvidence;
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}

// --- Intelligent Exam Parser Types ---
export interface ExamImage {
    page: number;
    url: string; // base64 data URL
}

export interface ExtractedPdfData {
    textLines: { page: number; text: string }[];
    images: { page: number; url: string }[];
    tables: { page: number; html: string }[];
}

export interface ExamAnnexure {
    id: string;
    annexureId: string; // e.g., "A", "B"
    text: string;
    page: number;
    images: string[]; // URLs of images on the same page
}

export interface ExamQuestion {
    id: string;
    questionNumber: string; // e.g., "1.1", "2.3.4"
    text: string;
    page: number;
    images: string[]; // URLs of images extracted from the page
    annexure?: ExamAnnexure;
    imageData?: string; // Base64 URL of the FINAL image (extracted or manually uploaded)
    imageRequired?: boolean; // Flag if text implies an image but none was found
    section?: string; // e.g., "SECTION A"
    marks?: string; // e.g., "(10)" or "[20]"
}

export interface ParsedExamData {
    questions: ExamQuestion[];
    unmatchedAnnexures: ExamAnnexure[];
}

export interface SavedParsedExam {
  id: string; // uuid
  name: string;
  questions: ExamQuestion[];
  unmatchedAnnexures: ExamAnnexure[];
  metadata: {
    curriculum: Curriculum;
    grade: string;
    subject: string;
  };
  sourceFileName: string;
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}

// --- Manual Exam Builder Types ---
export interface ManualSubQuestion {
  id: string;
  questionNumber: string;
  text: string;
  marks: string;
  imageData?: string;
}

export interface ManualQuestionGroup {
    id: string;
    questionNumber: string;
    mainQuestionText: string;
    notes: string;
    subQuestions: ManualSubQuestion[];
}

export interface ManualSection {
  id: string;
  title: string;
  questions: ManualQuestionGroup[];
}

export interface ManualExam {
  id: string;
  name: string;
  sections: ManualSection[];
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}

// --- Image Library Types ---
export interface ImageLibraryRecord {
    id: string; // uuid
    imageData: string; // Canonical compressed image data
    subject: string;
    topic: string;
    slideId?: string;
    presentationId?: string;
    createdAt: number;
    syncStatus: SyncStatus;
}