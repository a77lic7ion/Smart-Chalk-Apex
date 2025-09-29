import React, { useState, useCallback, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { generateTest as dispatchGenerateTest } from '../services/aiDispatchService';
import { db } from '../db';
import type { TestGenerationParams, TrainingQuestion, UserProfile, SavedTest, FormalTestParams, DbRecord, SavedExam, ContentType, ExamQuestion } from '../types';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, COMPREHENSIVE_SUBJECT_OPTIONS, BLOOMS_LEVEL_OPTIONS, QUESTION_TYPE_SUGGESTIONS } from '../constants';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import { EditableQuestionCard } from './EditableQuestionCard';
import { exportFormalTestAsDocx } from '../utils/exportService';
import { XMarkIcon, DocumentArrowDownIcon, BookmarkSquareIcon, ClipboardDocumentCheckIcon, DocumentPlusIcon, UploadIcon } from './Icons';

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const AddCustomQuestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { question: string, answer: string, imageData?: string }) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [imageData, setImageData] = useState<string | undefined>();
    const [imageName, setImageName] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file (PNG, JPG, etc.).');
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        try {
            // Upload to Vercel Blob storage
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', 'tests');
            
            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('googleToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload image to cloud storage');
            }
            
            const result = await response.json();
            const imageUrl = result.data.url;
            
            // Use the cloud URL instead of base64
            setImageData(imageUrl);
            setImageName(file.name);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to upload image.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSave = () => {
        if (!question.trim() || !answer.trim()) {
            setError("Question and Answer fields cannot be empty.");
            return;
        }
        onSave({ question, answer, imageData });
        resetState();
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const resetState = () => {
        setQuestion('');
        setAnswer('');
        setImageData(undefined);
        setImageName('');
        setError(null);
        setIsProcessing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
                 <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Add Custom Question</h2>
                 </div>
                 <div className="p-6 space-y-4 overflow-y-auto">
                     {error && <p className="text-sm text-red-600">{error}</p>}
                     <TextArea label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
                     <TextArea label="Answer / Memo" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
                     <div>
                        <label className="block text-sm font-medium text-chalk-black mb-1">Image (Optional)</label>
                        <div className="flex items-center gap-4">
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" disabled={isProcessing}>
                                <UploadIcon className="h-4 w-4 mr-2" />
                                {isProcessing ? 'Processing...' : 'Upload Image'}
                            </Button>
                            {imageName && <span className="text-sm text-slate-600">{imageName}</span>}
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        {imageData && <img src={imageData} className="mt-4 rounded-md border p-2 max-h-48" alt="Preview" />}
                     </div>
                 </div>
                 <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
                    <Button onClick={handleClose} variant="ghost">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">Save Question</Button>
                 </div>
            </div>
        </div>
    )
};


