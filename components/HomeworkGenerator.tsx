import React, { useState, useCallback, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { generateHomework as dispatchGenerateHomework } from '../services/aiDispatchService';
import { db } from '../db';
import type { TestGenerationParams, TrainingQuestion, UserProfile, SavedTest, DbRecord, SavedHomework, HomeworkGenerationParams, Presentation, LessonPlan, ContentType } from '../types';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, COMPREHENSIVE_SUBJECT_OPTIONS, BLOOMS_LEVEL_OPTIONS, QUESTION_TYPE_SUGGESTIONS } from '../constants';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import { EditableQuestionCard } from './EditableQuestionCard';
import { exportHomeworkAsDocx } from '../utils/exportService';
import { XMarkIcon, DocumentArrowDownIcon, BookmarkSquareIcon, DocumentPlusIcon, UploadIcon } from './Icons';
import { CurriculumSourcePanel } from './CurriculumSourcePanel';

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
            formData.append('folder', 'homework');
            
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/80 p-4">
            <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                 <div className="border-b border-slate-200 p-5">
                    <h2 className="text-lg font-semibold text-brand-black">Add Custom Question</h2>
                 </div>
                 <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-brand-paper p-5">
                     {error && <p role="alert" className="rounded-lg border border-slate-300 bg-brand-paper p-3 text-sm font-semibold text-brand-black">{error}</p>}
                     <TextArea label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
                     <TextArea label="Answer / Memo" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
                     <div>
                        <label className="block text-sm font-medium text-brand-charcoal mb-1">Image (Optional)</label>
                        <div className="flex items-center gap-4">
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" disabled={isProcessing}>
                                <UploadIcon className="h-4 w-4 mr-2" />
                                {isProcessing ? 'Processing...' : 'Upload Image'}
                            </Button>
                            {imageName && <span className="text-sm text-slate-600">{imageName}</span>}
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        {imageData && <img src={imageData} className="mt-4 max-h-48 rounded-xl border border-slate-300 bg-white p-2" alt="Preview" />}
                     </div>
                 </div>
                 <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
                    <Button onClick={handleClose} variant="ghost">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">Save Question</Button>
                 </div>
            </div>
        </div>
    )
};

const StagingArea: React.FC<{
    questions: TrainingQuestion[];
    homework: SavedHomework;
    onUpdate: (q: TrainingQuestion) => void;
    onDelete: (id: string) => void;
    onDiscard: () => void;
    onSave: () => void;
    onAddCustomQuestion: () => void;
    isSaving: boolean;
}> = ({ questions, homework, onUpdate, onDelete, onDiscard, onSave, onAddCustomQuestion, isSaving }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (type: 'questions' | 'memo') => {
        setIsExporting(true);
        try {
            await exportHomeworkAsDocx(homework, type);
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? `Export failed: ${err.message}` : 'An unknown error occurred during DOCX export.');
        } finally {
            setIsExporting(false);
        }
    };
    
    const isBusy = isExporting || isSaving;

    return (
        <div className="mt-6">
            <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-brand-black">Review Homework Questions</h2>
                    <p className="text-sm text-slate-500">Edit questions before saving or exporting the homework sheet.</p>
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
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-brand-paper px-4 py-12 text-center">
                        <p className="text-slate-500 font-medium">No questions were generated.</p>
                        <p className="text-sm text-slate-400 mt-1">You can add custom questions or discard and try again.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={onSave} isLoading={isSaving} disabled={isBusy || questions.length === 0} size="lg">
                    <BookmarkSquareIcon className="h-5 w-5 mr-2" />
                    Save Homework
                </Button>
                <Button onClick={() => handleExport('questions')} isLoading={isExporting} disabled={isBusy || questions.length === 0} size="lg" variant="secondary">
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Export Homework DOCX
                </Button>
                <Button onClick={() => handleExport('memo')} isLoading={isExporting} disabled={isBusy || questions.length === 0} size="lg" variant="secondary">
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Export Memorandum DOCX
                </Button>
                <Button onClick={onDiscard} disabled={isBusy} variant="ghost" className="md:col-span-2 md:col-start-1">
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Discard & Start Over
                </Button>
            </div>
        </div>
    );
};


