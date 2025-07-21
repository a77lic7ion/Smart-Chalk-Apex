

export const generateContentWithOllama = async (systemInstruction: string, userPrompt: string, baseUrl: string, model: string, temperature: number): Promise<string> => {
    try {
        const endpoint = new URL("/api/generate", baseUrl.replace(/\/$/, '')).toString();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                system: systemInstruction,
                prompt: userPrompt,
                format: "json",
                stream: false,
                options: {
                    temperature: temperature
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response." }));
            throw new Error(`Ollama API Error: ${response.status} ${response.statusText} - ${errorData.error}`);
        }

        const data = await response.json();
        
        if (typeof data.response !== 'string' || data.response.trim() === '') {
             throw new Error("Invalid response structure from Ollama. Expected a 'response' field with a JSON string.");
        }
        
        return data.response;

    } catch (e) {
        if (e instanceof Error) {
            if (e.message.toLowerCase().includes('failed to fetch')) {
                 throw new Error("Could not connect to the Ollama server. Please ensure the URL is correct and the server is running.");
            }
            throw e; 
        }
        throw new Error("An unexpected error occurred while communicating with the Ollama service.");
    }
};