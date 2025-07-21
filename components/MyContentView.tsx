
import React, { useState, useRef, useEffect } from 'react';
import Dexie from 'dexie';
import { db } from '../db';
import type { SavedTest, Presentation, LessonPlan, UserProfile, SavedExam, SavedHomework, ContentType, SavedParsedExam, ManualExam } from '../types';
import { PresentationChartLineIcon, BookOpenIcon, FolderOpenIcon, TrashIcon, DocumentArrowDownIcon, ExamIcon, ClipboardDocumentCheckIcon, HomeworkIcon, DocumentMagnifyingGlassIcon, PencilSquareIcon } from './Icons';
import { Loader } from './Loader';
import { exportTestAsDocx, exportPresentationAsPptx, exportLessonAsDocx, exportHomeworkAsDocx, exportFormalTestAsDocx, exportParsedExamAsDocx, exportParsedMemorandumAsDocx, exportManualExamAsDocx } from '../utils/exportService';
import { ADMIN_EMAILS } from '../config';

type ExportableContentType = ContentType | 'test_questions' | 'test_memo';

interface ContentCardProps {
    id: string;
    name: string;
    createdAt: number;
    type: ContentType;
    onLoad: (type: ContentType, id: string) => void;
    onDelete: (type: ContentType, id: string) => void;
    onExport?: (type: ExportableContentType, id: string, metadata?: any) => void;
    onFormatExam?: (type: 'test' | 'presentation' | 'lesson' | 'parsedExam' | 'manualExam', id: string) => void;
    onCreateHomework?: (type: 'test' | 'presentation' | 'lesson', id: string) => void;
    isExporting: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({ id, name, createdAt, type, onLoad, onDelete, onExport, onFormatExam, onCreateHomework, isExporting }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStyles = () => {
        switch(type) {
            case 'test': return { Icon: PencilSquareIcon, bgColor: 'bg-sky-50 border-sky-200', iconColor: 'text-sky-600', accentColor: 'text-sky-800' };
            case 'exam': return { Icon: ExamIcon, bgColor: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600', accentColor: 'text-purple-800' };
            case 'presentation': return { Icon: PresentationChartLineIcon, bgColor: 'bg-fuchsia-50 border-fuchsia-200', iconColor: 'text-fuchsia-600', accentColor: 'text-fuchsia-800' };
            case 'lesson': return { Icon: BookOpenIcon, bgColor: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', accentColor: 'text-emerald-800' };
            case 'homework': return { Icon: ClipboardDocumentCheckIcon, bgColor: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600', accentColor: 'text-blue-800' };
            case 'parsedExam': return { Icon: DocumentMagnifyingGlassIcon, bgColor: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600', accentColor: 'text-orange-800' };
            case 'manualExam': return { Icon: PencilSquareIcon, bgColor: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-600', accentColor: 'text-indigo-800' };
            default: return { Icon: PencilSquareIcon, bgColor: 'bg-slate-50 border-slate-200', iconColor: 'text-slate-600', accentColor: 'text-slate-800' };
        }
    }
    const { Icon, bgColor, iconColor, accentColor } = getStyles();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            onDelete(type, id);
        }
    };
    
    const handleLoad = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLoad(type, id);
    };

    const handleExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (type === 'test' || type === 'parsedExam') { // Add any type that needs a dropdown
            setIsExportMenuOpen(p => !p);
        } else {
            onExport?.(type, id);
        }
    };

    const handleMenuExportClick = (exportType: 'questions' | 'memo') => {
        setIsExportMenuOpen(false);
        if (type === 'test') {
            onExport?.(exportType === 'questions' ? 'test_questions' : 'test_memo', id);
        } else if (type === 'parsedExam') {
            onExport?.(type, id, { subType: exportType });
        }
    };

    const handleFormat = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (type === 'test' || type === 'lesson' || type === 'presentation' || type === 'parsedExam' || type === 'manualExam') {
            onFormatExam?.(type, id);
        }
    };
    
    const handleCreateHomework = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (type === 'test' || type === 'lesson' || type === 'presentation') {
            onCreateHomework?.(type, id);
        }
    };
    
    const getExportTitle = () => {
        if (type === 'presentation') return 'Export PPTX';
        if (type === 'test' || type === 'homework' || type === 'exam' || type === 'manualExam' || type === 'parsedExam' || type === 'lesson') return 'Export DOCX';
        return 'Export';
    }

