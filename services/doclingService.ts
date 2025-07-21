import { convertPdfToImages, parseFile } from '../utils/fileParser';
import { restructureTestAllowingVisuals } from './aiService';
import { extractQuestionsFromImagesWithOpenAI } from './openai';
import type { AISettings, TrainingQuestion, Curriculum } from '../types';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const getDoclingSystemInstruction = (subject: string, grade: string, documentTitle: string): string => {
    return `You are an expert in structuring educational data from IMAGES of document pages.
Your task is to analyze the provided images of a document (like a test or exam) and restructure it into a simplified JSON format.

**Crucial Instruction: You MUST process all questions, including those that require looking at an image, diagram, graph, or any other visual element within the provided page images.**

You are given the following context for the content:
- Subject: ${subject}
- Grade: ${grade}
- Document Title: ${documentTitle}

For each question-answer pair you find, extract the following information:
1. The question text.
2. The corresponding answer.
3. The curriculum: Must be one of 'CAPS', 'IEB', 'Cambridge', or 'Other'.
4. The grade: This should be "${grade}".
5. The subject: This should be "${subject}".
6. The standard: A descriptive standard (e.g., '${grade} - ${subject} - ${documentTitle}').

Your response MUST be a single valid JSON object containing a single key "questions", which holds an array of the structured question objects.
Each object in the array must strictly follow this structure:
{ "question": "string", "answer": "string", "curriculum": "CAPS" | "IEB" | "Cambridge" | "Other", "grade": "string", "subject": "string", "standard": "string" }.

Do not include any text outside of the JSON object.`;
}

const cleanJsonString = (jsonStr: string): string => {
    let cleaned = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleaned.match(fenceRegex);
    if (match && match[2]) {
        cleaned = match[2].trim();
    }
    return cleaned;
};

const validateAndEnrichData = (parsedData: any): TrainingQuestion[] => {
    const dataArray = Array.isArray(parsedData) ? parsedData : parsedData.questions;

    if (!Array.isArray(dataArray)) {
        throw new Error("API response is not a JSON array or could not be found in the response object.");
    }

    return dataArray.map((item, index) => {
        if (!item.question || !item.answer || !item.curriculum || !item.standard || !item.grade || !item.subject) {
            console.warn(`Item at index ${index} is missing required fields, it will be filtered out.`, item);
            return null;
        }
        return { ...item, id: crypto.randomUUID() };
    }).filter(Boolean) as TrainingQuestion[];
};


export const extractWithDocling = async (
    file: File,
    params: { subject: string, grade: string, title: string },
    settings: AISettings
): Promise<TrainingQuestion[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    try {
        if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
            const images = extension === 'pdf' ? await convertPdfToImages(file) : [await fileToBase64(file)];
            if (images.length === 0) {
                throw new Error("Could not extract any pages from the PDF.");
            }
            const systemInstruction = getDoclingSystemInstruction(params.subject, params.grade, params.title);
            if (!settings.openAIKey) throw new Error("OpenAI API key is not configured for Docling Vision processing.");
            
            const rawJson = await extractQuestionsFromImagesWithOpenAI(images, systemInstruction, settings.openAIKey);
            const cleanedJson = cleanJsonString(rawJson);
            const parsedData = JSON.parse(cleanedJson);
            return validateAndEnrichData(parsedData);

        } else if (['docx', 'txt'].includes(extension)) {
            const textContent = await parseFile(file);
            if (!textContent.trim()) {
                throw new Error("The document appears to be empty.");
            }
            return await restructureTestAllowingVisuals(textContent, settings, params.subject, params.grade, params.title);

        } else {
            throw new Error(`Unsupported file type for Docling extraction: .${extension}`);
        }

    } catch (error) {
        console.error(`Error during Docling extraction for ${file.name}:`, error);
        if (error instanceof Error) {
            throw new Error(`Docling processing failed. Details: ${error.message}`);
        }
        throw new Error(`An unknown error occurred during Docling processing.`);
    }
};
