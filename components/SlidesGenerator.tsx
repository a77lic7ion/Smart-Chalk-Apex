import React, { useState, useCallback, ChangeEvent, FormEvent, useEffect } from 'react';
import Dexie from 'dexie';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { generateSlides as dispatchGenerateSlides } from '../services/aiDispatchService';
import { db } from '../db';
import type { TestGenerationParams, Presentation, Slide, UserProfile } from '../types';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, COMPREHENSIVE_SUBJECT_OPTIONS, BLOOMS_LEVEL_OPTIONS, PRESENTATION_STRUCTURE_PRESETS } from '../constants';
import { useLanguage } from '../i18n/LanguageContext';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import { Loader } from './Loader';
import { SlideCard } from './SlideCard';
import { TrashIcon, FolderOpenIcon } from './Icons';
import { exportPresentationAsPptx } from '../utils/exportService';

interface GeneratedPresentation {
    presentation: Presentation;
    slides: Slide[];
}

interface SlidesGeneratorProps {
    user: UserProfile;
    loadId: string | null;
    onDidLoad: () => void;
}

export const SlidesGenerator: React.FC<SlidesGeneratorProps> = ({ user, loadId, onDidLoad }) => {
    const { t } = useLanguage();
    const { settings } = useAIProviderSettings();
    const [params, setParams] = useState<TestGenerationParams>({
        grade: GRADES_OPTIONS[6].value,
        subject: COMPREHENSIVE_SUBJECT_OPTIONS.find(s => s.value === "Life Sciences (FET)")?.value || COMPREHENSIVE_SUBJECT_OPTIONS[0].value,
        topic: 'Photosynthesis',
        curriculum: 'CAPS',
        questionTypes: 'A 10-slide presentation about Photosynthesis, covering the chemical equation, the light-dependent and light-independent reactions, and its importance for life on Earth.',
        bloomsLevel: BLOOMS_LEVEL_OPTIONS[6].value,
    });
    
    const [generatedData, setGeneratedData] = useState<GeneratedPresentation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [savedPresentations, setSavedPresentations] = useState<Presentation[] | undefined>();

    useEffect(() => {
        const fetchPresentations = async () => {
            if (!user || !user.sub) return;
            const presentations = await db.presentations.where({ userId: user.sub }).toArray();
            setSavedPresentations(presentations.sort((a, b) => b.createdAt - a.createdAt));
        };

        Dexie.on('storagemutated', fetchPresentations);
        fetchPresentations(); // Initial fetch

        return () => {
            Dexie.on('storagemutated').unsubscribe(fetchPresentations);
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
            const result = await dispatchGenerateSlides(params, settings);
            setGeneratedData(result);
        } catch (err: any) {
            setError(err.message || t('presentationGenerator.errors.unexpectedGenerationError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDiscard = useCallback(() => {
        setGeneratedData(null);
        setSuccessMessage(null);
        setError(null);
    }, []);

    const handleSavePresentation = useCallback(async () => {
        if (!generatedData) return;

        const presentationToSave: Presentation = {
            ...generatedData.presentation,
            userId: user.sub,
            syncStatus: 'dirty'
        };
        const slidesToSave: Slide[] = generatedData.slides.map(slide => ({
            ...slide,
            syncStatus: 'dirty'
        }));

        try {
            await db.transaction('rw', db.presentations, db.slides, async () => {
                await db.presentations.put(presentationToSave);
                await db.slides.where({ presentationId: presentationToSave.id }).delete();
                if (slidesToSave.length > 0) {
                    await db.slides.bulkPut(slidesToSave);
                }
            });
            setSuccessMessage(t('presentationGenerator.alerts.saveSuccess', {name: presentationToSave.name}));
            setGeneratedData(null);
        } catch (err) {
            console.error('Failed to save presentation locally:', err);
            setError(err instanceof Error ? err.message : t('presentationGenerator.errors.saveFailed'));
        }
    }, [generatedData, user.sub, t]);
    
     const handleExportPresentation = useCallback(async () => {
        if (!generatedData) return;
        setIsExporting(true);
        try {
            await exportPresentationAsPptx(generatedData.presentation, generatedData.slides);
        } catch(e) {
            setError(e instanceof Error ? e.message : 'Failed to export presentation.');
        } finally {
            setIsExporting(false);
        }
    }, [generatedData]);

    const handleLoadPresentation = useCallback(async (presentationId: string) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const presentation = await db.presentations.get(presentationId);
            const slides = await db.slides.where({ presentationId }).toArray();

            if (!presentation || presentation.userId !== user.sub) {
                throw new Error("Could not find the presentation or access is denied.");
            }
            
            setGeneratedData({ presentation, slides });
            setParams(presentation.params);

        } catch(e) {
            setError(e instanceof Error ? e.message : "Failed to load presentation.");
        } finally {
            setIsLoading(false);
        }
    }, [user.sub]);
    
    useEffect(() => {
        if (loadId) {
            handleLoadPresentation(loadId);
            onDidLoad();
        }
    }, [loadId, onDidLoad, handleLoadPresentation]);
    
    const handleDeletePresentation = useCallback(async (presentationId: string) => {
        if(window.confirm("Are you sure you want to permanently delete this presentation?")){
            try {
                await db.transaction('rw', db.presentations, db.slides, async () => {
                    // Extra check to ensure user owns the presentation before deleting
                    const presentation = await db.presentations.get(presentationId);
                    if (presentation && presentation.userId === user.sub) {
                        await db.presentations.delete(presentationId);
                        await db.slides.where({ presentationId }).delete();
                    }
                });
            } catch(e) {
                setError(e instanceof Error ? e.message : "Failed to delete presentation.");
            }
        }
    }, [user.sub]);

    const handlePresetSelect = (presetValue: string) => setParams(prev => ({ ...prev, questionTypes: presetValue }));
    const translatedBloomsOptions = BLOOMS_LEVEL_OPTIONS.map(opt => ({...opt, label: t(`blooms.${opt.value.toLowerCase()}`, {fallback: opt.label})}));

    const handleUpdateSlide = useCallback((updatedSlide: Slide) => {
        setGeneratedData(currentData => {
            if (!currentData) return null;
            const updatedSlides = currentData.slides
                .map(s => (s.id === updatedSlide.id ? updatedSlide : s))
                .sort((a, b) => a.slideNumber - b.slideNumber);
            
            return {
                ...currentData,
                slides: updatedSlides,
            };
        });
    }, []);

    return (
        <main className="min-h-full bg-brand-paper">
            <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><section className="mb-8 border-b border-slate-200 pb-8"><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">SmartChalk generator</p><h1 className="text-3xl font-black tracking-tight text-brand-black sm:text-4xl">{t('feature.presentationGenerator', { fallback: "Slides Generator"})}</h1><p className="mt-3 max-w-2xl text-base text-slate-600">{t('presentationGenerator.subtitle')}</p></section><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
                    <form onSubmit={(e) => {e.preventDefault(); handleGenerate()}} className="space-y-6 max-w-4xl mx-auto">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label={t('presentationGenerator.form.curriculumLabel')} name="curriculum" value={params.curriculum} onChange={handleInputChange} options={CURRICULUM_OPTS_FOR_SELECT} required />
                            <Select label={t('presentationGenerator.form.gradeLabel')} name="grade" value={params.grade} onChange={handleInputChange} options={GRADES_OPTIONS} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label={t('presentationGenerator.form.subjectLabel')} name="subject" value={params.subject} onChange={handleInputChange} options={COMPREHENSIVE_SUBJECT_OPTIONS} required />
                            <Input label={t('presentationGenerator.form.topicLabel')} name="topic" value={params.topic} onChange={handleInputChange} placeholder={t('presentationGenerator.form.topicPlaceholder')} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-charcoal">{t('presentationGenerator.form.presetsLabel')}</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {PRESENTATION_STRUCTURE_PRESETS.map(preset => (
                                    <Button key={preset.label} type="button" variant="secondary" size="sm" onClick={() => handlePresetSelect(preset.value)}>
                                        {t(`presentationGenerator.presets.${preset.label.replace(/[^a-zA-Z0-9]/g, '')}`, { fallback: preset.label })}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <TextArea label={t('presentationGenerator.form.questionTypesLabel')} name="questionTypes" value={params.questionTypes} onChange={handleInputChange} placeholder={t('presentationGenerator.form.questionTypesPlaceholder')} required rows={4} helperText={t('presentationGenerator.form.questionTypesHelper')} />
                        <Select label={t('presentationGenerator.form.bloomsLevelLabel')} name="bloomsLevel" value={params.bloomsLevel} onChange={handleInputChange} options={translatedBloomsOptions} required />
                        
                        <div className="pt-4 border-t flex flex-wrap items-center justify-start gap-4">
                            <Button type="submit" isLoading={isLoading} disabled={isLoading} size="lg">
                                {isLoading ? t('presentationGenerator.buttons.generating') : t('presentationGenerator.buttons.generateSlides')}
                            </Button>
                        </div>
                    </form>

                    {savedPresentations && savedPresentations.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-slate-200">
                             <h3 className="text-lg font-semibold text-brand-black mb-3">My Saved Presentations</h3>
                             <div className="space-y-3">
                                {savedPresentations.map(p => (
                                    <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-brand-paper p-4">
                                        <div>
                                            <p className="font-semibold text-brand-charcoal">{p.name}</p>
                                            <p className="text-xs text-slate-500">Created: {new Date(p.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleLoadPresentation(p.id)} title="Load Presentation" aria-label="Load Presentation" className="rounded-lg border border-slate-300 p-2 text-brand-black transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"><FolderOpenIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDeletePresentation(p.id)} title="Delete Presentation" aria-label="Delete Presentation" className="rounded-lg border border-slate-300 p-2 text-brand-black transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-yellow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    </>
                ) : (
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-bold text-brand-black">{generatedData.presentation.name}</h2>
                             <div className="flex items-center gap-2">
                                <Button onClick={handleDiscard} variant="ghost">Discard</Button>
                                <Button onClick={handleExportPresentation} isLoading={isExporting} variant="secondary">Export PPTX</Button>
                                <Button onClick={handleSavePresentation}>Save Presentation</Button>
                             </div>
                        </div>
                        <div className="space-y-6">
                             {generatedData.slides.map(slide => (
                                 <SlideCard 
                                    key={slide.id} 
                                    slide={slide} 
                                    onUpdate={handleUpdateSlide}
                                    subject={generatedData.presentation.params.subject}
                                    topic={generatedData.presentation.params.topic}
                                />
                             ))}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </main>
    );
};