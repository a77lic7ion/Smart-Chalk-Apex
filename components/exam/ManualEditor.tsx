import React, { useState, useCallback } from 'react';
import type { ManualExam, ManualSection, ManualQuestionGroup, ManualSubQuestion, UserProfile } from '../../types';
import { Button } from '../Button';
import { PlusIcon, TrashIcon } from '../Icons';
import { TipBox } from './TipBox';
import { db } from '../../db';
import { exportManualExamAsDocx } from '../../utils/exportService';


const EditableSubQuestion: React.FC<{
    question: ManualSubQuestion;
    onUpdate: (id: string, newQuestion: Partial<ManualSubQuestion>) => void;
    onDelete: (id: string) => void;
}> = ({ question, onUpdate, onDelete }) => {

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        onUpdate(question.id, { imageData: event.target?.result as string });
                    };
                    reader.readAsDataURL(file);
                }
                return;
            }
        }
    };

    return (
        <div className="ml-6 space-y-2 border-l-2 border-slate-300 py-2 pl-4">
            <div className="flex items-start gap-2">
                <input
                    type="text"
                    value={question.questionNumber}
                    onChange={(e) => onUpdate(question.id, { questionNumber: e.target.value })}
                    placeholder="e.g., 1.1"
                    className="font-semibold p-1 border-b-2 border-transparent focus:border-brand-yellow outline-none w-20"
                />
                 <textarea
                    value={question.text}
                    onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                    onPaste={handlePaste}
                    placeholder="Paste sub-question text and images here..."
                    className="flex-grow p-1 border-b-2 border-transparent focus:border-brand-yellow outline-none resize-y text-sm"
                    rows={2}
                />
                 <input
                    type="text"
                    value={question.marks}
                    onChange={(e) => onUpdate(question.id, { marks: e.target.value })}
                    placeholder="Marks"
                    className="p-1 border-b-2 border-transparent focus:border-brand-yellow outline-none w-20 text-right text-sm"
                />
                <Button onClick={() => onDelete(question.id)} variant="ghost" size="sm" className="ml-auto flex-shrink-0">
                    <TrashIcon className="h-4 w-4 text-brand-black" />
                </Button>
            </div>
            {question.imageData && (
                <div className="ml-8 pl-1">
                     <img src={question.imageData} alt="Pasted content" className="max-h-48 max-w-xs rounded-lg border border-slate-300 bg-white p-1" />
                </div>
            )}
        </div>
    );
};

const EditableQuestionGroup: React.FC<{
    group: ManualQuestionGroup;
    onUpdate: (id: string, data: Partial<ManualQuestionGroup>) => void;
    onDelete: (id: string) => void;
    onSubQuestionUpdate: (id: string, data: Partial<ManualSubQuestion>) => void;
    onSubQuestionAdd: () => void;
    onSubQuestionDelete: (id: string) => void;
}> = ({ group, onUpdate, onDelete, onSubQuestionUpdate, onSubQuestionAdd, onSubQuestionDelete }) => {
    return (
        <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 rounded-lg border border-slate-200 bg-white p-2">
                <input
                    type="text"
                    value={group.questionNumber}
                    onChange={(e) => onUpdate(group.id, { questionNumber: e.target.value })}
                    placeholder="e.g., QUESTION 1"
                    className="text-md font-bold text-brand-black bg-transparent outline-none focus:border-b-2 focus:border-brand-yellow flex-grow"
                />
                <Button onClick={() => onDelete(group.id)} variant="ghost" size="sm" className="ml-auto">
                    <TrashIcon className="h-4 w-4 text-brand-black"/>
                </Button>
            </div>
            <div className="space-y-3 p-2">
                <textarea
                    value={group.mainQuestionText}
                    onChange={(e) => onUpdate(group.id, { mainQuestionText: e.target.value })}
                    placeholder="Enter main question text or instructions here..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-brand-charcoal shadow-none outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/40"
                    rows={2}
                />
                <textarea
                    value={group.notes}
                    onChange={(e) => onUpdate(group.id, { notes: e.target.value })}
                    placeholder="Private notes (will not be exported)..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs italic text-brand-charcoal shadow-none outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/40"
                    rows={1}
                />
                <div className="space-y-2">
                    {group.subQuestions.map(sq => (
                        <EditableSubQuestion 
                            key={sq.id}
                            question={sq}
                            onUpdate={(id, data) => onSubQuestionUpdate(id, data)}
                            onDelete={(id) => onSubQuestionDelete(id)}
                        />
                    ))}
                </div>
                 <Button onClick={onSubQuestionAdd} variant="ghost" size="sm" className="mt-2 border border-dashed border-slate-300 text-brand-black">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Sub-question
                </Button>
            </div>
        </div>
    )
}

const createNewExam = (userId: string): ManualExam => ({
    id: crypto.randomUUID(),
    userId,
    name: 'Untitled Exam',
    sections: [],
    createdAt: Date.now()
});

