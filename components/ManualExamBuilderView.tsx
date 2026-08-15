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
         <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200 max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-brand-black">Make your own exam from a reference.</h1>
                <p className="text-slate-600 mt-1">Upload a DOCX or PDF file to use as a reference in a side-by-side editor.</p>
            </div>
            <input
                type="file"
                id="manual-upload"
                className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-yellow-50 file:text-brand-yellow
                    hover:file:bg-yellow-100"
                accept=".pdf,.docx"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
        </div>
    );

    return (
        <main className="container-fluid mx-auto px-4 py-8 max-w-screen-2xl">
            {!file ? (
                <Uploader />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <DocumentPreview file={file} />
                    <ManualEditor user={user} initialData={initialData} />
                </div>
            )}
        </main>
    );
};