

import React, { useState, useCallback, useEffect } from 'react';
import { extractDataFromFile, structureContent } from '../services/examParser';
import type { ParsedExamData, ExamQuestion, DbRecord, Curriculum, SavedParsedExam, UserProfile } from '../types';
import { FileUploader } from './exam/FileUploader';
import { ResultsDisplay } from './exam/ResultsDisplay';
import { Loader } from './Loader';
import { Button } from './Button';
import { db } from '../db';
import { exportParsedExamAsDocx, exportParsedMemorandumAsDocx } from '../utils/exportService';
import { DocumentPreview } from './exam/DocumentPreview';

const LOCAL_STORAGE_KEY = 'parsedExamData';

interface IntelligentExamParserViewProps {
    user: UserProfile;
    loadId: string | null;
    onDidLoad: () => void;
    onBack: () => void;
}

export const IntelligentExamParserView: React.FC<IntelligentExamParserViewProps> = ({ user, loadId, onDidLoad, onBack }) => {
    const [questionFile, setQuestionFile] = useState<File | null>(null);
    const [addendumFile, setAddendumFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParsedExamData | null>(null);
    const [sourceFileName, setSourceFileName] = useState<string>('');

    // Load from My Content
    useEffect(() => {
        if (loadId) {
            const loadData = async () => {
                setIsLoading(true);
                const data = await db.savedParsedExams.get(loadId);
                if (data && data.userId === user.sub) {
                    setParsedData({
                        questions: data.questions,
                        unmatchedAnnexures: data.unmatchedAnnexures,
                    });
                    setSourceFileName(data.sourceFileName);
                    // Create a placeholder file for the previewer to know a file was "loaded"
                    setQuestionFile(new File([], data.sourceFileName));
                } else {
                    setError(`Could not load parsed exam with ID: ${loadId}`);
                }
                setIsLoading(false);
                onDidLoad();
            };
            loadData();
        }
    }, [loadId, onDidLoad, user.sub]);


    const handleParse = useCallback(async (qFile: File, aFile: File) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setParsedData(null);
        setQuestionFile(qFile);
        setSourceFileName(qFile.name);
        setAddendumFile(aFile);

        const qFileExt = qFile.name.split('.').pop()?.toLowerCase();
        const aFileExt = aFile.name.split('.').pop()?.toLowerCase();

        if (qFileExt !== aFileExt) {
            setError("File type mismatch. Please upload two files of the same type (e.g., two .docx files).");
            setIsLoading(false);
            return;
        }

        try {
            const [questionData, addendumData] = await Promise.all([
                extractDataFromFile(qFile),
                extractDataFromFile(aFile)
            ]);
            
            const finalData = structureContent(questionData, addendumData);
            setParsedData(finalData);

        } catch (err) {
            console.error('Parsing failed:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred during parsing.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleUpdateQuestion = useCallback((updatedQuestion: ExamQuestion) => {
        setParsedData(currentData => {
            if (!currentData) return null;
            return {
                ...currentData,
                questions: currentData.questions.map(q => 
                    q.id === updatedQuestion.id ? updatedQuestion : q
                ),
            };
        });
    }, []);

    const handleCommitToDatabase = useCallback(async (
        dataToCommit: ParsedExamData,
        metadata: { curriculum: Curriculum; grade: string; subject: string }
    ) => {
        setIsCommitting(true);
        setError(null);
        setSuccessMessage(null);

        const examName = window.prompt("Enter a name for this parsed exam:", sourceFileName || "Parsed Exam");
        if (!examName) {
            setIsCommitting(false);
            return;
        }
        
        const savedExamRecord: SavedParsedExam = {
            id: crypto.randomUUID(),
            userId: user.sub,
            name: examName,
            questions: dataToCommit.questions,
            unmatchedAnnexures: dataToCommit.unmatchedAnnexures,
            metadata: metadata,
            sourceFileName: sourceFileName,
            createdAt: Date.now(),
            syncStatus: 'dirty'
        };

        const individualQuestions: DbRecord[] = dataToCommit.questions.map(q => ({
            question: q.text,
            answer: q.annexure ? q.annexure.text : 'No specific answer text in annexure.',
            curriculum: metadata.curriculum,
            grade: metadata.grade,
            subject: metadata.subject,
            standard: `${metadata.grade} - ${metadata.subject} - Parsed from ${sourceFileName}`,
            imageData: q.imageData,
            createdAt: Date.now(),
            sourceId: savedExamRecord.id,
            syncStatus: 'dirty'
        }));

        try {
            await db.transaction('rw', db.trainingData, db.savedParsedExams, async () => {
                await db.savedParsedExams.put(savedExamRecord);
                await db.trainingData.where({ sourceId: savedExamRecord.id }).delete();
                await db.trainingData.bulkAdd(individualQuestions);
            });
            setSuccessMessage(`${individualQuestions.length} questions committed and exam "${examName}" saved locally. It will be synced with the server shortly.`);
            handleReset(); // Clear the view after successful commit
        } catch (e) {
            console.error("Failed to commit to database locally:", e);
            setError(e instanceof Error ? `Database error: ${e.message}` : 'An unknown error occurred while saving locally.');
        } finally {
            setIsCommitting(false);
        }
    }, [sourceFileName, user.sub]);

    const handleExport = useCallback(async (type: 'questions' | 'memo', metadata: { curriculum: Curriculum; grade: string; subject: string; }) => {
        if (!parsedData) return;
        try {
            if (type === 'questions') {
                await exportParsedExamAsDocx(parsedData, sourceFileName || 'Exam Questions', metadata);
            } else {
                await exportParsedMemorandumAsDocx(parsedData, sourceFileName || 'Exam Memorandum', metadata);
            }
        } catch (e) {
             console.error(`Failed to export ${type} PDF:`, e);
             setError(e instanceof Error ? `PDF Export Error: ${e.message}` : 'An unknown error occurred during PDF export.');
        }
    }, [parsedData, sourceFileName]);


    const handleReset = () => {
        setQuestionFile(null);
        setAddendumFile(null);
        setParsedData(null);
        setError(null);
        setIsLoading(false);
        setIsCommitting(false);
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl shadow-md border border-slate-200">
                    <Loader className="h-12 w-12 text-brand-yellow" />
                    <p className="mt-4 font-semibold text-brand-black">Processing Document...</p>
                    <p className="text-sm text-slate-600">This may take a moment.</p>
                </div>
            );
        }

        if (error) {
            return (
                 <div className="max-w-xl mx-auto p-8 bg-red-50 rounded-xl shadow-md border border-red-200 text-center">
                    <h3 className="text-lg font-bold text-red-800">An Error Occurred</h3>
                    <p className="text-red-700 mt-2">{error}</p>
                    <Button onClick={onBack} variant="danger" className="mt-4">
                        Go Back
                    </Button>
                </div>
            );
        }
        
        if (parsedData && parsedData.questions.length === 0) {
             return (
                <div className="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-md border border-slate-200 text-center">
                    <h3 className="text-lg font-bold text-brand-black">Parsing Complete</h3>
                    <p className="text-slate-600 mt-2">No questions could be automatically extracted from the provided document.</p>
                    <p className="text-sm text-slate-500 mt-1">You can go back and try the manual builder, or try a different file.</p>
                    <Button onClick={onBack} variant="secondary" className="mt-4">Go Back</Button>
                </div>
            );
        }
        
        if (parsedData && questionFile) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <DocumentPreview file={questionFile} />
                    <ResultsDisplay 
                        data={parsedData} 
                        onBack={onBack}
                        onUpdateQuestion={handleUpdateQuestion}
                        onCommit={handleCommitToDatabase}
                        onExport={handleExport}
                        isCommitting={isCommitting}
                        successMessage={successMessage}
                    />
                </div>
            );
        }

        return (
            <div className="max-w-3xl mx-auto">
                <FileUploader 
                    onParse={handleParse} 
                    questionFile={questionFile}
                    setQuestionFile={setQuestionFile}
                    addendumFile={addendumFile}
                    setAddendumFile={setAddendumFile}
                />
            </div>
        );
    };

    return (
        <main className="container-fluid mx-auto px-4 py-8 max-w-screen-2xl">
            {renderContent()}
        </main>
    );
};