import React from 'react';
import { Button } from '../Button';
import { UploadIcon } from '../Icons';
import { PdfConversionHelper } from './PdfConversionHelper';

interface FileUploaderProps {
    onParse: (questionFile: File, addendumFile: File) => void;
    questionFile: File | null;
    setQuestionFile: (file: File | null) => void;
    addendumFile: File | null;
    setAddendumFile: (file: File | null) => void;
}

const FileInput: React.FC<{
    label: string;
    description: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    accept: string;
    id: string;
}> = ({ label, description, file, onFileChange, accept, id }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isPdf = file?.type === 'application/pdf';

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileChange(e.target.files?.[0] || null);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        onFileChange(e.dataTransfer.files?.[0] || null);
    }

    return (
        <div className="flex-1 flex flex-col gap-2">
            <label 
                htmlFor={id} 
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-yellow-400 bg-yellow-50' : 'border-slate-300 hover:border-brand-yellow hover:bg-yellow-50'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <div className={`p-3 rounded-full ${file ? 'bg-yellow-200 text-brand-charcoal' : 'bg-slate-100 text-slate-500'}`}>
                        <UploadIcon className="w-8 h-8" />
                    </div>
                    <p className="mt-3 font-semibold text-brand-black">{label}</p>
                    <p className="text-sm text-slate-500">{description}</p>
                    {file && <p className="mt-2 text-sm font-medium text-brand-charcoal break-all">{file.name}</p>}
                </div>
                <input ref={inputRef} id={id} type="file" className="hidden" accept={accept} onChange={handleFileSelect} />
            </label>
             {isPdf && <PdfConversionHelper />}
        </div>
    );
};

export const FileUploader: React.FC<FileUploaderProps> = ({ onParse, questionFile, setQuestionFile, addendumFile, setAddendumFile }) => {
    
    const handleSubmit = () => {
        if (questionFile && addendumFile) {
            onParse(questionFile, addendumFile);
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-brand-black">Intelligent Exam Parser</h1>
                <p className="text-slate-600 mt-1 max-w-3xl mx-auto">Upload a question paper and its addendum to automatically structure and link them. <strong className="text-brand-yellow">DOCX files are recommended</strong> for best results.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <FileInput
                    id="question-paper-upload"
                    label="Question Paper"
                    description="Drop DOCX or PDF here"
                    file={questionFile}
                    onFileChange={setQuestionFile}
                    accept=".pdf,.docx"
                />
                <FileInput
                    id="addendum-upload"
                    label="Addendum / Answers"
                    description="Drop DOCX or PDF here"
                    file={addendumFile}
                    onFileChange={setAddendumFile}
                    accept=".pdf,.docx"
                />
            </div>
            
            <div className="text-center">
                <Button
                    onClick={handleSubmit}
                    disabled={!questionFile || !addendumFile}
                    size="lg"
                >
                    Parse Documents
                </Button>
            </div>
        </div>
    );
};