export const HomeworkGenerator: React.FC<{ user: UserProfile, loadId: string | null; loadType: ContentType | null, onDidLoad: () => void; }> = ({ user, loadId, loadType, onDidLoad }) => {
    const { settings } = useAIProviderSettings();
    const [params, setParams] = useState<HomeworkGenerationParams>({
        grade: GRADES_OPTIONS[7].value,
        subject: COMPREHENSIVE_SUBJECT_OPTIONS[0].value,
        topic: 'New Homework Sheet',
        curriculum: 'CAPS',
        bloomsLevel: BLOOMS_LEVEL_OPTIONS[6].value,
        questionTypes: '5 questions that review the key concepts of the topic.',
        instructions: 'Complete the following questions to the best of your ability. Show all your work where applicable.'
    });
    
    const [stagedQuestions, setStagedQuestions] = useState<TrainingQuestion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [sourceContent, setSourceContent] = useState<{type: string, name: string, content: string | TrainingQuestion[]} | null>(null);


    const handleLoadContent = useCallback(async (type: ContentType, id: string) => {
        setIsLoading(true);
        setError(null);
        setSourceContent(null);
        try {
            let loadedParams: TestGenerationParams;
            let source: {type: string, name: string, content: string | TrainingQuestion[]};

            if (type === 'test') {
                const item = await db.savedTests.get(id);
                if (!item || (item.userId && item.userId !== user.sub)) throw new Error("Could not find the specified test or access is denied.");
                if (!item.userId) {
                    item.userId = user.sub;
                    await db.savedTests.put(item);
                }
                loadedParams = item.params;
                source = { type: 'Test', name: item.name, content: item.questions };
            } else if (type === 'lesson') {
                const item = await db.lessonPlans.get(id);
                if (!item || (item.userId && item.userId !== user.sub)) throw new Error("Could not find the specified lesson plan or access is denied.");
                if (!item.userId) {
                    item.userId = user.sub;
                    await db.lessonPlans.put(item);
                }
                loadedParams = item.params;
                source = { type: 'Lesson Plan', name: item.name, content: item.content };
            } else if (type === 'presentation') {
                const item = await db.presentations.get(id);
                if (!item || (item.userId && item.userId !== user.sub)) throw new Error("Could not find the specified presentation or access is denied.");
                if (!item.userId) {
                    item.userId = user.sub;
                    await db.presentations.put(item);
                }
                loadedParams = item.params;
                const slides = await db.slides.where({ presentationId: id }).toArray();
                source = { type: 'Presentation', name: item.name, content: slides.map(s => `Slide ${s.slideNumber}: ${s.title}\n${s.content}`).join('\n\n')};
            } else if (type === 'homework') {
                const item = await db.savedHomework.get(id);
                if (!item || item.userId !== user.sub) throw new Error("Could not find homework or access is denied.");
                setParams(item.params);
                setStagedQuestions(item.questions);
                return; // Exit early as we have loaded a complete homework
            } else {
                throw new Error("Unsupported content type for creating homework.");
            }

            setParams({
                ...loadedParams,
                topic: `Homework for: ${loadedParams.topic}`,
                questionTypes: `5-7 questions that test the key concepts from the source material.`,
                instructions: 'Complete the following questions based on the material provided in class.'
            });
            setSourceContent(source);
            setStagedQuestions(null);

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

        if (!params.topic.trim() || !params.questionTypes.trim()) {
            setError("Topic and Question Description cannot be empty.");
            setIsLoading(false);
            return;
        }

        try {
            const questions = await dispatchGenerateHomework(params, settings, sourceContent ?? undefined, user.sub);
            setStagedQuestions(questions);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during homework generation.');
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

    const handleSaveHomework = useCallback(async () => {
        if (!stagedQuestions) return;
    
        const homeworkName = `${params.topic} (${params.subject} | ${params.grade})`;
        if (!homeworkName || homeworkName.trim() === '') {
            setError("Homework title/topic cannot be empty to save.");
            return; 
        }
    
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
    
        const newSavedHomework: SavedHomework = {
            id: crypto.randomUUID(),
            userId: user.sub,
            name: homeworkName,
            params: params,
            questions: stagedQuestions,
            curriculumEvidence: stagedQuestions[0]?.curriculumEvidence,
            createdAt: Date.now(),
            syncStatus: 'dirty'
        };
        
        try {
            await db.savedHomework.put(newSavedHomework);
            setSuccessMessage(`Homework "${homeworkName}" saved locally. It will be synced with the server shortly.`);
        } catch (err) {
            console.error('Failed to save homework locally:', err);
            setError(err instanceof Error ? `Failed to save: ${err.message}` : 'Could not save the homework locally.');
        } finally {
            setIsSaving(false);
        }
    }, [stagedQuestions, params, user.sub]);
    
    const fullHomeworkForExport: SavedHomework | null = stagedQuestions ? {
        id: 'temp-export',
        userId: user.sub,
        name: params.topic,
        params,
        questions: stagedQuestions,
        createdAt: Date.now(),
    } : null;

    return (
        <main className="min-h-full bg-brand-paper">
            <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
                <section className="mb-8 border-b border-slate-200 pb-8">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">SmartChalk generator</p>
                    <h1 className="text-3xl font-black tracking-tight text-brand-black sm:text-4xl">Homework Generator</h1>
                    <p className="mt-3 max-w-2xl text-base text-slate-600">Generate a new homework sheet from scratch or based on existing content.</p>
                </section>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    {error && (
                        <div role="alert" className="mb-6 rounded-xl border border-slate-300 bg-brand-paper p-4">
                            <p className="text-sm font-semibold text-brand-black">{error}</p>
                        </div>
                    )}
                    {successMessage && !isSaving && (
                        <div role="status" className="mb-6 rounded-xl border border-brand-yellow bg-brand-paper p-4">
                            <p className="text-sm font-semibold text-brand-black">{successMessage}</p>
                        </div>
                    )}
                    
                    {stagedQuestions === null ? (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        
                        {sourceContent && (
                             <div className="rounded-xl border border-brand-yellow bg-brand-paper p-4">
                                <h3 className="mb-1 font-semibold text-brand-black">Source content loaded</h3>
                                <p className="text-sm text-brand-black">Generating homework based on the {sourceContent.type}: <strong>{sourceContent.name}</strong></p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Curriculum" name="curriculum" value={params.curriculum} onChange={handleInputChange} options={CURRICULUM_OPTS_FOR_SELECT} required />
                            <Select label="Grade" name="grade" value={params.grade} onChange={handleInputChange} options={GRADES_OPTIONS} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Subject" name="subject" value={params.subject} onChange={handleInputChange} options={COMPREHENSIVE_SUBJECT_OPTIONS} required />
                            <Input label="Topic / Homework Title" name="topic" value={params.topic} onChange={handleInputChange} placeholder="e.g., The Causes of World War I" required />
                        </div>
                        <TextArea label="Student Instructions" name="instructions" value={params.instructions} onChange={handleInputChange} rows={3} />
                        <TextArea label="Question Description" name="questionTypes" value={params.questionTypes} onChange={handleInputChange} placeholder={`e.g., "${QUESTION_TYPE_SUGGESTIONS[0]}"`} required rows={3} helperText="Describe the number and types of questions to generate." />
                        <Select label="Bloom's Taxonomy Level Focus" name="bloomsLevel" value={params.bloomsLevel} onChange={handleInputChange} options={BLOOMS_LEVEL_OPTIONS} required />
                        
                        <CurriculumSourcePanel params={params} user={user} />

                        <div className="pt-2 flex flex-wrap gap-3">
                            <Button type="submit" isLoading={isLoading} disabled={isLoading} size="lg">
                                {isLoading ? 'Generating Questions...' : 'Generate Questions'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                    {fullHomeworkForExport && (
                        <StagingArea
                            questions={stagedQuestions}
                            homework={fullHomeworkForExport}
                            onUpdate={handleUpdateStagedQuestion}
                            onDelete={handleDeleteStagedQuestion}
                            onDiscard={handleDiscardStaged}
                            onSave={handleSaveHomework}
                            onAddCustomQuestion={() => setIsAddModalOpen(true)}
                            isSaving={isSaving}
                        />
                    )}
                    <AddCustomQuestionModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSave={handleSaveCustomQuestion}
                    />
                    </>
                )}
                </div>
            </div>
        </main>
    );
};