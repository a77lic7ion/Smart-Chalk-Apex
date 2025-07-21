

export const generateContentWithOpenAI = async (systemInstruction: string, userPrompt: string, apiKey: string, temperature: number): Promise<string> => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: temperature,
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'No additional error info.'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error("Invalid response structure from OpenAI. Expected a string in 'choices[0].message.content'.");
    }
    return content;
};

export const extractQuestionsFromImagesWithOpenAI = async (
    images: string[],
    systemInstruction: string,
    apiKey: string
): Promise<string> => {
    
    const imageParts = images.map(base64Image => ({
        type: "image_url",
        image_url: {
            url: base64Image,
            detail: "high"
        }
    }));

    const messages = [
        {
            role: "system",
            content: systemInstruction
        },
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: "Here are the pages of the document. Please analyze them and extract the questions and answers according to the system instructions."
                },
                ...imageParts
            ]
        }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Vision API Error: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'No additional error info.'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error("Invalid response structure from OpenAI Vision. Expected a string in 'choices[0].message.content'.");
    }
    return content;
};