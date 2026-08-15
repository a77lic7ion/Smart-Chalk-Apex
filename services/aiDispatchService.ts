import type { TestGenerationParams, AISettings, TrainingQuestion, Presentation, Slide, ImagePlaceholder, LessonGenerationParams, LessonPlan, DbRecord, HomeworkGenerationParams } from '../types';
import { generateContentWithGemini } from './gemini';
import { generateContentWithOpenAI } from './openai';
import { generateContentWithOllama } from './ollama';
import { generateContentWithOpenRouter } from './openRouter';
import { db } from '../db';

// --- System Instruction Generators ---

export const getSystemInstructionForTest = (params: TestGenerationParams, existingQuestions?: DbRecord[]): string => {
    let existingQuestionsPrompt = '';
    if (existingQuestions && existingQuestions.length > 0) {
        const questionsForPrompt = existingQuestions.map(({ question, answer }) => ({ question, answer }));
        existingQuestionsPrompt = `

**Existing Question Bank:**
You have access to the following pre-existing questions from the user's database. You should prioritize using or adapting these questions if they are relevant to the request. You can also generate new questions to meet the requirements if the existing ones are insufficient or not a good fit. Do NOT simply repeat these questions verbatim unless they perfectly match the request. Instead, use them as inspiration or as part of the overall test.

"""
${JSON.stringify(questionsForPrompt, null, 2)}
"""
`;
    }

    return `
You are an expert South African educator and content creator. Your task is to generate a list of high-quality questions and answers based on the following specifications.
${existingQuestionsPrompt}

**Content Specifications:**
- **Curriculum:** ${params.curriculum}
- **Grade:** ${params.grade}
- **Subject:** ${params.subject}
- **Topic(s):** ${params.topic}
- **Bloom's Taxonomy Focus:** Your questions should primarily target the '${params.bloomsLevel}' cognitive level, but include a balanced mix of other levels unless specified otherwise.
- **Desired Content:** ${params.questionTypes}

**Output Format Requirements:**
Your response MUST be a single valid JSON object. This object MUST contain a single key named "questions", which holds an array of the generated question objects.
For each generated question, create an object that strictly follows this structure:
{ 
  "question": "The full text of the question.",
  "answer": "The correct and complete answer to the question.",
  "curriculum": "${params.curriculum}",
  "grade": "${params.grade}",
  "subject": "${params.subject}",
  "standard": "${params.grade} - ${params.subject} - ${params.topic}"
}

Do not include any introductory text, closing remarks, or any other content outside of the JSON object itself. Just generate the raw JSON.
`;
}

export const getSystemInstructionForSlides = (params: TestGenerationParams): string => {
    return `You are an expert educational content creator. Your task is to generate the content for a presentation.

**Presentation Specifications:**
- **Curriculum:** ${params.curriculum}
- **Grade:** ${params.grade}
- **Subject:** ${params.subject}
- **Topic(s):** ${params.topic}
- **Desired Content/Outline:** ${params.questionTypes}

**Crucial Output Format Requirements:**
Your response MUST be a single valid JSON object. This object MUST contain a single key named "slides".
- The "slides" key must hold an array of slide objects.

Each **slide object** in the array must strictly follow this structure:
{
  "title": "A concise and engaging title for the slide.",
  "content": "The textual content for the slide body. Use clean formatting. For bullet points, you MUST use the '⦁' character, not asterisks or hyphens. Do NOT use any markdown formatting like **text** or #### headers."
}

Do not include a main title for the presentation or a slide for introductions; these will be added automatically. Focus only on generating the content slides. Do not include any text or explanations outside of the single root JSON object.
`;
}

