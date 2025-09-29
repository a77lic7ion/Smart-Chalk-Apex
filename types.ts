export type AIProvider = 'gemini' | 'openai' | 'ollama';
export type ContentType = 'test' | 'presentation' | 'lesson' | 'exam' | 'homework' | 'parsedExam' | 'manualExam';

export interface AISettings {
  provider: AIProvider;
  geminiApiKey: string;
  openAIKey: string;
  ollamaUrl: string;
  ollamaModel: string;
}

export type Curriculum = 'CAPS' | 'IEB' | 'Cambridge' | 'Other';
export type SyncStatus = 'synced' | 'dirty';

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
  imageData?: string; // Optional base64 encoded image
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
  imageData?: string; // Optional base64 encoded image
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
  createdAt: number;
  userId?: string;
  syncStatus: SyncStatus;
}


// --- Presentation Generator Types ---

export interface Presentation {
    id: string; // uuid
    name: string;
    params: TestGenerationParams;
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
    imageData?: string;
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
    imageData?: string; // Base64 encoded image data
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
    imageData: string; // base64
    subject: string;
    topic: string;
    createdAt: number;
    syncStatus: SyncStatus;
}