export const ManualEditor: React.FC<{ user: UserProfile, initialData?: ManualExam | null }> = ({ user, initialData }) => {
    const [exam, setExam] = useState<ManualExam>(initialData || createNewExam(user.sub));

    // --- State Update Handlers ---
    const updateExamName = (name: string) => setExam(prev => ({ ...prev, name }));

    const addSection = () => {
        const newSection: ManualSection = {
            id: crypto.randomUUID(),
            title: `SECTION ${String.fromCharCode(65 + exam.sections.length)}`,
            questions: [],
        };
        setExam(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    };

    const updateSection = (id: string, data: Partial<ManualSection>) => {
        setExam(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, ...data } : s)
        }));
    };
    
    const deleteSection = (id: string) => {
        setExam(prev => ({...prev, sections: prev.sections.filter(s => s.id !== id) }));
    };

    const addQuestionGroup = (sectionId: string) => {
        const newGroup: ManualQuestionGroup = {
            id: crypto.randomUUID(),
            questionNumber: '',
            mainQuestionText: '',
            notes: '',
            subQuestions: []
        };
        setExam(prev => ({ ...prev, sections: prev.sections.map(s =>
            s.id === sectionId ? { ...s, questions: [...s.questions, newGroup] } : s
        )}));
    };

    const updateQuestionGroup = (sectionId: string, groupId: string, data: Partial<ManualQuestionGroup>) => {
        setExam(prev => ({...prev, sections: prev.sections.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(qg => qg.id === groupId ? {...qg, ...data} : qg)
        } : s)}));
    };

    const deleteQuestionGroup = (sectionId: string, groupId: string) => {
        setExam(prev => ({...prev, sections: prev.sections.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.filter(qg => qg.id !== groupId)
        } : s)}));
    };

    const addSubQuestion = (sectionId: string, groupId: string) => {
        const newSubQuestion: ManualSubQuestion = {
            id: crypto.randomUUID(),
            questionNumber: '',
            text: '',
            marks: ''
        };
         setExam(prev => ({...prev, sections: prev.sections.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(qg => qg.id === groupId ? {
                ...qg, subQuestions: [...qg.subQuestions, newSubQuestion]
            } : qg)
        } : s)}));
    };

    const updateSubQuestion = (sectionId: string, groupId: string, subId: string, data: Partial<ManualSubQuestion>) => {
        setExam(prev => ({...prev, sections: prev.sections.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(qg => qg.id === groupId ? {
                ...qg, subQuestions: qg.subQuestions.map(sq => sq.id === subId ? {...sq, ...data} : sq)
            } : qg)
        } : s)}));
    };

    const deleteSubQuestion = (sectionId: string, groupId: string, subId: string) => {
         setExam(prev => ({...prev, sections: prev.sections.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(qg => qg.id === groupId ? {
                ...qg, subQuestions: qg.subQuestions.filter(sq => sq.id !== subId)
            } : qg)
        } : s)}));
    };
    
    // --- Save and Export ---
    const handleSave = async () => {
        const examToSave: ManualExam = {
            ...exam,
            createdAt: Date.now(),
            userId: user.sub,
            syncStatus: 'dirty'
        };
        try {
            await db.savedManualExams.put(examToSave);
            alert(`Exam "${exam.name}" saved locally. It will be synced with the server shortly.`);
        } catch (e) {
            console.error("Failed to save manual exam locally:", e);
            alert("Error: Could not save exam to the database locally.");
        }
    };
    
    const handleExport = async () => {
        try {
            await exportManualExamAsDocx(exam);
        } catch (e) {
            console.error("Failed to export manual exam:", e);
            alert("Error: Could not export exam as PDF.");
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl h-[85vh] flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-200 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <input
                    type="text"
                    value={exam.name}
                    onChange={(e) => updateExamName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-brand-black outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/40"
                />
                <div className="flex gap-2">
                    <Button onClick={handleExport} variant="secondary">Export PDF</Button>
                    <Button onClick={handleSave}>Save Exam</Button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <TipBox />
                {exam.sections.map(section => (
                    <div key={section.id} className="rounded-xl border border-slate-200 bg-brand-paper p-4">
                        <div className="flex items-center gap-2 mb-2">
                             <input
                                type="text"
                                value={section.title}
                                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                className="text-md font-bold text-brand-black bg-transparent outline-none focus:border-b-2 focus:border-brand-yellow flex-grow"
                            />
                            <Button onClick={() => deleteSection(section.id)} variant="ghost" size="sm" className="ml-auto">
                                <TrashIcon className="h-4 w-4 text-brand-black"/>
                            </Button>
                        </div>
                        <div className="space-y-4">
                           {section.questions.map(qg => (
                               <EditableQuestionGroup 
                                    key={qg.id}
                                    group={qg}
                                    onDelete={() => deleteQuestionGroup(section.id, qg.id)}
                                    onUpdate={(id, data) => updateQuestionGroup(section.id, id, data)}
                                    onSubQuestionAdd={() => addSubQuestion(section.id, qg.id)}
                                    onSubQuestionUpdate={(subId, data) => updateSubQuestion(section.id, qg.id, subId, data)}
                                    onSubQuestionDelete={(subId) => deleteSubQuestion(section.id, qg.id, subId)}
                               />
                           ))}
                        </div>
                        <Button onClick={() => addQuestionGroup(section.id)} variant="secondary" size="sm" className="mt-4">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Main Question
                        </Button>
                    </div>
                ))}

                <Button onClick={addSection} variant="ghost" className="w-full border-2 border-dashed border-slate-300 text-brand-black">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Section
                </Button>
            </div>
        </div>
    );
};