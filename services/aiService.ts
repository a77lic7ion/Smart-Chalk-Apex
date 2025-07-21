

import type { TrainingQuestion, AISettings, Curriculum } from '../types';
import { generateContentWithOpenAI } from './openai';

export const getSystemInstruction = (subject: string, grade: string, documentTitle: string) => {
    return `You are an expert in structuring educational data from text-only documents.
Your task is to analyze the provided content (like a test or exam) and restructure it into a simplified JSON format.

**Crucial Instruction: You must process text-only questions.** If a question requires looking at an image, diagram, graph, or any other visual element (e.g., "Look at the chart below...", "What is shown in Figure 1?"), you MUST IGNORE that question and its answer completely. Do not include it in your output.

You are given the following context for the content:
- Subject: ${subject}
- Grade: ${grade}
- Document Title: ${documentTitle}

For each valid, text-only question-answer pair you find in the content, you must extract the following information:
1.  The question text.
2.  The corresponding answer.
3.  The curriculum: Must be one of 'CAPS', 'IEB', 'Cambridge', or 'Other'. Use the provided context to infer this if possible, otherwise select the most appropriate one.
4.  The grade: This should almost always be "${grade}".
5.  The subject: This should almost always be "${subject}".
6.  The standard: Use the provided context to create a descriptive standard (e.g., '${grade} - ${subject} - ${documentTitle}').

Your response MUST be a single valid JSON object. This object MUST contain a single key named "questions", which holds an array of the structured question objects you were able to extract.
Each object in the array must strictly follow this structure:
{ "question": "string", "answer": "string", "curriculum": "CAPS" | "IEB" | "Cambridge" | "Other", "grade": "string", "subject": "string", "standard": "string" }.

Do not include any introductory text, closing remarks, or any other content outside of the JSON object itself.`;
}

export const getSystemInstructionAllowingVisuals = (subject: string, grade: string, documentTitle: string) => {
    return `You are an expert in structuring educational data from text-only documents.
Your task is to analyze the provided content (like a test or exam) and restructure it into a simplified JSON format.

**Unlike other tasks, you should process ALL questions, even if they refer to visual elements like images, diagrams, or graphs that are not visible to you. Just extract the text of the question as-is.**

You are given the following context for the content:
- Subject: ${subject}
- Grade: ${grade}
- Document Title: ${documentTitle}

For each question-answer pair you find in the content, you must extract the following information:
1.  The question text.
2.  The corresponding answer.
3.  The curriculum: Must be one of 'CAPS', 'IEB', 'Cambridge', or 'Other'. Use the provided context to infer this if possible, otherwise select the most appropriate one.
4.  The grade: This should almost always be "${grade}".
5.  The subject: This should almost always be "${subject}".
6.  The standard: Use the provided context to create a descriptive standard (e.g., '${grade} - ${subject} - ${documentTitle}').

Your response MUST be a single valid JSON object. This object MUST contain a single key named "questions", which holds an array of the structured question objects you were able to extract.
Each object in the array must strictly follow this structure:
{ "question": "string", "answer": "string", "curriculum": "CAPS" | "IEB" | "Cambridge" | "Other", "grade": "string", "subject": "string", "standard": "string" }.

Do not include any introductory text, closing remarks, or any other content outside of the JSON object itself.`;
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
            throw new Error(`Item at index ${index} in the API response is missing required fields (question, answer, curriculum, standard, grade, subject).`);
        }
        return { ...item, id: crypto.randomUUID() };
    });
};

const restructureContent = async (
    testContent: string,
    systemInstruction: string,
    settings: AISettings
): Promise<TrainingQuestion[]> => {
    try {
        if (!settings.openAIKey) {
            throw new Error("OpenAI API key is not configured for text restructuring.");
        }
        
        const userPrompt = `Please restructure the following test content:\n\n---\n${testContent}\n---`;
        
        // This service is hardcoded to OpenAI for now.
        const rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, settings.openAIKey, 0.2);
        
        const cleanedJson = cleanJsonString(rawJson);
        const parsedData = JSON.parse(cleanedJson);
        return validateAndEnrichData(parsedData);

    } catch (error) {
        console.error(`Error during OpenAI text restructuring:`, error);
        if (error instanceof Error) {
            throw new Error(`Processing failed with OpenAI. Details: ${error.message}`);
        }
        throw new Error(`An unknown error occurred during OpenAI processing.`);
    }
};

export const restructureTest = async (
    testContent: string, 
    settings: AISettings,
    subject: string,
    grade: string,
    documentTitle: string
): Promise<TrainingQuestion[]> => {
    const systemInstruction = getSystemInstruction(subject, grade, documentTitle);
    return restructureContent(testContent, systemInstruction, settings);
};

export const restructureTestAllowingVisuals = async (
    testContent: string, 
    settings: AISettings,
    subject: string,
    grade: string,
    documentTitle: string
): Promise<TrainingQuestion[]> => {
    const systemInstruction = getSystemInstructionAllowingVisuals(subject, grade, documentTitle);
    return restructureContent(testContent, systemInstruction, settings);
};