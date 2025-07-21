import React from 'react';
import type { LessonPlan, ImagePlaceholder } from '../types';
import { ImagePlaceholderCard } from './ImagePlaceholderCard';
import { FormattedText } from './FormattedText';

// A simple regex to find our placeholder tags
const placeholderRegex = /\[IMAGE_PLACEHOLDER:([\w-]+)\]/g;

interface LessonPlanCardProps {
    lessonPlan: LessonPlan;
    placeholders: ImagePlaceholder[];
    onImageUpload: (placeholderId: string, imageData: string, status: ImagePlaceholder['status']) => void;
}

export const LessonPlanCard: React.FC<LessonPlanCardProps> = ({ lessonPlan, placeholders, onImageUpload }) => {
    const parts = lessonPlan.content.split(placeholderRegex);
    
    const contentWithPlaceholders = parts.reduce((acc, part, index) => {
        // Even indices are text parts, odd are placeholder IDs
        if (index % 2 === 0) {
            acc.push(<FormattedText key={`text-${index}`} text={part} />);
        } else {
            const placeholderId = part;
            const placeholder = placeholders.find(p => p.placeholderId === placeholderId);
            if (placeholder) {
                acc.push(
                    <div key={`placeholder-${placeholder.id}`} className="my-6">
                        <ImagePlaceholderCard 
                            placeholder={placeholder}
                            onImageUpload={onImageUpload}
                            subject={lessonPlan.params.subject}
                            topic={lessonPlan.params.topic}
                        />
                    </div>
                );
            }
        }
        return acc;
    }, [] as React.ReactNode[]);


    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 prose prose-slate max-w-none">
            {contentWithPlaceholders}
             {lessonPlan.questions.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                    <h2 className="text-lg font-semibold text-slate-800">Assessment Questions</h2>
                    <ul className="list-decimal pl-5 mt-4 space-y-4">
                        {lessonPlan.questions.map(q => (
                            <li key={q.id}>
                                <p className="font-semibold text-slate-700 mb-1">{q.question}</p>
                                <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg"><strong>Answer:</strong> {q.answer}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};