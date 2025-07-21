
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Loader } from '../Loader';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;
}

interface DocumentPreviewProps {
  file: File;
}

const renderDocx = async (file: File, container: HTMLElement) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    container.innerHTML = result.value;
    // Post-process to style tables
    container.querySelectorAll('table').forEach(table => {
        (table as HTMLElement).style.borderCollapse = 'collapse';
        (table as HTMLElement).style.width = '100%';
        (table as HTMLElement).style.marginBottom = '1em';
    });
    container.querySelectorAll('th, td').forEach(cell => {
        (cell as HTMLElement).style.border = '1px solid #ddd';
        (cell as HTMLElement).style.padding = '8px';
        (cell as HTMLElement).style.textAlign = 'left';
    });
     container.querySelectorAll('th').forEach(cell => {
        (cell as HTMLElement).style.backgroundColor = '#f2f2f2';
     });
};

const renderPdf = async (file: File, container: HTMLElement) => {
    const uri = URL.createObjectURL(file);
    try {
        const pdf = await pdfjsLib.getDocument(uri).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const pageContainer = document.createElement('div');
            pageContainer.className = "pdf-page-container";
            pageContainer.style.marginBottom = '1rem';
            pageContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            
            pageContainer.appendChild(canvas);
            container.appendChild(pageContainer);

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
            }
        }
    } finally {
        URL.revokeObjectURL(uri);
    }
};

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ file }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const renderFile = async () => {
            if (!previewRef.current) return;
            
            setIsLoading(true);
            setError(null);
            previewRef.current.innerHTML = ''; // Clear previous content

            try {
                const extension = file.name.split('.').pop()?.toLowerCase();
                if (extension === 'pdf') {
                    await renderPdf(file, previewRef.current);
                } else if (extension === 'docx') {
                    await renderDocx(file, previewRef.current);
                } else {
                    setError('Unsupported file type for preview.');
                }
            } catch (e) {
                console.error('Failed to render preview:', e);
                setError(e instanceof Error ? e.message : 'Failed to render document preview.');
            } finally {
                setIsLoading(false);
            }
        };

        if (file) {
            renderFile();
        }
    }, [file]);

    return (
        <div className="bg-slate-50 border border-slate-300 rounded-xl h-[85vh] flex flex-col">
            <h2 className="text-lg font-semibold text-brand-navy p-4 border-b border-slate-200 flex-shrink-0">
                Document Preview
            </h2>
            <div className="flex-grow overflow-y-auto p-4">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Loader className="h-10 w-10 text-brand-green"/>
                        <p className="mt-3">Rendering preview...</p>
                    </div>
                )}
                {error && <div className="text-center text-red-600 p-4">{error}</div>}
                <div 
                    ref={previewRef} 
                    className="prose prose-sm max-w-none bg-white p-4 rounded-md shadow-inner"
                ></div>
            </div>
        </div>
    );
};