const StagingArea: React.FC<{
    questions: TrainingQuestion[];
    formalParams: FormalTestParams;
    onUpdate: (q: TrainingQuestion) => void;
    onDelete: (id: string) => void;
    onDiscard: () => void;
    onSave: () => void;
    onAddCustomQuestion: () => void;
    isSaving: boolean;
}> = ({ questions, formalParams, onUpdate, onDelete, onDiscard, onSave, onAddCustomQuestion, isSaving }) => {
    const [isExportingTest, setIsExportingTest] = useState(false);
    const [isExportingMemo, setIsExportingMemo] = useState(false);

    const handleExportTest = async () => {
        setIsExportingTest(true);
        try {
            await exportFormalTestAsDocx(formalParams.topic, questions, formalParams, 'questions');
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? `Export failed: ${err.message}` : 'An unknown error occurred during DOCX export.');
        } finally {
            setIsExportingTest(false);
        }
    };
    
    const handleExportMemo = async () => {
        setIsExportingMemo(true);
        try {
            await exportFormalTestAsDocx(formalParams.topic, questions, formalParams, 'memo');
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? `Export failed: ${err.message}` : 'An unknown error occurred during DOCX export.');
        } finally {
            setIsExportingMemo(false);
        }
    };

    const isBusy = isExportingTest || isExportingMemo || isSaving;

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Review Questions</h2>
                    <p className="text-sm text-slate-500">Edit or add questions before saving or exporting your exam.</p>
                </div>
                 <Button onClick={onAddCustomQuestion} variant="secondary" size="sm" disabled={isBusy}>
                    <DocumentPlusIcon className="h-5 w-5 mr-2" />
                    Add Custom Question
                </Button>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 -mr-4 mb-6">
                {questions.length > 0 ? (
                    questions.map((q) => (
                        <EditableQuestionCard 
                            key={q.id}
                            questionData={q}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-slate-500 font-medium">The AI did not generate any questions.</p>
                        <p className="text-sm text-slate-400 mt-1">You can add custom questions or discard and try again.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={onSave} isLoading={isSaving} disabled={isBusy || questions.length === 0} size="lg">
                    <BookmarkSquareIcon className="h-5 w-5 mr-2" />
                    Save Exam
                </Button>
                <Button onClick={handleExportTest} isLoading={isExportingTest} disabled={isBusy || questions.length === 0} size="lg" variant="secondary">
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Export Exam DOCX
                </Button>
                 <Button onClick={handleExportMemo} isLoading={isExportingMemo} disabled={isBusy || questions.length === 0} size="lg" variant="secondary">
                    <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                    Export Memorandum DOCX
                </Button>
                <Button onClick={onDiscard} disabled={isBusy} variant="ghost" className="md:col-start-2">
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Discard & Start Over
                </Button>
            </div>
        </div>
    );
};


export const TemplatedTestView: React.FC<{ user: UserProfile, loadId: string | null; loadType: ContentType | null, onDidLoad: () => void; }> = ({ user, loadId, loadType, onDidLoad }) => {
    const { settings } = useAIProviderSettings();
    const [params, setParams] = useState<FormalTestParams>({
        grade: GRADES_OPTIONS[7].value,
        subject: COMPREHENSIVE_SUBJECT_OPTIONS.find(s => s.value === "Mathematics")?.value || COMPREHENSIVE_SUBJECT_OPTIONS[0].value,
        topic: 'Algebraic Expressions',
        curriculum: 'CAPS',
        questionTypes: '20 multiple choice questions about algebraic expressions and equations.',
        bloomsLevel: BLOOMS_LEVEL_OPTIONS[6].value,
        totalMarks: '40',
        timeLimit: '1 Hour',
        testType: 'Baseline Test'
    });
    
    const [stagedQuestions, setStagedQuestions] = useState<TrainingQuestion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);


    const handleLoadContent = useCallback(async (type: ContentType, id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            if (type === 'test') {
                const testToLoad = await db.savedTests.get(id);
                if (!testToLoad || testToLoad.userId !== user.sub) throw new Error("Could not find the specified test or access is denied.");
                
                setParams({
                    ...testToLoad.params,
                    totalMarks: '40',
                    timeLimit: '1 Hour',
                    testType: 'Formatted Test',
                });
                setStagedQuestions(testToLoad.questions);

            } else if (type === 'lesson') {
                const lessonToLoad = await db.lessonPlans.get(id);
                if (!lessonToLoad || lessonToLoad.userId !== user.sub) throw new Error("Could not find the specified lesson plan or access is denied.");
                
                setParams({
                    ...lessonToLoad.params,
                    totalMarks: String(lessonToLoad.questions.length > 0 ? lessonToLoad.questions.length : '20'),
                    timeLimit: lessonToLoad.params.duration === '30 minutes' ? '30 Minutes' : '1 Hour',
                    testType: 'Lesson Assessment',
                });
                setStagedQuestions(lessonToLoad.questions);

            } else if (type === 'presentation') {
                const presentationToLoad = await db.presentations.get(id);
                if (!presentationToLoad || presentationToLoad.userId !== user.sub) throw new Error("Could not find the specified presentation or access is denied.");
                
                setParams({
                    ...presentationToLoad.params,
                    totalMarks: '50',
                    timeLimit: '1.5 Hours',
                    testType: 'Summative Assessment',
                    questionTypes: `A summative test based on the presentation: "${presentationToLoad.name}". The test should include a mix of multiple-choice, short answer, and one long-form question.`,
                });
                setStagedQuestions(null);

            } else if (type === 'exam') {
                const examToLoad = await db.savedExams.get(id);
                if (!examToLoad || examToLoad.userId !== user.sub) throw new Error("Could not find the specified exam or access is denied.");
                setParams(examToLoad.params);
                setStagedQuestions(examToLoad.questions);
            
            } else if (type === 'parsedExam') {
                const parsedExam = await db.savedParsedExams.get(id);
                if (!parsedExam || parsedExam.userId !== user.sub) throw new Error("Could not find the specified parsed exam or access is denied.");
                
                const mappedQuestions: TrainingQuestion[] = parsedExam.questions.map((q: ExamQuestion) => ({
                    id: q.id,
                    question: q.text,
                    answer: q.annexure?.text || "No answer provided.",
                    curriculum: parsedExam.metadata.curriculum,
                    grade: parsedExam.metadata.grade,
                    subject: parsedExam.metadata.subject,
                    standard: `${parsedExam.metadata.grade} - ${parsedExam.metadata.subject} - ${parsedExam.name}`,
                    imageData: q.imageData,
                }));
                
                setParams({
                    grade: parsedExam.metadata.grade,
                    subject: parsedExam.metadata.subject,
                    topic: parsedExam.name,
                    curriculum: parsedExam.metadata.curriculum,
                    questionTypes: 'Questions sourced from parsed document.',
                    bloomsLevel: 'Balanced', // Default for parsed content
                    totalMarks: String(mappedQuestions.length),
                    timeLimit: '1 Hour',
                    testType: 'Formal Exam',
                });
                setStagedQuestions(mappedQuestions);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load content.');
            setStagedQuestions(null);
        } finally {
            setIsLoading(false);
        }
    }, [user.sub]);

    useEffect(() => {
        if (loadId && loadType) {
            handleLoadContent(loadType, loadId);
            onDidLoad();
        }
    }, [loadId, loadType, onDidLoad, handleLoadContent]);


    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGenerate = async () => {
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        const generationParams: TestGenerationParams = {
            grade: params.grade,
            subject: params.subject,
            topic: params.topic,
            curriculum: params.curriculum,
            questionTypes: params.questionTypes,
            bloomsLevel: params.bloomsLevel,
        };

        if (!generationParams.topic.trim() || !generationParams.questionTypes.trim()) {
            setError("Topic and Question Description cannot be empty.");
            setIsLoading(false);
            return;
        }

        try {
            const questions = await dispatchGenerateTest(generationParams, settings);
            setStagedQuestions(questions);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during test generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); handleGenerate(); };
    
    const handleUpdateStagedQuestion = useCallback((updatedQuestion: TrainingQuestion) => {
        setStagedQuestions(currentStaged =>
            currentStaged ? currentStaged.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q)) : null
        );
    }, []);

    const handleDeleteStagedQuestion = useCallback((questionId: string) => {
        setStagedQuestions(currentStaged =>
            currentStaged ? currentStaged.filter(q => q.id !== questionId) : null
        );
    }, []);

    const handleDiscardStaged = useCallback(() => {
        setStagedQuestions(null);
        setSuccessMessage(null);
    }, []);
    
    const handleSaveCustomQuestion = useCallback((newQuestionData: { question: string, answer: string, imageData?: string }) => {
        if (!stagedQuestions) return;

        const newTrainingQuestion: TrainingQuestion = {
            id: crypto.randomUUID(),
            question: newQuestionData.question,
            answer: newQuestionData.answer,
            imageData: newQuestionData.imageData,
            curriculum: params.curriculum,
            grade: params.grade,
            subject: params.subject,
            standard: `${params.grade} - ${params.subject} - Custom Question`,
        };
        setStagedQuestions(current => [...(current || []), newTrainingQuestion]);
        setIsAddModalOpen(false);
    }, [stagedQuestions, params]);

    const handleSaveExam = useCallback(async () => {
        if (!stagedQuestions || stagedQuestions.length === 0) return;
    
        const examName = `${params.topic} (${params.subject} | ${params.grade})`;
        if (!examName || examName.trim() === '') {
            setError("Exam title/topic cannot be empty to save.");
            return; 
        }
    
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
    
        const newSavedExam: SavedExam = {
            id: crypto.randomUUID(),
            userId: user.sub,
            name: examName,
            params: params,
            questions: stagedQuestions,
            createdAt: Date.now()
        };
        
        const recordsToSave: Omit<DbRecord, 'id'>[] = stagedQuestions.map(q => ({
            question: q.question,
            answer: q.answer,
            curriculum: q.curriculum,
            standard: q.standard,
            grade: q.grade,
            subject: q.subject,
            imageData: q.imageData,
            createdAt: Date.now(),
            sourceId: newSavedExam.id,
        }));
    
        try {
            await db.transaction('rw', db.savedExams, db.trainingData, async () => {
                await db.savedExams.add(newSavedExam);
                if (recordsToSave.length > 0) {
                    await db.trainingData.bulkAdd(recordsToSave);
                }
            });
            
            setSuccessMessage(`Exam "${examName}" saved successfully.`);
        } catch (err) {
            console.error('Failed to save exam:', err);
            setError(err instanceof Error ? `Failed to save: ${err.message}` : 'Could not save the exam.');
        } finally {
            setIsSaving(false);
        }
    }, [stagedQuestions, params, user.sub]);

    return (
        <main className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-md">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                 {successMessage && !isSaving && (
                    <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg shadow-md">
                        <p className="text-sm text-emerald-700">{successMessage}</p>
                    </div>
                )}
                
                {stagedQuestions === null ? (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-chalk-black mb-2 font-poppins">Exam Generator</h2>
                            <p className="text-stone-600">Generate a print-ready exam with a professional cover page and layout.</p>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-slate-800 mb-3">Cover Page Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input label="Test Type" name="testType" value={params.testType} onChange={handleInputChange} placeholder="e.g., Baseline Test" required />
                                <Input label="Total Marks" name="totalMarks" value={params.totalMarks} onChange={handleInputChange} placeholder="e.g., 50" required />
                                <Input label="Time Limit" name="timeLimit" value={params.timeLimit} onChange={handleInputChange} placeholder="e.g., 1 Hour" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Curriculum" name="curriculum" value={params.curriculum} onChange={handleInputChange} options={CURRICULUM_OPTS_FOR_SELECT} required />
                            <Select label="Grade" name="grade" value={params.grade} onChange={handleInputChange} options={GRADES_OPTIONS} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Subject" name="subject" value={params.subject} onChange={handleInputChange} options={COMPREHENSIVE_SUBJECT_OPTIONS} required />
                            <Input label="Topic / Exam Title" name="topic" value={params.topic} onChange={handleInputChange} placeholder="e.g., Algebraic Expressions" required />
                        </div>
                        <TextArea label="Question Description" name="questionTypes" value={params.questionTypes} onChange={handleInputChange} placeholder={`e.g., "${QUESTION_TYPE_SUGGESTIONS[0]}"`} required rows={3} helperText="Describe the number and types of questions to generate." />
                        <Select label="Bloom's Taxonomy Level Focus" name="bloomsLevel" value={params.bloomsLevel} onChange={handleInputChange} options={BLOOMS_LEVEL_OPTIONS} required />
                        
                        <div className="pt-2 flex flex-wrap gap-3">
                            <Button type="submit" isLoading={isLoading} disabled={isLoading} size="lg">
                                {isLoading ? 'Generating Questions...' : 'Generate Questions'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                    <StagingArea
                        questions={stagedQuestions}
                        formalParams={params}
                        onUpdate={handleUpdateStagedQuestion}
                        onDelete={handleDeleteStagedQuestion}
                        onDiscard={handleDiscardStaged}
                        onSave={handleSaveExam}
                        onAddCustomQuestion={() => setIsAddModalOpen(true)}
                        isSaving={isSaving}
                    />
                    <AddCustomQuestionModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSave={handleSaveCustomQuestion}
                    />
                    </>
                )}
            </div>
        </main>
    );
};