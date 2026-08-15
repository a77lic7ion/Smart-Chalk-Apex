import React from 'react';
import { LightBulbIcon } from '../Icons';

export const TipBox: React.FC = () => {
    return (
        <div className="mb-4 rounded-xl border border-brand-yellow bg-brand-paper p-4 text-sm">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-brand-yellow">
                    <LightBulbIcon className="h-5 w-5 mt-0.5" />
                </div>
                <div>
                    <h4 className="font-semibold text-brand-black">Pro Tip: Paste Images from Snippets</h4>
                    <p className="mt-1 text-brand-black">
                        Use the Windows snipping tool (<strong className="rounded bg-brand-yellow px-1.5 py-0.5 font-mono text-brand-black">Win + Shift + S</strong>) or a similar tool on Mac to copy any part of your reference document, then paste it directly into a question field to add it as an image.
                    </p>
                </div>
            </div>
        </div>
    );
};