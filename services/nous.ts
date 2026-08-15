export const generateContentWithNous = async (
    systemInstruction: string,
    userPrompt: string,
    apiKey: string,
    endpoint: string,
    model: string,
    temperature: number
): Promise<string> => {
    if (!apiKey.trim()) {
        throw new Error('NOUS API key is not configured.');
    }

    if (!endpoint.trim()) {
        throw new Error('NOUS endpoint is not configured.');
    }

    if (!model.trim()) {
        throw new Error('NOUS model is not configured. Select a model in Settings.');
    }

    const normalizedEndpoint = endpoint.replace(/\/+$/, '');
    const chatCompletionsEndpoint = normalizedEndpoint.endsWith('/chat/completions')
        ? normalizedEndpoint
        : `${normalizedEndpoint}/chat/completions`;

    let response: Response;
    try {
        response = await fetch(chatCompletionsEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature,
            }),
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Could not connect to NOUS. Check the endpoint, CORS, and your network connection.');
        }
        throw error;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data?.error?.message || data?.message || 'No additional error information.';
        throw new Error(`NOUS API Error: ${response.status} ${response.statusText} - ${message}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
        throw new Error("Invalid response structure from NOUS. Expected a string in 'choices[0].message.content'.");
    }

    return content;
};
