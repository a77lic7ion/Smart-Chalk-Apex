
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ExtractedPdfData, ParsedExamData, ExamQuestion, ExamAnnexure } from '../types';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs';
}

const FIGURE_CAPTURE_REGEX = /\b(FIGURE|FIGUUR)\s+[A-Z0-9]+/i;


/**
 * Extracts data from a DOCX file by converting it to HTML and then recursively walking the DOM
 * to preserve the order of text, images, and tables.
 * @param file The DOCX file to process.
 * @returns A promise that resolves to an object containing extracted text, images, and tables.
 */
async function extractDataFromDocx(file: File): Promise<ExtractedPdfData> {
    const arrayBuffer = await file.arrayBuffer();
    const options = {
        convertImage: mammoth.images.imgElement((element) => {
            return element.read("base64").then(imageBuffer => ({
                src: `data:${element.contentType};base64,${imageBuffer}`
            }));
        })
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    const html = result.value;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const textLines: { page: number; text: string }[] = [];
    const images: { page: number; url: string }[] = [];
    const tables: { page: number; html: string }[] = [];
    let pageCounter = 1; // Simulate pages for consistent data structure

    function walk(node: ChildNode) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) textLines.push({ page: pageCounter, text });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'IMG') {
                const imgElement = element as HTMLImageElement;
                images.push({ page: pageCounter, url: imgElement.src });
            } else if (element.tagName === 'TABLE') {
                tables.push({ page: pageCounter, html: element.outerHTML });
            } else if (element.tagName === 'P' || element.tagName === 'DIV' || element.tagName === 'LI') {
                element.childNodes.forEach(walk);
            }
             else {
                element.childNodes.forEach(walk);
            }
        }
    }

    doc.body.childNodes.forEach(walk);

    return { textLines, images, tables };
}


/**
 * Extracts all text and images from a single PDF file.
 * This version has an improved text extraction logic that attempts to preserve line breaks.
 * @param file The PDF file to process.
 * @returns A promise that resolves to an object containing extracted text lines and image data URLs.
 */
export async function extractDataFromPdf(file: File): Promise<ExtractedPdfData> {
    const uri = URL.createObjectURL(file);
    const textLines: { page: number; text: string }[] = [];
    const images: { page: number; url: string }[] = [];

    try {
        const pdf = await pdfjsLib.getDocument(uri).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            
            // --- Improved Text Extraction ---
            const textContent = await page.getTextContent();
            let lastY = -1;
            let pageText = '';
            // Sort items by their vertical position, then horizontal
            const items = (textContent.items as any[]).sort((a, b) => {
                if (a.transform[5] < b.transform[5]) return 1;
                if (a.transform[5] > b.transform[5]) return -1;
                if (a.transform[4] < b.transform[4]) return -1;
                if (a.transform[4] > b.transform[4]) return 1;
                return 0;
            });

            for (const item of items) {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) { // Threshold for new line
                    pageText += '\n';
                }
                pageText += item.str;
                lastY = item.transform[5];
            }
            textLines.push({ page: i, text: pageText });
            // --- End Improved Text Extraction ---


            // Extract images
            const operatorList = await page.getOperatorList();
            
            const imageOps = operatorList.fnArray.reduce((acc, op, idx) => {
                if (op === pdfjsLib.OPS.paintImageXObject) {
                    acc.push(operatorList.argsArray[idx][0]);
                }
                return acc;
            }, [] as string[]);


            for (const imageName of imageOps) {
                try {
                    const imgData = await (page as any).objs.get(imageName);
                    if (!imgData || !imgData.data) continue;

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    canvas.width = imgData.width;
                    canvas.height = imgData.height;
                    
                    const pixelData = new Uint8ClampedArray(imgData.width * imgData.height * 4);
                    let dataIndex = 0;
                    // Handle Grayscale or RGB
                    const channels = imgData.data.length / (imgData.width * imgData.height);
                    if (channels === 1) { // Grayscale
                         for(let j=0; j < imgData.data.length; j++){
                            pixelData[dataIndex++] = imgData.data[j];
                            pixelData[dataIndex++] = imgData.data[j];
                            pixelData[dataIndex++] = imgData.data[j];
                            pixelData[dataIndex++] = 255;
                        }
                    } else { // Assume RGB
                         for(let j=0; j < imgData.data.length && dataIndex < pixelData.length; ){
                            pixelData[dataIndex++] = imgData.data[j++];
                            pixelData[dataIndex++] = imgData.data[j++];
                            pixelData[dataIndex++] = imgData.data[j++];
                            pixelData[dataIndex++] = 255;
                        }
                    }
                    
                    const imageData = new ImageData(pixelData, imgData.width, imgData.height);
                    ctx.putImageData(imageData, 0, 0);
                    images.push({ page: i, url: canvas.toDataURL() });

                } catch(e) {
                    // This error is often "Requesting object that isn't resolved yet", which can happen with complex PDFs.
                    // We log it but don't crash the whole process.
                    console.warn(`Could not process image ${imageName} on page ${i}.`, e);
                }
            }
        }
    } catch (e) {
        URL.revokeObjectURL(uri);
        throw e;
    } finally {
        URL.revokeObjectURL(uri);
    }
    
    return { textLines, images, tables: [] }; // PDF parsing for tables is not implemented
}

