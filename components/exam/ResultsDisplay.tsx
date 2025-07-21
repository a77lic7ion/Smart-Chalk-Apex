

import React, { useState } from 'react';
import type { ParsedExamData, ExamQuestion, ExamAnnexure, Curriculum } from '../../types';
import { Button } from '../Button';
import { XMarkIcon, ExclamationTriangleIcon, PencilSquareIcon, CheckIcon, UploadIcon, DocumentArrowDownIcon, BookmarkSquareIcon, DocumentTextIcon } from '../Icons';
import { Select } from '../Select';
import { CURRICULUM_OPTS_FOR_SELECT, GRADES_OPTIONS, SUBJECTS } from '../../constants';
import { FormattedText } from '../FormattedText';

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const EditableParsedQuestion: React.FC<{
    question: ExamQuestion;
    onUpdate: (updatedQuestion: ExamQuestion) => void;
}> = ({ question, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(question.text);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const handleSave = () => {
        onUpdate({ ...question, text: editedText });
        setIsEditing(false);
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageError('Please upload a valid image file (PNG, JPG, etc.).');
            return;
        }

        setImageError(null);
        try {
            const base64 = await readFileAsBase64(file);
            onUpdate({ ...question, imageData: base64, imageRequired: false });
        } catch (err) {
            setImageError(err instanceof Error ? err.message : 'Failed to read file');
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleImageUpload(file);
                }
                return; 
            }
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden group transition-all duration-300">
            <div className="p-4 flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-brand-navy">{question.questionNumber}</p>
                        {question.marks && <p className="text-sm font-medium text-slate-500">{question.marks}</p>}
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full text-sm p-2 mt-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green resize-y"
                            rows={4}
                        />
                    ) : (
                         <div className="prose prose-sm max-w-none mt-1 text-brand-dark-grey">
                            <FormattedText text={question.text} />
                         </div>
                    )}
                </div>
                <div className="flex-shrink-0">
                    {isEditing ? (
                        <Button onClick={handleSave} size="sm"><CheckIcon className="h-4 w-4 mr-1" /> Save</Button>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm"><PencilSquareIcon className="h-4 w-4 mr-1" /> Edit</Button>
                    )}
                </div>
            </div>
            
            {(question.imageData || question.imageRequired) && (
                <div className="px-4 pb-4">
                    {question.imageData ? (
                        <div className="mt-2">
                             <img src={question.imageData} alt={`Visual for question ${question.questionNumber}`} className="rounded-lg border border-slate-300 max-h-64" />
                             <Button variant="secondary" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                                <UploadIcon className="h-4 w-4 mr-2" /> Replace Image
                             </Button>
                        </div>
                    ) : (
                        <div 
                            className="mt-2 p-3 bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg"
                            onPaste={handlePaste}
                        >
                             <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-blue-800 font-medium">This question may need an image. <br /> <span className="font-normal">Click to upload or paste an image here.</span></p>
                                 <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <UploadIcon className="h-4 w-4 mr-2" /> Upload
                                 </Button>
                             </div>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    {imageError && <p className="text-xs text-red-600 mt-2">{imageError}</p>}
                </div>
            )}
            
            {question.annexure && (
                <div className="mt-2 p-4 bg-green-50 border-t border-green-200">
                    <h4 className="font-bold text-green-800">Linked Annexure {question.annexure.annexureId} (Answer)</h4>
                    <div className="text-sm text-green-900 mt-2">
                        <FormattedText text={question.annexure.text} />
                    </div>
                    {question.annexure.images.length > 0 && (
                         <div className="mt-3">
                            <h5 className="text-xs font-bold uppercase text-green-600 mb-2">Images in Annexure</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {question.annexure.images.map((imgUrl, index) => (
                                    <a key={index} href={imgUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={imgUrl} alt={`Image for annexure ${question.annexure?.annexureId}`} className="rounded border border-green-300 hover:shadow-lg transition-shadow" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const UnmatchedAnnexureCard: React.FC<{ annexure: ExamAnnexure }> = ({ annexure }) => {
    return (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <h4 className="font-bold text-yellow-800">Unmatched Annexure {annexure.annexureId}</h4>
            <div className="text-sm text-yellow-900 mt-2">
                <FormattedText text={annexure.text} />
            </div>
            {annexure.images.length > 0 && (
                <div className="mt-3">
                    <h5 className="text-xs font-bold uppercase text-yellow-600 mb-2">Images in Annexure</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {annexure.images.map((imgUrl, index) => (
                           <a key={index} href={imgUrl} target="_blank" rel="noopener noreferrer">
                               <img src={imgUrl} alt={`Image for annexure ${annexure.annexureId}`} className="rounded border border-yellow-400 hover:shadow-lg transition-shadow" />
                           </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface ResultsDisplayProps {
    data: ParsedExamData;
    onBack: () => void;
    onUpdateQuestion: (updatedQuestion: ExamQuestion) => void;
    onCommit: (data: ParsedExamData, metadata: { curriculum: Curriculum, grade: string, subject: string }) => void;
    onExport: (type: 'questions' | 'memo', metadata: { curriculum: Curriculum, grade: string, subject: string }) => void;
    isCommitting: boolean;
    successMessage: string | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, onBack, onUpdateQuestion, onCommit, onExport, isCommitting, successMessage }) => {
    const [metadata, setMetadata] = useState<{ curriculum: Curriculum, grade: string, subject: string }>({
        curriculum: CURRICULUM_OPTS_FOR_SELECT[0].value as Curriculum,
        grade: GRADES_OPTIONS[6].value,
        subject: SUBJECTS[0]
    });

    const handleMetadataChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value as Curriculum | string }));
    };

    const handleCommit = () => {
        onCommit(data, metadata);
    };
    
    if (successMessage) {
        return (
            <div className="p-8 bg-green-50 rounded-xl shadow-md border border-green-200 text-center">
                <h3 className="text-lg font-bold text-green-800">Success!</h3>
                <p className="text-green-700 mt-2">{successMessage}</p>
                <Button onClick={onBack} variant="primary" className="mt-4">
                    Parse Another Document
                </Button>
            </div>
        );
    }
    
    const isBusy = isCommitting;

    const questionsBySection: { [key: string]: ExamQuestion[] } = data.questions.reduce((acc, q) => {
        const section = q.section || 'General Questions';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(q);
        return acc;
    }, {} as { [key: string]: ExamQuestion[] });


    return (
        <div className="space-y-6 h-[85vh] flex flex-col">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 flex-shrink-0">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-brand-navy">Staging Area</h1>
                        <p className="text-slate-600 text-sm">Review, edit, and finalize the extracted questions.</p>
                    </div>
                    <Button onClick={onBack} variant="ghost" disabled={isBusy}>
                        <XMarkIcon className="h-5 w-5 mr-2"/>
                        Go Back
                    </Button>
                </div>
                
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="font-semibold text-brand-navy mb-3 text-sm">Database Commit Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select label="Curriculum" name="curriculum" value={metadata.curriculum} onChange={handleMetadataChange} options={CURRICULUM_OPTS_FOR_SELECT} />
                        <Select label="Grade" name="grade" value={metadata.grade} onChange={handleMetadataChange} options={GRADES_OPTIONS.map(opt => ({value: opt.value, label: opt.label}))} />
                        <Select label="Subject" name="subject" value={metadata.subject} onChange={handleMetadataChange} options={SUBJECTS.map(s => ({value: s, label: s}))} />
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-4">
                {Object.keys(questionsBySection).length > 0 ? (
                    Object.entries(questionsBySection).map(([section, questions]) => (
                        <div key={section}>
                            <h2 className="text-lg font-semibold text-brand-navy border-b-2 border-brand-green pb-2 mb-4">{section}</h2>
                            <div className="space-y-4">
                                {questions.map(q => <EditableParsedQuestion key={q.id} question={q} onUpdate={onUpdateQuestion} />)}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-slate-500 py-8">No questions were successfully parsed from the document.</p>
                )}
                 {data.unmatchedAnnexures.length > 0 && (
                    <div className="p-4 bg-yellow-100/50 rounded-xl border border-yellow-300">
                        <div className="flex items-center gap-3 mb-4">
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                            <div>
                               <h2 className="font-semibold text-yellow-900">Unmatched Annexures</h2>
                               <p className="text-sm text-yellow-800">These annexures could not be linked automatically.</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {data.unmatchedAnnexures.map(a => <UnmatchedAnnexureCard key={a.id} annexure={a} />)}
                        </div>
                    </div>
                )}
            </div>

             <div className="mt-auto pt-4 flex-shrink-0 flex flex-wrap gap-4 justify-end">
                <Button onClick={() => onExport('questions', metadata)} variant="secondary" disabled={isBusy}><DocumentTextIcon className="h-5 w-5 mr-2"/> Export Questions</Button>
                <Button onClick={() => onExport('memo', metadata)} variant="secondary" disabled={isBusy}><DocumentTextIcon className="h-5 w-5 mr-2"/> Export Answers</Button>
                <Button onClick={handleCommit} isLoading={isCommitting} disabled={isBusy || data.questions.length === 0} size="lg">
                    <BookmarkSquareIcon className="h-5 w-5 mr-2"/> Commit to DB
                </Button>
            </div>
        </div>
    );
};