export const getSystemInstructionForLesson = (params: LessonGenerationParams, existingQuestions?: DbRecord[]): string => {
    let existingQuestionsPrompt = '';
    if (existingQuestions && existingQuestions.length > 0) {
        const questionsForPrompt = existingQuestions.map(({ question, answer }) => ({ question, answer }));
        existingQuestionsPrompt = `

**Existing Question Bank:**
You have access to the following pre-existing questions from the user's database. You MUST use these questions as the primary source for the "assessment_questions" section of your output. Select the most relevant questions from this list for the lesson's topic. You may generate additional assessment questions ONLY if the provided list is insufficient to cover the topic.

"""
${JSON.stringify(questionsForPrompt, null, 2)}
"""
`;
    }

    return `You are an expert South African educator and curriculum designer. Your task is to generate a detailed, high-quality lesson plan based on the provided specifications.
${existingQuestionsPrompt}

**Lesson Specifications:**
- **Curriculum:** ${params.curriculum}
- **Grade:** ${params.grade}
- **Subject:** ${params.subject}
- **Topic(s):** ${params.topic}
- **Lesson Duration:** ${params.duration}
- **Bloom's Taxonomy Focus:** The lesson activities and assessments should primarily target the '${params.bloomsLevel}' cognitive level.

**Output Format Requirements:**
Your response MUST be a single valid JSON object. This object must contain the following top-level keys: "title", "lesson_plan_content", "assessment_questions", and "image_placeholders".

1.  **"title"**: A creative and relevant title for the lesson plan.
2.  **"lesson_plan_content"**: A string containing the full lesson plan. For this content, use clean formatting. You MUST use uppercase text for headers (e.g., 'ACTIVITY 1: TITLE') instead of markdown hashes (e.g., '#### Activity 1'). For bullet points, you MUST use the '⦁' character, not asterisks or hyphens. Where an image is needed, you must insert a placeholder tag in the format \`[IMAGE_PLACEHOLDER:placeholder_id]\`.
3.  **"assessment_questions"**: An array of question objects for assessing student understanding. If no questions are needed, this must be an empty array []. Each object must follow this structure:
    \`{ "question": "The full text of the question.", "answer": "The correct and complete answer." }\`
4.  **"image_placeholders"**: An array of image placeholder objects corresponding to the tags in the lesson content. If no images are needed, this must be an empty array []. Each placeholder object is critical and must strictly follow this structure:
    \`{ "placeholder_id": "A unique, descriptive ID for this image request (e.g., 'activity_1_water_cycle_diagram').", "description": "A clear, user-facing description of what the image should be." }\`

Do not include any text or explanations outside of the single root JSON object.
`;
}

export const getSystemInstructionForHomework = (params: HomeworkGenerationParams, sourceContent?: {type: string, name: string, content: string | TrainingQuestion[]}): string => {
    let sourceContentPrompt = '';
    if (sourceContent) {
        const contentString = typeof sourceContent.content === 'string' 
            ? sourceContent.content
            : JSON.stringify(sourceContent.content.map(q => ({ question: q.question, answer: q.answer })), null, 2);

        sourceContentPrompt = `

**Source Material:**
You MUST base the homework questions on the following ${sourceContent.type} titled "${sourceContent.name}". The questions should test or reinforce the concepts presented in this material.
Source Content:
"""
${contentString}
"""
`;
    }

    return `
You are an expert educator creating a homework assignment sheet. Your task is to generate a list of questions and answers based on the user's specifications.

**Homework Specifications:**
- **Curriculum:** ${params.curriculum}
- **Grade:** ${params.grade}
- **Subject:** ${params.subject}
- **Topic(s):** ${params.topic}
- **Student Instructions:** ${params.instructions}
- **Bloom's Taxonomy Focus:** Your questions should primarily target the '${params.bloomsLevel}' cognitive level.
- **Desired Questions:** ${params.questionTypes}
${sourceContentPrompt}

**Output Format Requirements:**
Your response MUST be a single valid JSON object. This object MUST contain a single key named "questions", which holds an array of the generated question objects.
Each object in the array must strictly follow this structure:
{ 
  "question": "The full text of the question.",
  "answer": "The correct and complete answer to the question.",
  "curriculum": "${params.curriculum}",
  "grade": "${params.grade}",
  "subject": "${params.subject}",
  "standard": "${params.grade} - ${params.subject} - Homework: ${params.topic}"
}

Do not include any introductory text, closing remarks, or any other content outside of the JSON object itself. Just generate the raw JSON.
`;
}

// --- Utility and Validation Functions ---

