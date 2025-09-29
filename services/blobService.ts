import { put, del, list } from '@vercel/blob';

export interface BlobUploadResult {
    url: string;
    pathname: string;
    contentType: string;
    contentDisposition: string;
}

/**
 * Upload an image file to Vercel Blob storage
 * @param file - The file to upload (File or Blob)
 * @param filename - The desired filename for the blob
 * @param folder - Optional folder path (e.g., 'images', 'presentations')
 * @returns Promise with the blob URL and metadata
 */
export const uploadImageToBlob = async (
    file: File | Blob, 
    filename: string, 
    folder: string = 'images'
): Promise<BlobUploadResult> => {
    try {
        const pathname = `${folder}/${filename}`;
        
        const blob = await put(pathname, file, {
            access: 'public',
            contentType: file.type || 'image/jpeg'
        });

        return {
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType || file.type || 'image/jpeg',
            contentDisposition: blob.contentDisposition || ''
        };
    } catch (error) {
        console.error('Error uploading image to blob storage:', error);
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Upload an image from a base64 string to Vercel Blob storage
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param filename - The desired filename for the blob
 * @param folder - Optional folder path
 * @returns Promise with the blob URL and metadata
 */
export const uploadBase64ImageToBlob = async (
    base64Data: string,
    filename: string,
    folder: string = 'images'
): Promise<BlobUploadResult> => {
    try {
        // Remove data URL prefix if present
        const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // Convert base64 to blob
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Determine content type from original data URL or default to jpeg
        let contentType = 'image/jpeg';
        const dataUrlMatch = base64Data.match(/^data:image\/([a-z]+);base64,/);
        if (dataUrlMatch) {
            contentType = `image/${dataUrlMatch[1]}`;
        }
        
        const blob = new Blob([byteArray], { type: contentType });
        
        return await uploadImageToBlob(blob, filename, folder);
    } catch (error) {
        console.error('Error uploading base64 image to blob storage:', error);
        throw new Error(`Failed to upload base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Delete an image from Vercel Blob storage
 * @param url - The blob URL to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteImageFromBlob = async (url: string): Promise<void> => {
    try {
        await del(url);
    } catch (error) {
        console.error('Error deleting image from blob storage:', error);
        throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * List all blobs in a specific folder
 * @param folder - The folder to list (e.g., 'images', 'presentations')
 * @param limit - Maximum number of results to return
 * @returns Promise with array of blob metadata
 */
export const listImagesInFolder = async (folder: string = 'images', limit: number = 100) => {
    try {
        const { blobs } = await list({
            prefix: `${folder}/`,
            limit
        });
        
        return blobs;
    } catch (error) {
        console.error('Error listing images from blob storage:', error);
        throw new Error(`Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Generate a unique filename for an image
 * @param originalName - Original filename
 * @param userId - User ID to include in filename
 * @returns Unique filename with timestamp
 */
export const generateUniqueFilename = (originalName: string, userId?: string): string => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    
    const userPrefix = userId ? `${userId}_` : '';
    return `${userPrefix}${baseName}_${timestamp}_${randomId}.${extension}`;
};