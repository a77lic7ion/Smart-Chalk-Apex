import { PEXELS_API_KEY } from '../config';

interface PexelsImage {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    alt: string;
}

interface PexelsSearchResponse {
    page: number;
    per_page: number;
    photos: PexelsImage[];
    total_results: number;
}

export const searchPexelsImages = async (query: string): Promise<PexelsImage[]> => {
    if (!PEXELS_API_KEY) {
        throw new Error("Pexels API key is not configured.");
    }

    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`, {
        headers: {
            'Authorization': PEXELS_API_KEY,
        }
    });

    if (!response.ok) {
        let errorMessage = 'An unknown error occurred.';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || `Pexels API Error: ${response.status} ${response.statusText}`;
        } catch (e) {
            errorMessage = `Pexels API Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
    
    const data: PexelsSearchResponse = await response.json();
    return data.photos;
};


export const fetchPexelsImageAsBlob = async (imageUrl: string): Promise<Blob> => {
    try {
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
             throw new Error("Failed to fetch image from URL: Received an empty response.");
        }
        
        return blob;

    } catch (e) {
        console.error("Error fetching Pexels image as blob:", e);
        if (e instanceof Error) {
            throw new Error(`The image could not be downloaded. Details: ${e.message}`);
        }
        throw new Error("An unknown error occurred while downloading the image.");
    }
};