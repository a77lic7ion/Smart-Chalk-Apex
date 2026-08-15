import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './exam/FileUploader';
import { DocumentPreview } from './exam/DocumentPreview';
import { ManualEditor } from './exam/ManualEditor';
import { db } from '../db';
import type { ManualExam, UserProfile, ContentType } from '../types';

interface ManualExamBuilderViewProps {
    user: UserProfile;
    loadId?: string | null;
    loadType?: ContentType | null;
    onDidLoad?: () => void;
}

export const ManualExamBuilderView: React.FC<ManualExamBuilderViewProps> = ({ user, loadId, loadType, onDidLoad }) => {
    const [file, setFile] = useState<File | null>(null);
    const [initialData, setInitialData] = useState<ManualExam | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        const loadExam = async () => {
            if (loadId && (loadType === 'manualExam' || loadType === 'parsedExam')) {
                setIsLoading(true);
                // For now, we only load manual exams directly.
                // A future feature could convert a parsed exam into a manual one.
                if (loadType === 'manualExam') {
                    const savedExam = await db.savedManualExams.get(loadId);
                    if (savedExam && savedExam.userId === user.sub) {
                        setInitialData(savedExam);
                        const placeholderFile = new File([], "Loaded from database", { type: "text/plain" });
                        setFile(placeholderFile);
                    }
                }
                setIsLoading(false);
                onDidLoad?.();
            }
        };
        loadExam();
    }, [loadId, loadType, onDidLoad, user.sub]);


    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        setInitialData(null); // Clear any previously loaded data
    }, []);

    // A simplified file uploader for the manual builder
    const Uploader: React.FC = () => (
         <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">SmartChalk workspace</p>
                <h1 className="text-3xl font-black tracking-tight text-brand-black">Make your own exam from a reference.</h1>
                <p className="mt-3 max-w-2xl text-base text-slate-600">Upload a DOCX or PDF file to use as a reference in a side-by-side editor.</p>
            </div>
            <input
                type="file"
                id="manual-upload"
                className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:bg-brand-yellow file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-black
                    hover:file:bg-yellow-300"
                accept=".pdf,.docx"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
        </div>
    );

    return (
        <main className="min-h-full bg-brand-paper">
            <div className="mx-auto w-full max-w-screen-2xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
            {!file ? (
                <Uploader />
            ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <DocumentPreview file={file} />
                    <ManualEditor user={user} initialData={initialData} />
                </div>
            )}
            </div>
        </main>
    );
};