/**
 * Dispatches file to the correct parser based on its extension.
 * @param file The file to process.
 * @returns A promise that resolves to the extracted data.
 */
export async function extractDataFromFile(file: File): Promise<ExtractedPdfData> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') {
        return extractDataFromPdf(file);
    }
    if (extension === 'docx') {
        return extractDataFromDocx(file);
    }
    throw new Error(`Unsupported file type: .${extension}. Please upload a DOCX or PDF file.`);
}


/**
 * Structures and links content from question and addendum PDF data.
 * @param questionData Extracted data from the question paper PDF.
 * @param addendumData Extracted data from the addendum/answer sheet PDF.
 * @returns An object containing the final list of questions with linked annexures and any unmatched annexures.
 */
export function structureContent(questionData: ExtractedPdfData, addendumData: ExtractedPdfData): ParsedExamData {
    const LINK_REGEX = /(?:see|use|refer to) annexure ([A-Z]) for question (\d+(\.\d+)*)/gi;

    const annexureLinks: Record<string, string> = {}; // { "questionNumber": "annexureId" }
    
    const allQuestionText = questionData.textLines.map(line => line.text).join('\n');
    let match;
    while ((match = LINK_REGEX.exec(allQuestionText)) !== null) {
        const annexureId = match[1];
        const questionNumber = match[2];
        annexureLinks[questionNumber] = annexureId;
    }

    const { questions } = parseQuestions(questionData);
    const { annexures } = parseAnnexures(addendumData);

    const unmatchedAnnexures = [...annexures];
    const finalQuestions = questions.map(q => {
        const linkedAnnexureId = annexureLinks[q.questionNumber];
        if (linkedAnnexureId) {
            const annexureIndex = unmatchedAnnexures.findIndex(a => a.annexureId === linkedAnnexureId);
            if (annexureIndex > -1) {
                const [foundAnnexure] = unmatchedAnnexures.splice(annexureIndex, 1);
                return { ...q, annexure: foundAnnexure };
            }
        }
        return q;
    });

    return { questions: finalQuestions, unmatchedAnnexures };
}

