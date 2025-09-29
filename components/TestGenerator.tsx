import React, { useState, useCallback, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { generateTest as dispatchGenerateTest } from '../services/aiDispatchService';
import { db } from '../db';
import type { TestGenerationParams, TrainingQuestion, DbRecord, SavedTest, UserProfile } from '../types';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, COMPREHENSIVE_SUBJECT_OPTIONS, BLOOMS_LEVEL_OPTIONS, QUESTION_TYPE_SUGGESTIONS, TEST_STRUCTURE_PRESETS, SUBJECT_TOPIC_SUGGESTIONS } from '../constants';
import { useLanguage } from '../i18n/LanguageContext';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import { EditableQuestionCard } from './EditableQuestionCard';
import { Loader } from './Loader';
import { CheckIcon, XMarkIcon, BookmarkSquareIcon, DocumentPlusIcon, UploadIcon } from './Icons';
import { FormattedText } from './FormattedText';

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
            const base64 = await readFileAsBase64(file);
            setImageData(base64);
            setImageName(file.name);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to process image.");
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
                    <h2 className="text-lg font-semibold text-brand-navy">Add Custom Question</h2>
                 </div>
                 <div className="p-6 space-y-4 overflow-y-auto">
                     {error && <p className="text-sm text-red-600">{error}</p>}
                     <TextArea label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
                     <TextArea label="Answer / Memo" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
                     <div>
                        <label className="block text-sm font-medium text-brand-dark-grey mb-1">Image (Optional)</label>
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
    onUpdate: (q: TrainingQuestion) => void;
    onDelete: (id: string) => void;
    onSaveAndCommit: () => void;
    onDiscard: () => void;
    onAddCustomQuestion: () => void;
    isSaving: boolean;
}> = ({ questions, onUpdate, onDelete, onSaveAndCommit, onDiscard, onAddCustomQuestion, isSaving }) => {
    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-brand-navy">Review & Commit Questions</h2>
                    <p className="text-sm text-slate-600">Edit generated questions or add your own before saving.</p>
                </div>
                <Button onClick={onAddCustomQuestion} variant="secondary" size="sm">
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
                        <p className="text-sm text-slate-400 mt-1">You can discard these results to try again.</p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <Button
                    onClick={onSaveAndCommit}
                    isLoading={isSaving}
                    disabled={isSaving || questions.length === 0}
                    className="flex-grow"
                    size="lg"
                >
                    <BookmarkSquareIcon className="h-5 w-5 mr-2" />
                    Save Test & Commit
                </Button>
                <Button
                    onClick={onDiscard}
                    disabled={isSaving}
                    variant="ghost"
                    className="ml-auto"
                >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Discard
                </Button>
            </div>
        </div>
    );
};


