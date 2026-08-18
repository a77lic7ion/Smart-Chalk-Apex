import React, { useState, useRef, ChangeEvent } from 'react';
import type { TrainingQuestion } from '../types';
import { PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon, UploadIcon } from './Icons';
import { CURRICULUM_OPTIONS, GRADES, SUBJECTS } from '../constants';
import { Button } from './Button';
import { FormattedText } from './FormattedText';

// A display-only card for when not in editing mode
const DisplayCard: React.FC<{ questionData: TrainingQuestion }> = ({ questionData }) => (
    <div className="border border-slate-200 rounded-xl p-4 !bg-white !text-brand-black transition-shadow hover:shadow-lg">
        {questionData.imageData && (
             <div className="mb-4 rounded-lg overflow-hidden border border-slate-200">
                <img src={questionData.imageData} alt="Question visual aid" className="w-full h-auto object-contain max-h-64 bg-slate-50" />
            </div>
        )}
        <div className="mb-3 !text-brand-black prose prose-sm max-w-none">
            <div className="mb-1 font-semibold !text-brand-black">
                <span className="mr-2 font-bold !text-brand-yellow">Q:</span>
                <FormattedText text={questionData.question} as="div" className="inline !text-brand-black" />
            </div>
            <div className="!text-brand-black">
                <span className="mr-2 font-bold !text-slate-700">A:</span>
                 <FormattedText text={questionData.answer} as="div" className="inline !text-brand-black" />
            </div>
        </div>
        <div className="border-t border-slate-200 pt-3 text-sm !text-slate-700 space-y-2">
            <div className="flex flex-wrap items-center gap-2" aria-label="Question metadata">
                <span className="inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold !text-brand-black shadow-sm">{questionData.curriculum}</span>
                <span className="inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold !text-brand-black shadow-sm">{questionData.grade}</span>
                <span className="inline-flex max-w-full items-center rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold !text-brand-black shadow-sm break-words">{questionData.subject}</span>
            </div>
            <p className="break-words pt-1 text-xs font-medium !text-brand-black">{questionData.standard}</p>
        </div>
    </div>
);


interface EditableQuestionCardProps {
  questionData: TrainingQuestion;
  onUpdate: (updatedQuestion: TrainingQuestion) => void;
  onDelete: (questionId: string) => void;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        {children}
    </div>
);

const TextAreaInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; name: string; rows?: number }> = ({ value, onChange, name, rows=2 }) => (
    <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow resize-y transition-shadow"
    />
);

const SelectInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; name: string; options: string[] }> = ({ value, onChange, name, options }) => (
    <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow transition-shadow"
    >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const TextInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string }> = ({ value, onChange, name }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow transition-shadow"
    />
);

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

export const EditableQuestionCard: React.FC<EditableQuestionCardProps> = ({ questionData, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<TrainingQuestion>(questionData);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const handleEditToggle = () => {
        if (isEditing) {
            setEditedData(questionData); // Reset changes if canceling
            setImageError(null);
        }
        setIsEditing(!isEditing);
    };

    const handleSave = () => {
        onUpdate(editedData);
        setIsEditing(false);
        setImageError(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value } as TrainingQuestion));
    };

    const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageError('Please upload a valid image file (PNG, JPG, etc.).');
            return;
        }

        setImageError(null);
        try {
            // Upload to Vercel Blob storage
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', 'questions');
            
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
            setEditedData(prev => ({ ...prev, imageData: imageUrl }));
        } catch(e) {
            setImageError(e instanceof Error ? e.message : "Failed to upload image.");
        }
    };

    if (!isEditing) {
        return (
            <div className="relative group">
                <DisplayCard questionData={questionData} />
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={handleEditToggle} className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-slate-600 hover:text-brand-yellow hover:bg-white shadow-md border border-slate-200">
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(questionData.id)} className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-slate-600 hover:text-red-600 hover:bg-white shadow-md border border-slate-200">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="border-2 border-brand-yellow rounded-xl p-4 bg-white shadow-2xl relative">
            <div className="space-y-4">
                <FormField label="Question">
                    <TextAreaInput name="question" value={editedData.question} onChange={handleChange} />
                </FormField>
                <FormField label="Answer">
                    <TextAreaInput name="answer" value={editedData.answer} onChange={handleChange} rows={3} />
                </FormField>
                 <FormField label="Standard">
                   <TextInput name="standard" value={editedData.standard} onChange={handleChange} />
                </FormField>
                <FormField label="Image">
                    <div className="flex items-start gap-4">
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm">
                            <UploadIcon className="h-4 w-4 mr-2" />
                            {editedData.imageData ? 'Change' : 'Upload'}
                        </Button>
                        {editedData.imageData && (
                            <img src={editedData.imageData} alt="Question preview" className="h-20 w-auto rounded border p-1" />
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
                    {imageError && <p className="text-xs text-red-600 mt-2">{imageError}</p>}
                </FormField>
                <div className="grid grid-cols-3 gap-4">
                    <FormField label="Curriculum">
                        <SelectInput name="curriculum" value={editedData.curriculum} onChange={handleChange} options={CURRICULUM_OPTIONS} />
                    </FormField>
                    <FormField label="Grade">
                       <SelectInput name="grade" value={editedData.grade} onChange={handleChange} options={GRADES} />
                    </FormField>
                    <FormField label="Subject">
                       <SelectInput name="subject" value={editedData.subject} onChange={handleChange} options={SUBJECTS} />
                    </FormField>
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                <Button onClick={handleEditToggle} variant="ghost">
                    Cancel
                </Button>
                <Button onClick={handleSave} variant="primary">
                    Save Changes
                </Button>
            </div>
        </div>
    );
};