    return (
        <div className={`p-4 rounded-xl border ${bgColor} flex items-start gap-4 transition-shadow hover:shadow-md`}>
            <div className={`p-2 rounded-lg ${iconColor}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex-grow">
                <p className={`font-semibold ${accentColor}`}>{name}</p>
                <p className="text-xs text-slate-500">
                    Created: {new Date(createdAt).toLocaleDateString()}
                </p>
            </div>
            <div className="flex items-center gap-2">
                 {(type === 'test' || type === 'lesson' || type === 'presentation') && onCreateHomework && (
                    <button onClick={handleCreateHomework} title="Create Homework" disabled={isExporting} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-slate-200 disabled:opacity-50">
                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                    </button>
                 )}
                 {(type === 'test' || type === 'lesson' || type === 'presentation' || type === 'parsedExam' || type === 'manualExam') && onFormatExam && (
                    <button onClick={handleFormat} title="Format as Exam" disabled={isExporting} className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-slate-200 disabled:opacity-50">
                        <ExamIcon className="h-5 w-5" />
                    </button>
                )}
                 {onExport && (
                     <div className="relative" ref={exportMenuRef}>
                        <button onClick={handleExportClick} title={getExportTitle()} disabled={isExporting} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-slate-200 disabled:cursor-wait disabled:bg-slate-100">
                            {isExporting ? <Loader className="h-5 w-5 text-brand-green" /> : <DocumentArrowDownIcon className="h-5 w-5" />}
                        </button>
                        {isExportMenuOpen && (type === 'test' || type === 'parsedExam') && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-10 p-2">
                                <button
                                    onClick={() => handleMenuExportClick('questions')}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    Export Questions DOCX
                                </button>
                                <button
                                    onClick={() => handleMenuExportClick('memo')}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    Export Memorandum DOCX
                                </button>
                            </div>
                        )}
                    </div>
                 )}
                <button onClick={handleLoad} title="Load Content" disabled={isExporting} className="p-1.5 text-slate-500 hover:text-brand-green hover:bg-white rounded-lg transition-colors shadow-sm border border-slate-200 disabled:opacity-50">
                    <FolderOpenIcon className="h-5 w-5" />
                </button>
                <button onClick={handleDelete} title="Delete Content" disabled={isExporting} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-slate-200 disabled:opacity-50">
                    <TrashIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

interface ContentSectionProps {
    title: string;
    items: (SavedTest[] | Presentation[] | LessonPlan[] | SavedExam[] | SavedHomework[] | SavedParsedExam[] | ManualExam[] | undefined);
    type: ContentType;
    exportingId: string | null;
    onLoad: (type: ContentType, id: string) => void;
    onDelete: (type: ContentType, id: string) => void;
    onExport?: (type: ExportableContentType, id: string, metadata?: any) => void;
    onFormatExam?: (type: 'test' | 'presentation' | 'lesson' | 'parsedExam' | 'manualExam', id: string) => void;
    onCreateHomework?: (type: 'test' | 'presentation' | 'lesson', id: string) => void;
}

const ContentSection: React.FC<ContentSectionProps> = ({ title, items, type, exportingId, onLoad, onDelete, onExport, onFormatExam, onCreateHomework }) => (
    <section>
        <h2 className="text-xl md:text-2xl font-bold text-brand-navy mb-4 border-b-2 border-green-300 pb-2">{title}</h2>
        {items && items.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((item) => (
                    <ContentCard 
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        createdAt={item.createdAt}
                        type={type}
                        onLoad={onLoad}
                        onDelete={onDelete}
                        onExport={onExport}
                        onFormatExam={onFormatExam}
                        onCreateHomework={onCreateHomework}
                        isExporting={exportingId === item.id}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <p className="text-slate-500 font-medium">No {title.toLowerCase()} found.</p>
                <p className="text-sm text-slate-400 mt-1">Go to the appropriate generator to create and save some!</p>
            </div>
        )}
    </section>
);

type AllContent = {
    savedTests: SavedTest[],
    savedExams: SavedExam[],
    savedPresentations: Presentation[],
    savedLessons: LessonPlan[],
    savedHomework: SavedHomework[],
    savedParsedExams: SavedParsedExam[],
    savedManualExams: ManualExam[]
};

interface MyContentViewProps {
    user: UserProfile;
    isAdmin: boolean;
    onContentLoad: (type: ContentType, id: string) => void;
    onFormatExam: (type: 'test' | 'presentation' | 'lesson' | 'parsedExam' | 'manualExam', id: string) => void;
    onCreateHomework: (type: 'test' | 'presentation' | 'lesson', id: string) => void;
}

export const MyContentView: React.FC<MyContentViewProps> = ({ user, isAdmin, onContentLoad, onFormatExam, onCreateHomework }) => {
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [allContent, setAllContent] = useState<AllContent | undefined>(undefined);

    useEffect(() => {
        if (!user || !user.sub) {
            return;
        }

        const fetchContent = async () => {
            const isAdminView = isAdmin && ADMIN_EMAILS.includes(user.email.toLowerCase());
            
            const fetchQuery = (table: Dexie.Table<any, any>) => {
                return isAdminView 
                    ? table.reverse().sortBy('createdAt') 
                    : table.where({ userId: user.sub }).reverse().sortBy('createdAt');
            };
    
            const [
                tests, exams, presentations, lessons, homework, parsedExams, manualExams
            ] = await db.transaction('r', db.tables, () => Promise.all([
                fetchQuery(db.savedTests),
                fetchQuery(db.savedExams),
                fetchQuery(db.presentations),
                fetchQuery(db.lessonPlans),
                fetchQuery(db.savedHomework),
                fetchQuery(db.savedParsedExams),
                fetchQuery(db.savedManualExams),
            ]));
    
            setAllContent({ 
                savedTests: tests, 
                savedExams: exams, 
                savedPresentations: presentations, 
                savedLessons: lessons, 
                savedHomework: homework, 
                savedParsedExams: parsedExams, 
                savedManualExams: manualExams 
            });
        };

        Dexie.on('storagemutated', fetchContent);
        fetchContent(); // Initial fetch

        return () => {
            Dexie.on('storagemutated').unsubscribe(fetchContent);
        };
    }, [user.sub, isAdmin]);

    const isLoading = allContent === undefined;
    
    const { 
        savedTests, 
        savedExams, 
        savedPresentations, 
        savedLessons, 
        savedHomework, 
        savedParsedExams, 
        savedManualExams 
    } = allContent || {};

    const handleDelete = async (type: ContentType, id: string) => {
        try {
            await db.transaction('rw', db.tables, async () => {
                const tablesWithSourceId = ['test', 'lesson', 'exam', 'parsedExam'];
                if (tablesWithSourceId.includes(type)) {
                    await db.trainingData.where({ sourceId: id }).delete();
                }

                if (type === 'test') await db.savedTests.delete(id);
                else if (type === 'exam') await db.savedExams.delete(id);
                else if (type === 'homework') await db.savedHomework.delete(id);
                else if (type === 'parsedExam') await db.savedParsedExams.delete(id);
                else if (type === 'manualExam') await db.savedManualExams.delete(id);
                else if (type === 'presentation') {
                    await db.presentations.delete(id);
                    await db.slides.where({ presentationId: id }).delete();
                    await db.imagePlaceholders.where({ presentationId: id }).delete();
                } else if (type === 'lesson') {
                    await db.lessonPlans.delete(id);
                    await db.imagePlaceholders.where({ presentationId: id }).delete();
                }
            });
        } catch (e) {
            console.error(`Failed to delete ${type}:`, e);
            alert(`Could not delete the ${type}. Please check the console for details.`);
        }
    };

    const handleExport = async (type: ExportableContentType, id: string, metadata: any = {}) => {
        if (exportingId) return;
        setExportingId(id);
        setExportError(null);
        try {
            if (type === 'test_questions') {
                const test = await db.savedTests.get(id);
                if (test) await exportTestAsDocx(test, 'questions');
                else throw new Error("Test not found.");
            } else if (type === 'test_memo') {
                const test = await db.savedTests.get(id);
                if (test) await exportTestAsDocx(test, 'memo');
                else throw new Error("Test not found.");
            } else if (type === 'presentation') {
                const presentation = await db.presentations.get(id);
                if (presentation) await exportPresentationAsPptx(presentation);
                else throw new Error("Presentation not found.");
            } else if (type === 'homework') {
                const homework = await db.savedHomework.get(id);
                if (homework) await exportHomeworkAsDocx(homework);
                else throw new Error("Homework not found.");
            } else if (type === 'lesson') {
                const lesson = await db.lessonPlans.get(id);
                if (lesson) await exportLessonAsDocx(lesson);
                else throw new Error("Lesson Plan not found.");
            } else if (type === 'parsedExam') {
                const exam = await db.savedParsedExams.get(id);
                if (!exam) throw new Error("Parsed exam not found.");
                const data = { questions: exam.questions, unmatchedAnnexures: exam.unmatchedAnnexures };
                if (metadata.subType === 'memo') {
                    await exportParsedMemorandumAsDocx(data, exam.name, exam.metadata);
                } else {
                    await exportParsedExamAsDocx(data, exam.name, exam.metadata);
                }
            } else if (type === 'manualExam') {
                const exam = await db.savedManualExams.get(id);
                if (exam) await exportManualExamAsDocx(exam);
            }
        } catch (e) {
            console.error(`Failed to export ${type}:`, e);
            const message = e instanceof Error ? e.message : `Could not export the ${type}.`;
            setExportError(message);
            alert(`Export failed: ${message}`);
        } finally {
            setExportingId(null);
        }
    };
    
    if (isLoading) {
        return (
            <main className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
                <div className="flex flex-col items-center">
                    <Loader className="h-12 w-12 text-brand-green" />
                    <p className="mt-4 text-slate-600 font-semibold">Loading your content...</p>
                </div>
            </main>
        );
    }
    
    const combinedExams = [
        ...(savedParsedExams || []).map(item => ({ ...item, type: 'parsedExam' as const })),
        ...(savedManualExams || []).map(item => ({ ...item, type: 'manualExam' as const }))
    ].sort((a, b) => b.createdAt - a.createdAt);


    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-12">
                 <div className="text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-brand-navy">My Content</h1>
                    <p className="text-lg text-slate-600 mt-1">A central place for all your generated and parsed content.</p>
                </div>
                
                {exportError && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-md">
                        <p className="text-sm text-red-700"><strong>Export Failed:</strong> {exportError}</p>
                    </div>
                )}
                
                <section>
                    <h2 className="text-xl md:text-2xl font-bold text-brand-navy mb-4 border-b-2 border-green-300 pb-2">Parsed & Manual Exams</h2>
                    {combinedExams && combinedExams.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {combinedExams.map((item) => (
                                <ContentCard 
                                    key={item.id}
                                    id={item.id}
                                    name={item.name}
                                    createdAt={item.createdAt}
                                    type={item.type}
                                    onLoad={onContentLoad}
                                    onDelete={handleDelete}
                                    onExport={handleExport}
                                    onFormatExam={onFormatExam}
                                    isExporting={exportingId === item.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <p className="text-slate-500 font-medium">No Parsed or Manual Exams found.</p>
                            <p className="text-sm text-slate-400 mt-1">Go to the appropriate generator to create and save some!</p>
                        </div>
                    )}
                </section>
                
                <ContentSection
                    title="Saved Homework"
                    items={savedHomework}
                    type="homework"
                    exportingId={exportingId}
                    onLoad={onContentLoad}
                    onDelete={handleDelete}
                    onExport={handleExport}
                />
                
                <ContentSection
                    title="Saved Exams"
                    items={savedExams}
                    type="exam"
                    exportingId={exportingId}
                    onLoad={onContentLoad}
                    onDelete={handleDelete}
                    onFormatExam={onFormatExam}
                />
                
                <ContentSection
                    title="Saved Tests"
                    items={savedTests}
                    type="test"
                    exportingId={exportingId}
                    onLoad={onContentLoad}
                    onDelete={handleDelete}
                    onExport={handleExport}
                    onFormatExam={onFormatExam}
                    onCreateHomework={onCreateHomework}
                />

                <ContentSection
                    title="Saved Lesson Plans"
                    items={savedLessons}
                    type="lesson"
                    exportingId={exportingId}
                    onLoad={onContentLoad}
                    onDelete={handleDelete}
                    onExport={handleExport}
                    onFormatExam={onFormatExam}
                    onCreateHomework={onCreateHomework}
                />
                
                 <ContentSection
                    title="Saved Presentations"
                    items={savedPresentations}
                    type="presentation"
                    exportingId={exportingId}
                    onLoad={onContentLoad}
                    onDelete={handleDelete}
                    onExport={handleExport}
                    onFormatExam={onFormatExam}
                    onCreateHomework={onCreateHomework}
                />
            </div>
        </main>
    );
};
