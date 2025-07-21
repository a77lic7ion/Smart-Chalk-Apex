
import React from 'react';
import { ExclamationTriangleIcon } from '../Icons';

export const PdfConversionHelper: React.FC = () => {
    return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-yellow-900">For Best Results, Convert PDF to DOCX</h4>
                    <p className="text-yellow-800 mt-1">
                        Parsing images and tables from PDFs can be unreliable. For maximum accuracy, we strongly recommend converting your PDF to a DOCX file before uploading.
                    </p>
                     <a 
                        href="https://www.ilovepdf.com/pdf_to_word" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block mt-2 text-xs font-bold text-blue-700 hover:text-blue-900 underline bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-md transition-colors"
                    >
                        Use a free online converter →
                    </a>
                </div>
            </div>
        </div>
    );
};