const cleanJsonString = (jsonStr: string): string => {
    let cleaned = jsonStr.trim();
    const fenceRegex = /^```(?:\w+)?\s*\n(.*?)\n\s*```$/s;
    const fenceMatch = cleaned.match(fenceRegex);
    if (fenceMatch && fenceMatch[1]) {
        cleaned = fenceMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    if (firstBrace === -1) start = firstBracket;
    else if (firstBracket === -1) start = firstBrace;
    else start = Math.min(firstBrace, firstBracket);
    if (start === -1) return cleaned;
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end === -1) return cleaned;
    return cleaned.substring(start, end + 1);
};

const robustJsonParse = (jsonString: string) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn("Standard JSON.parse failed. Attempting to repair...", { error, jsonString });
        const repairedJson = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(repairedJson);
        } catch (repairError) {
            console.error("Failed to parse JSON even after attempting repairs.", { repairError, repairedJson });
            throw new Error(`JSON.parse: ${(error as Error).message}`);
        }
    }
};

const validateAndEnrichGeneratedData = (parsedData: any): TrainingQuestion[] => {
    const dataArray = Array.isArray(parsedData) ? parsedData : parsedData.questions;
    if (!Array.isArray(dataArray)) throw new Error("API response is not a JSON array or could not be found.");
    return dataArray.map((item, index) => {
        if (!item.question || !item.answer || !item.curriculum || !item.standard || !item.grade || !item.subject) {
            throw new Error(`Item at index ${index} in the generated response is missing required fields.`);
        }
        return { ...item, id: crypto.randomUUID() };
    });
};

const validateAndEnrichSlidesData = (parsedData: any, params: TestGenerationParams): { presentation: Presentation, slides: Slide[] } => {
    if (!parsedData.slides || !Array.isArray(parsedData.slides)) throw new Error("API response is missing the root 'slides' array.");
    const presentationId = crypto.randomUUID();
    const presentation: Presentation = { id: presentationId, name: params.topic, params: params, createdAt: Date.now() };
    const introSlide: Slide = { id: crypto.randomUUID(), presentationId: presentationId, slideNumber: 1, title: params.topic, content: `A presentation on ${params.topic} for ${params.grade} ${params.subject}`, isIntro: true };
    const contentSlides: Slide[] = parsedData.slides.map((slideData: any, index: number) => {
        if (!slideData.title || !slideData.content) throw new Error(`Slide at index ${index} is missing title or content.`);
        // Clean up markdown as a fallback
        const cleanContent = slideData.content.replace(/\*\*/g, '');
        return { id: crypto.randomUUID(), presentationId: presentationId, slideNumber: index + 2, title: slideData.title, content: cleanContent, isIntro: false };
    });
    return { presentation, slides: [introSlide, ...contentSlides] };
};

const validateAndEnrichLessonData = (parsedData: any, params: LessonGenerationParams): { lessonPlan: LessonPlan, placeholders: ImagePlaceholder[] } => {
    if (!parsedData.title || typeof parsedData.lesson_plan_content !== 'string' || !Array.isArray(parsedData.assessment_questions) || !Array.isArray(parsedData.image_placeholders)) {
        throw new Error("API response is missing required fields: title, lesson_plan_content, assessment_questions, or image_placeholders.");
    }
    const lessonPlanId = crypto.randomUUID();
    const questions: TrainingQuestion[] = parsedData.assessment_questions.map((q: any) => ({
        id: crypto.randomUUID(), question: q.question, answer: q.answer, curriculum: params.curriculum, grade: params.grade, subject: params.subject, standard: `${params.grade} - ${params.subject} - Lesson: ${params.topic}`
    }));
    const lessonPlan: LessonPlan = { id: lessonPlanId, name: parsedData.title, params: params, content: parsedData.lesson_plan_content, questions: questions, createdAt: Date.now() };
    const placeholders: ImagePlaceholder[] = parsedData.image_placeholders.map((p: any) => {
        if (!p.placeholder_id || !p.description) throw new Error("An image placeholder from the API is missing required fields.");
        return { id: crypto.randomUUID(), presentationId: lessonPlanId, slideNumber: 0, placeholderId: p.placeholder_id, description: p.description, status: 'pending' };
    });
    return { lessonPlan, placeholders };
};