export const TestGenerator: React.FC<{ user: UserProfile, loadId: string | null; onDidLoad: () => void; }> = ({ user, loadId, onDidLoad }) => {
    const { t } = useLanguage();
    const { settings } = useAIProviderSettings();
    const [params, setParams] = useState<TestGenerationParams>({
        grade: GRADES_OPTIONS[6].value,
        subject: COMPREHENSIVE_SUBJECT_OPTIONS.find(s => s.value === "Mathematics (Senior Phase)")?.value || COMPREHENSIVE_SUBJECT_OPTIONS[0].value,
        topic: SUBJECT_TOPIC_SUGGESTIONS.Default[0],
        curriculum: 'CAPS',
        questionTypes: QUESTION_TYPE_SUGGESTIONS[0],
        bloomsLevel: BLOOMS_LEVEL_OPTIONS[6].value,
    });
    
    const [stagedQuestions, setStagedQuestions] = useState<TrainingQuestion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSavedTestMessage, setLastSavedTestMessage] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);


    useEffect(() => {
        const suggestions = SUBJECT_TOPIC_SUGGESTIONS.Default || [];
        setTopicSuggestions(suggestions);
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'subject') {
            // When the subject changes, we also potentially reset the topic.
            setParams(prev => {
                const suggestions = SUBJECT_TOPIC_SUGGESTIONS.Default || [];
                // If the user had a custom topic, reset to the first suggestion. Otherwise, keep it.
                const topic = suggestions.includes(prev.topic) ? prev.topic : (suggestions[0] || '');
                return { ...prev, subject: value, topic };
            });
        } else {
            // For all other inputs, just update the value.
            setParams(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleGenerate = async () => {
        setError(null);
        setLastSavedTestMessage(null);
        setIsLoading(true);

        const effectiveTopic = params.topic === "ALL (Comprehensive)"
            ? t('testGenerator.topic.comprehensiveCoverage', { subject: params.subject, fallback: `Comprehensive coverage of the entire subject: ${params.subject}`})
            : params.topic;
            
        const currentParamsForGeneration: TestGenerationParams = { ...params, topic: effectiveTopic };

        if (!currentParamsForGeneration.topic.trim() || !currentParamsForGeneration.questionTypes.trim()) {
            setError(t('testGenerator.errors.emptyFields', { fallback: "Topic and Question Types description cannot be empty."}));
            setIsLoading(false);
            return;
        }

        try {
            const questions = await dispatchGenerateTest(currentParamsForGeneration, settings);
            setStagedQuestions(questions);
        } catch (err: any) {
            setError(err.message || t('testGenerator.errors.unexpectedGenerationError', { fallback: 'An unexpected error occurred during test generation.'}));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); handleGenerate(); };
    
    // --- Staging Area Handlers ---
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
        setLastSavedTestMessage(null);
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

    const handleSaveAndCommitTest = useCallback(async () => {
        if (!stagedQuestions || stagedQuestions.length === 0) return;
    
        const testName = window.prompt("Enter a name for this test:", `${params.subject} - ${params.topic}`);
        if (!testName || testName.trim() === '') {
            return; // User cancelled or entered empty name
        }
    
        setIsSaving(true);
        setError(null);
        setLastSavedTestMessage(null);
    
        const newSavedTest: SavedTest = {
            id: crypto.randomUUID(),
            userId: user.sub,
            name: testName,
            params: params,
            questions: stagedQuestions,
            createdAt: Date.now(),
            syncStatus: 'dirty'
        };
        
        const recordsToSave: DbRecord[] = stagedQuestions.map(q => ({
            question: q.question,
            answer: q.answer,
            curriculum: q.curriculum,
            standard: q.standard,
            grade: q.grade,
            subject: q.subject,
            imageData: q.imageData,
            createdAt: Date.now(),
            sourceId: newSavedTest.id,
            syncStatus: 'dirty'
        }));
    
        try {
            await db.transaction('rw', db.savedTests, db.trainingData, async () => {
                await db.savedTests.put(newSavedTest);
                await db.trainingData.where({ sourceId: newSavedTest.id }).delete();
                await db.trainingData.bulkAdd(recordsToSave);
            });
            
            setStagedQuestions(null); // Reset after saving
            setLastSavedTestMessage(`Test "${testName}" saved locally. It will be synced with the server shortly.`);
        } catch (err) {
            console.error('Failed to save test locally:', err);
            setError(err instanceof Error ? `Failed to save: ${err.message}` : 'Could not save the test locally.');
        } finally {
            setIsSaving(false);
        }
    }, [stagedQuestions, params, user.sub]);

    const handlePresetSelect = (presetValue: string) => setParams(prev => ({ ...prev, questionTypes: presetValue }));
    const handleTopicSuggestionClick = (topic: string) => setParams(prev => ({ ...prev, topic: topic }));
    
    const translatedBloomsOptions = BLOOMS_LEVEL_OPTIONS.map(opt => ({...opt, label: t(`blooms.${opt.value.toLowerCase()}`, {fallback: opt.label})}));

    return (
        <main className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-md">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                {lastSavedTestMessage && !error && (
                     <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-lg shadow-md">
                        <p className="text-sm text-emerald-700">{lastSavedTestMessage}</p>
                    </div>
                )}
                
                {stagedQuestions === null ? (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-brand-navy mb-2">{t('feature.testGenerator', { fallback: "Test Generator"})}</h2>
                            <p className="text-slate-600">{t('testGenerator.subtitle', { fallback: `Craft customized training data for your models.`})}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label={t('testGenerator.form.curriculumLabel', { fallback: "Curriculum"})} name="curriculum" value={params.curriculum} onChange={handleInputChange} options={CURRICULUM_OPTS_FOR_SELECT} required />
                            <Select label={t('testGenerator.form.gradeLabel', { fallback: "Grade"})} name="grade" value={params.grade} onChange={handleInputChange} options={GRADES_OPTIONS} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label={t('testGenerator.form.subjectLabel', { fallback: "Subject"})} name="subject" value={params.subject} onChange={handleInputChange} options={COMPREHENSIVE_SUBJECT_OPTIONS} required />
                            <div>
                                <Input label={t('testGenerator.form.topicLabel', { fallback: "Topic(s)"})} name="topic" value={params.topic} onChange={handleInputChange} placeholder={t('testGenerator.form.topicPlaceholder', { fallback: "e.g., Photosynthesis or select a suggestion"})} required />
                                {topicSuggestions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {topicSuggestions.map(suggestion => (
                                            <Button key={suggestion} type="button" variant="ghost" size="sm" onClick={() => handleTopicSuggestionClick(suggestion)} className={`border border-green-200 hover:bg-green-50 ${params.topic === suggestion ? 'bg-green-100 text-green-800' : 'text-slate-600'}`}>{suggestion}</Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-dark-grey mb-1">{t('testGenerator.form.presetsLabel', { fallback: "Test Structure Presets (Optional)"})}</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {TEST_STRUCTURE_PRESETS.map(preset => (
                                    <Button key={preset.label} type="button" variant="secondary" size="sm" onClick={() => handlePresetSelect(preset.value)}>
                                        {t(`testGenerator.presets.${preset.label.replace(/[^a-zA-Z0-9]/g, '')}`, { fallback: preset.label })}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <TextArea label={t('testGenerator.form.questionTypesLabel', { fallback: "Question Types & Structure"})} name="questionTypes" value={params.questionTypes} onChange={handleInputChange} placeholder={t('testGenerator.form.questionTypesPlaceholder', { example: QUESTION_TYPE_SUGGESTIONS[1], fallback: `e.g., "${QUESTION_TYPE_SUGGESTIONS[1]}"`})} required rows={4} helperText={t('testGenerator.form.questionTypesHelper', { fallback: "Describe types, number of questions, total marks. Use a preset or type your own."})} />
                        <Select label={t('testGenerator.form.bloomsLevelLabel', { fallback: "Bloom's Taxonomy Level Focus"})} name="bloomsLevel" value={params.bloomsLevel} onChange={handleInputChange} options={translatedBloomsOptions} required />
                        
                        <div className="pt-2 flex flex-wrap gap-3">
                            <Button type="submit" isLoading={isLoading} disabled={isLoading} size="lg" className="flex-grow md:flex-grow-0">
                                {isLoading ? t('testGenerator.buttons.generating', { fallback: 'Generating...'}) : t('testGenerator.buttons.generateTest', { fallback: 'Generate Data'})}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <>
                    <StagingArea
                        questions={stagedQuestions}
                        onUpdate={handleUpdateStagedQuestion}
                        onDelete={handleDeleteStagedQuestion}
                        onSaveAndCommit={handleSaveAndCommitTest}
                        onDiscard={handleDiscardStaged}
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