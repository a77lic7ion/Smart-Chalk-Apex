import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

const PDF_WORKER_URL = pdfWorkerUrl;

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
}

const readTxtFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

const getPdfBytes = async (file: File): Promise<Uint8Array> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const header = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(1024, bytes.length)));

    if (bytes.byteLength < 8 || !header.includes('%PDF-')) {
        throw new Error(
            'This file is labelled as a PDF, but it does not contain a valid PDF header. ' +
            'Please download the document again or upload the original PDF file rather than a web page or preview file.'
        );
    }

    return bytes;
};

const friendlyPdfError = (error: unknown): Error => {
    const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown PDF error');
    const isStructureError = /invalid pdf structure|invalidpdfexception|xref|trailer|startxref|unexpected eof/i.test(rawMessage);

    if (isStructureError) {
        return new Error(
            'SmartChalk could not read the internal structure of this PDF. ' +
            'Please download a fresh original copy of the document and try again; do not upload a browser preview, an HTML download page, or a partially downloaded file.'
        );
    }

    return new Error(`SmartChalk could not read this PDF. ${rawMessage}`);
};

/**
 * Opens a PDF through one shared path for curriculum sources, imports, previews, and exam parsing.
 * It verifies the PDF header before parsing and retries without a web worker when a browser-worker
 * failure is mistaken for a document-structure failure.
 */
export const loadPdfDocument = async (file: File) => {
    const bytes = await getPdfBytes(file);

    const open = (disableWorker: boolean) => pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        disableWorker,
        stopAtErrors: false,
    }).promise;

    try {
        return await open(false);
    } catch (primaryError) {
        try {
            return await open(true);
        } catch {
            throw friendlyPdfError(primaryError);
        }
    }
};

const readPdfFile = async (file: File): Promise<string> => {
    const pdf = await loadPdfDocument(file);
    try {
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
        }
        return textContent;
    } finally {
        await pdf.destroy();
    }
};

const readDocxFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

export const parseFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    if (extension === 'txt' || mimeType === 'text/plain') {
        return readTxtFile(file);
    }
    if (extension === 'pdf' || mimeType === 'application/pdf') {
        return readPdfFile(file);
    }
    if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return readDocxFile(file);
    }
    if (extension === 'doc' && mimeType === 'application/msword') {
        throw new Error('.doc files are not supported. Please convert to .docx or save as a .txt file.');
    }

    throw new Error(`Unsupported file type: .${extension}. Please use .txt, .pdf, or .docx.`);
};

export const convertPdfToImages = async (file: File): Promise<string[]> => {
    const images: string[] = [];
    const pdf = await loadPdfDocument(file);

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Could not get canvas context');
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.9));
        }
    } finally {
        await pdf.destroy();
    }

    return images;
};