// --- Generic Dispatcher ---

const dispatchAndValidate = async (
    systemInstruction: string,
    userPrompt: string,
    settings: AISettings,
    temperature: number
): Promise<any> => {
    let rawJson: string;
    try {
        switch (settings.provider) {
            case 'gemini':
                rawJson = await generateContentWithGemini(systemInstruction, userPrompt, settings.geminiApiKey, temperature);
                break;
            case 'openai':
                if (!settings.openAIKey) throw new Error("OpenAI API key is not configured.");
                rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, settings.openAIKey, temperature);
                break;
            case 'ollama':
                if (!settings.ollamaUrl || !settings.ollamaModel) throw new Error("Ollama URL or model is not configured.");
                rawJson = await generateContentWithOllama(systemInstruction, userPrompt, settings.ollamaUrl, settings.ollamaModel, temperature);
                break;
            case 'openRouter': {
                const apiKey = settings.providerApiKeys?.openRouter ?? '';
                const endpoint = settings.providerEndpoints?.openRouter ?? 'https://openrouter.ai/api/v1';
                const model = settings.selectedModels?.openRouter ?? '';
                rawJson = await generateContentWithOpenRouter(systemInstruction, userPrompt, apiKey, endpoint, model, temperature);
                break;
            }
            default:
                throw new Error(`Unsupported AI provider: ${settings.provider}`);
        }
        const cleanedJson = cleanJsonString(rawJson);
        return robustJsonParse(cleanedJson);
    } catch (error) {
        console.error(`Error during generation with ${settings.provider}:`, error);
        if (error instanceof Error) {
            throw new Error(`Generation failed with ${settings.provider}. Details: ${error.message}`);
        }
        throw new Error(`An unknown error occurred during ${settings.provider} generation.`);
    }
};

// --- Public Service Functions ---

export const generateTest = async (params: TestGenerationParams, settings: AISettings): Promise<TrainingQuestion[]> => {
    const existingQuestions = await db.trainingData.where({ subject: params.subject, grade: params.grade }).limit(50).toArray();
    const systemInstruction = getSystemInstructionForTest(params, existingQuestions);
    const userPrompt = "Please generate the test now based on the system instructions.";
    const parsedData = await dispatchAndValidate(systemInstruction, userPrompt, settings, 0.5);
    return validateAndEnrichGeneratedData(parsedData);
};

export const generateHomework = async (params: HomeworkGenerationParams, settings: AISettings, sourceContent?: {type: string, name: string, content: string | TrainingQuestion[]}): Promise<TrainingQuestion[]> => {
    const systemInstruction = getSystemInstructionForHomework(params, sourceContent);
    const userPrompt = "Please generate the homework sheet now based on the system instructions.";
    const parsedData = await dispatchAndValidate(systemInstruction, userPrompt, settings, 0.6);
    return validateAndEnrichGeneratedData(parsedData);
};

export const generateSlides = async (params: TestGenerationParams, settings: AISettings): Promise<{ presentation: Presentation, slides: Slide[] }> => {
    const systemInstruction = getSystemInstructionForSlides(params);
    const userPrompt = "Please generate the presentation now based on the system instructions.";
    const parsedData = await dispatchAndValidate(systemInstruction, userPrompt, settings, 0.6);
    return validateAndEnrichSlidesData(parsedData, params);
};

export const generateLesson = async (params: LessonGenerationParams, settings: AISettings): Promise<{ lessonPlan: LessonPlan, placeholders: ImagePlaceholder[] }> => {
    const existingQuestions = await db.trainingData.where({ subject: params.subject, grade: params.grade }).limit(50).toArray();
    const systemInstruction = getSystemInstructionForLesson(params, existingQuestions);
    const userPrompt = "Please generate the lesson plan now based on the system instructions.";
    const parsedData = await dispatchAndValidate(systemInstruction, userPrompt, settings, 0.7);
    return validateAndEnrichLessonData(parsedData, params);
};