function parseQuestions(data: ExtractedPdfData): { questions: ExamQuestion[] } {
    const questions: ExamQuestion[] = [];
    let currentQuestion: ExamQuestion | null = null;
    let currentSection: string | undefined = undefined;

    const SECTION_REGEX = /^(SECTION|AFDELING)\s*([A-Z]):\s*(.*)/i;
    const QUESTION_HEADER_REGEX = /^(QUESTION|VRAAG)\s*\d+/i;
    // This regex now avoids matching 4-digit numbers like years by using a negative lookahead
    const SUB_QUESTION_REGEX = /^(?!\d{4}$)\d{1,3}(\.\d+){0,3}/;
    const MARKS_REGEX = /\s*(\(\d+\)|\[\d+\])$/;
    
    const allContent = [
        ...data.textLines.flatMap(item => 
            item.text.split('\n').map(line => ({ type: 'text', text: line, page: item.page }))
        ),
        ...data.tables.map(table => ({ type: 'table', html: table.html, page: table.page, text: table.html }))
    ].sort((a, b) => a.page - b.page);
    
    const imagesByPage: { [page: number]: string[] } = {};
    for (const img of data.images) {
        if (!imagesByPage[img.page]) imagesByPage[img.page] = [];
        imagesByPage[img.page].push(img.url);
    }
    const usedImages = new Set<string>();

    for (const item of allContent) {
        const text = item.type === 'text' ? item.text.trim() : item.text;
        if (!text) continue;

        const sectionMatch = text.match(SECTION_REGEX);
        if (sectionMatch) {
            currentSection = sectionMatch[0];
            currentQuestion = null; // Reset question when a new section starts
            continue;
        }

        // Check for question headers like "QUESTION 1" or just a number like "1.1"
        const questionMatch = text.match(QUESTION_HEADER_REGEX) || text.match(SUB_QUESTION_REGEX);
        
        if (questionMatch) {
             const questionNumber = questionMatch[0];
             if (!questionNumber) continue;

            let cleanText = text.replace(questionMatch[0], '').trim();
            let marks: string | undefined;

            const marksMatch = cleanText.match(MARKS_REGEX);
            if (marksMatch) {
                marks = marksMatch[1];
                cleanText = cleanText.replace(MARKS_REGEX, '').trim();
            }

            let imageData: string | undefined = undefined;
            let imageRequired = false;
            
            const pageImages = imagesByPage[item.page] || [];
            if (FIGURE_CAPTURE_REGEX.test(cleanText)) {
                const nextImage = pageImages.find(img => !usedImages.has(img));
                if (nextImage) {
                    imageData = nextImage;
                    usedImages.add(nextImage);
                } else {
                    imageRequired = true;
                }
            }
            
            currentQuestion = {
                id: crypto.randomUUID(),
                questionNumber,
                text: cleanText,
                page: item.page,
                images: [],
                imageRequired,
                imageData,
                section: currentSection,
                marks: marks,
            };
            questions.push(currentQuestion);
        } else if (currentQuestion) {
            let lineToAdd = text;

            const marksMatch = item.type === 'text' && lineToAdd.match(MARKS_REGEX);
            if (marksMatch && !currentQuestion.marks) {
                currentQuestion.marks = marksMatch[1];
                lineToAdd = lineToAdd.replace(MARKS_REGEX, '').trim();
            }
            
            if (lineToAdd) {
                currentQuestion.text += (item.type === 'table' ? lineToAdd : '\n' + lineToAdd);
            }
            
            if (FIGURE_CAPTURE_REGEX.test(lineToAdd) && !currentQuestion.imageData) {
                 const pageImages = imagesByPage[currentQuestion.page] || [];
                 const nextImage = pageImages.find(img => !usedImages.has(img));
                 if (nextImage) {
                    currentQuestion.imageData = nextImage;
                    usedImages.add(nextImage);
                    currentQuestion.imageRequired = false;
                 } else {
                    currentQuestion.imageRequired = true;
                 }
            }
        }
    }

    return { questions };
}


function parseAnnexures(data: ExtractedPdfData): { annexures: ExamAnnexure[] } {
    const annexures: ExamAnnexure[] = [];
    let currentAnnexure: ExamAnnexure | null = null;
    const ANNEXURE_REGEX = /^(ANNEXURE|BYLAE)\s+([A-Z])/i;

    const allTextLines = data.textLines.map(pageData => 
        pageData.text.split('\n').map(lineText => ({ page: pageData.page, text: lineText.trim() }))
    ).flat();
    
    allTextLines.forEach(({ page, text }) => {
        const annexureMatch = text.match(ANNEXURE_REGEX);

        if (annexureMatch) {
            const annexureId = annexureMatch[2];
            currentAnnexure = {
                id: crypto.randomUUID(),
                annexureId,
                text: text,
                page,
                images: data.images.filter(img => img.page === page).map(img => img.url),
            };
            annexures.push(currentAnnexure);
        } else if (currentAnnexure) {
            // Append text to the current annexure, but only if it's on the same or next page
            if (page <= currentAnnexure.page + 1) {
                currentAnnexure.text += '\n' + text;
                // Associate images from subsequent pages if they exist
                 const pageImages = data.images.filter(img => img.page === page).map(img => img.url);
                 if(pageImages.length > 0) {
                     currentAnnexure.images.push(...pageImages);
                 }
            } else {
                 currentAnnexure = null;
            }
        }
    });
    
    return { annexures };
}