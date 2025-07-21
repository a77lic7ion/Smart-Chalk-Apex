import React from 'react';
import { LightBulbIcon } from '../Icons';

export const TipBox: React.FC = () => {
    return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-blue-500">
                    <LightBulbIcon className="h-5 w-5 mt-0.5" />
                </div>
                <div>
                    <h4 className="font-semibold text-blue-900">Pro Tip: Paste Images from Snippets</h4>
                    <p className="text-blue-800 mt-1">
                        Use the Windows snipping tool (<strong className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">Win + Shift + S</strong>) or a similar tool on Mac to copy any part of your reference document, then paste it directly into a question field to add it as an image.
                    </p>
                </div>
            </div>
        </div>
    );
};