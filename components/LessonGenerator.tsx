import React, { useState, useCallback, ChangeEvent, FormEvent, useEffect } from 'react';
import Dexie from 'dexie';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { generateLesson as dispatchGenerateLesson } from '../services/aiDispatchService';
import { db } from '../db';
import { resolveImageAsset } from '../utils/imageAssetService';
import type { LessonGenerationParams, LessonPlan, ImagePlaceholder, UserProfile, DbRecord, ImageLibraryRecord } from '../types';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, COMPREHENSIVE_SUBJECT_OPTIONS, BLOOMS_LEVEL_OPTIONS } from '../constants';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import { Loader } from './Loader';
import { ImagePlaceholderCard } from './ImagePlaceholderCard';
import { BookOpenIcon, FolderOpenIcon, TrashIcon } from './Icons';
import { LessonPlanCard } from './LessonPlanCard';


interface GeneratedLesson {
    lessonPlan: LessonPlan;
    placeholders: ImagePlaceholder[];
}

const ResultsView: React.FC<{
    data: GeneratedLesson;
    onImageUpload: (placeholderId: string, imageData: string, status: "pending" | "generating" | "uploaded") => void;
    onSave: () => Promise<void>;
    onDiscard: () => void;
}> = ({ data, onImageUpload, onSave, onDiscard }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave();
        setIsSaving(false);
    }
    
    const { lessonPlan, placeholders } = data;

    return (
        <div className="mt-6">
            <h2 className="text-xl font-bold text-chalk-black mb-4">{lessonPlan.name}</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lesson Plan Column */}
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Lesson Plan Content</h3>
                    <LessonPlanCard 
                        lessonPlan={lessonPlan}
                        placeholders={placeholders}
                        onImageUpload={onImageUpload}
                    />
                </div>
                {/* Image Placeholders Column */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2">Images Needed</h3>
                     {placeholders.length > 0 ? (
                        <div className="space-y-4">
                            {placeholders.map(p => 
                                <ImagePlaceholderCard 
                                    key={p.id} 
                                    placeholder={p}
                                    onImageUpload={onImageUpload}
                                    subject={lessonPlan.params.subject}
                                    topic={lessonPlan.params.topic}
                                />
                            )}
                        </div>
                    ) : <p className="text-slate-500">The AI did not request any images for this lesson.</p>}
                </div>
            </div>

            <div className="mt-8 flex justify-end items-center gap-4 border-t pt-6">
                <Button onClick={onDiscard} variant="ghost" size="md">Discard</Button>
                <Button onClick={handleSave} isLoading={isSaving} size="lg">Save Lesson Plan</Button>
            </div>
        </div>
    );
};


interface LessonGeneratorProps {
    user: UserProfile;
    loadId: string | null;
    onDidLoad: () => void;
}

