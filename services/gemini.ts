import { GoogleGenAI } from "@google/genai";

export const generateContentWithGemini = async (systemInstruction: string, userPrompt: string, apiKey: string, temperature: number): Promise<string> => {
    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please set it in the settings panel.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: temperature,
            responseMimeType: "application/json",
        }
    });

    return response.text;
};