export const LessonGenerator: React.FC<LessonGeneratorProps> = ({ user, loadId, onDidLoad }) => {
    const { settings } = useAIProviderSettings();
    const [params, setParams] = useState<LessonGenerationParams>({
        grade: GRADES_OPTIONS[6].value,
        subject: COMPREHENSIVE_SUBJECT_OPTIONS.find(s => s.value === "Life Sciences (FET)")?.value || COMPREHENSIVE_SUBJECT_OPTIONS[0].value,
        topic: 'The Water Cycle',
        curriculum: 'CAPS',
        questionTypes: 'A standard lesson plan covering the key stages of the water cycle: evaporation, condensation, precipitation, and collection.', // Re-used field
        bloomsLevel: BLOOMS_LEVEL_OPTIONS[1].value,
        duration: '1 hour',
    });
    
    const [generatedData, setGeneratedData] = useState<GeneratedLesson | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [savedLessons, setSavedLessons] = useState<LessonPlan[] | undefined>();

    useEffect(() => {
        const fetchLessons = async () => {
            if (!user || !user.sub) return;
            const lessons = await db.lessonPlans.where({ userId: user.sub }).toArray();
            setSavedLessons(lessons.sort((a, b) => b.createdAt - a.createdAt));
        };

        Dexie.on('storagemutated', fetchLessons);
        fetchLessons(); // Initial fetch

        return () => {
            Dexie.on('storagemutated').unsubscribe(fetchLessons);
        };
    }, [user.sub]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = async () => {
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            const result = await dispatchGenerateLesson(params, settings);
            setGeneratedData(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during lesson generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscard = useCallback(() => {
        setGeneratedData(null);
        setSuccessMessage(null);
        setError(null);
    }, []);

    const handleImageUpdate = useCallback((placeholderId: string, imageData: string, status: ImagePlaceholder['status'], imageAssetId?: string) => {
        setGeneratedData(currentData => {
            if (!currentData) return null;

            const updatedPlaceholders = currentData.placeholders.map(p =>
                p.id === placeholderId ? { ...p, imageData, imageAssetId, status } : p
            );

            return { ...currentData, placeholders: updatedPlaceholders };
        });
    }, []);

    const handleSaveLesson = useCallback(async () => {
        if (!generatedData) return;
        const { lessonPlan, placeholders } = generatedData;

        const lessonPlanToSave: LessonPlan = {
            ...lessonPlan,
            userId: user.sub,
            syncStatus: 'dirty'
        };

        const placeholdersToSave: ImagePlaceholder[] = placeholders.map(p => {
            const { imageData, ...rest } = p;
            return {
                ...rest,
                // Keep legacy inline data only when no canonical asset exists.
                ...(p.imageAssetId ? {} : { imageData }),
                syncStatus: 'dirty'
            };
        });

        try {
            await db.transaction('rw', db.lessonPlans, db.imagePlaceholders, db.trainingData, async () => {
                await db.lessonPlans.put(lessonPlanToSave);

                // We assume placeholders are always saved with the lesson, so we can overwrite.
                await db.imagePlaceholders.where({ presentationId: lessonPlan.id }).delete();
                if (placeholdersToSave.length > 0) {
                    await db.imagePlaceholders.bulkPut(placeholdersToSave);
                }

                // Questions are linked to the lesson, so we handle them similarly.
                if (lessonPlan.questions.length > 0) {
                    // First, remove old questions associated with this lesson to avoid duplicates.
                    await db.trainingData.where({ sourceId: lessonPlan.id }).delete();

                    const recordsToSave: DbRecord[] = lessonPlan.questions.map(q => ({
                        // id is auto-incremented by Dexie
                        question: q.question,
                        answer: q.answer,
                        curriculum: q.curriculum,
                        standard: q.standard,
                        grade: q.grade,
                        subject: q.subject,
                        createdAt: Date.now(),
                        sourceId: lessonPlan.id,
                        ...(q.imageAssetId ? { imageAssetId: q.imageAssetId } : { imageData: q.imageData }),
                        syncStatus: 'dirty',
                    }));
                    await db.trainingData.bulkAdd(recordsToSave);
                }
            });
            setSuccessMessage(`Lesson "${lessonPlan.name}" saved locally. It will be synced with the server shortly.`);
            setGeneratedData(null);
        } catch (err) {
            console.error('Failed to save lesson locally:', err);
            setError(err instanceof Error ? err.message : 'Failed to save lesson plan locally.');
        }
    }, [generatedData, user.sub]);

    const handleLoadLesson = useCallback(async (lessonId: string) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const lessonPlan = await db.lessonPlans.get(lessonId);
            const storedPlaceholders = await db.imagePlaceholders.where({ presentationId: lessonId }).toArray();
            const placeholders = await Promise.all(storedPlaceholders.map(async placeholder => ({
                ...placeholder,
                imageData: await resolveImageAsset(placeholder.imageAssetId, placeholder.imageData),
                status: placeholder.imageAssetId || placeholder.imageData ? 'uploaded' as const : placeholder.status,
            })));

            if (!lessonPlan || lessonPlan.userId !== user.sub) {
                throw new Error("Could not find the lesson plan or access is denied.");
            }
            
            setGeneratedData({ lessonPlan, placeholders });
            setParams(lessonPlan.params);

        } catch(e) {
            setError(e instanceof Error ? e.message : "Failed to load lesson.");
        } finally {
            setIsLoading(false);
        }
    }, [user.sub]);

    useEffect(() => {
        if (loadId) {
            handleLoadLesson(loadId);
            onDidLoad();
        }
    }, [loadId, onDidLoad, handleLoadLesson]);
    
    const handleDeleteLesson = useCallback(async (lessonId: string) => {
        if(window.confirm("Are you sure you want to permanently delete this lesson plan?")){
            try {
                await db.transaction('rw', db.lessonPlans, db.imagePlaceholders, db.trainingData, async () => {
                    const lesson = await db.lessonPlans.get(lessonId);
                    if (lesson && lesson.userId === user.sub) {
                        await db.lessonPlans.delete(lessonId);
                        await db.imagePlaceholders.where({ presentationId: lessonId }).delete();
                        await db.trainingData.where({ sourceId: lessonId }).delete();
                    }
                });
            } catch(e) {
                setError(e instanceof Error ? e.message : "Failed to delete lesson.");
            }
        }
    }, [user.sub]);
    
    const translatedBloomsOptions = BLOOMS_LEVEL_OPTIONS.map(opt => ({...opt, label: opt.label}));

    return (
        <main className="min-h-full bg-brand-paper">
            <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
                <section className="mb-8 border-b border-slate-200 pb-8">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">SmartChalk generator</p>
                    <h1 className="text-3xl font-black tracking-tight text-brand-black sm:text-4xl">Lesson Plan Generator</h1>
                    <p className="mt-3 max-w-2xl text-base text-slate-600">Design comprehensive lesson plans complete with objectives, activities, and image placeholders.</p>
                </section>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    {error && (
                        <div role="alert" className="mb-6 rounded-xl border border-slate-300 bg-brand-paper p-4">
                            <p className="text-sm font-semibold text-brand-black">{error}</p>
                        </div>
                    )}
                    {successMessage && !error && (
                        <div role="status" className="mb-6 rounded-xl border border-brand-yellow bg-brand-paper p-4">
                            <p className="text-sm font-semibold text-brand-black">{successMessage}</p>
                        </div>
                    )}

                {!generatedData ? (
                    <>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate() }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Curriculum" name="curriculum" value={params.curriculum} onChange={handleInputChange} options={CURRICULUM_OPTS_FOR_SELECT} required />
                            <Select label="Grade" name="grade" value={params.grade} onChange={handleInputChange} options={GRADES_OPTIONS} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Subject" name="subject" value={params.subject} onChange={handleInputChange} options={COMPREHENSIVE_SUBJECT_OPTIONS} required />
                            <Input label="Topic" name="topic" value={params.topic} onChange={handleInputChange} placeholder="e.g., The Water Cycle" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Select 
                                label="Lesson Duration"
                                name="duration"
                                value={params.duration}
                                onChange={handleInputChange}
                                options={[{value: '30 minutes', label: '30 Minutes'}, {value: '1 hour', label: '1 Hour'}]}
                                required 
                            />
                            <Select label="Bloom's Taxonomy Level Focus" name="bloomsLevel" value={params.bloomsLevel} onChange={handleInputChange} options={translatedBloomsOptions} required />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-start gap-4">
                            <Button type="submit" isLoading={isLoading} disabled={isLoading} size="lg">
                                {isLoading ? 'Generating Lesson...' : 'Generate Lesson Plan'}
                            </Button>
                        </div>
                    </form>

                     {savedLessons && savedLessons.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-slate-200">
                             <h3 className="text-lg font-semibold text-brand-black mb-3">My Saved Lesson Plans</h3>
                             <div className="space-y-3">
                                {savedLessons.map(p => (
                                    <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-brand-paper p-4">
                                        <div>
                                            <p className="font-semibold text-brand-charcoal">{p.name}</p>
                                            <p className="text-xs text-slate-500">Created: {new Date(p.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleLoadLesson(p.id)} title="Load Lesson Plan" aria-label="Load Lesson Plan" className="rounded-lg border border-slate-300 p-2 text-brand-black transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"><FolderOpenIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDeleteLesson(p.id)} title="Delete Lesson Plan" aria-label="Delete Lesson Plan" className="rounded-lg border border-slate-300 p-2 text-brand-black transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-yellow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    </>
                ) : (
                    <ResultsView 
                        data={generatedData}
                        onImageUpload={handleImageUpdate}
                        onSave={handleSaveLesson}
                        onDiscard={handleDiscard}
                    />
                )}
                </div>
            </div>
        </main>
    );
};