import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';

export interface LocalUploadResult {
    url: string;
    pathname: string;
    contentType: string;
    contentDisposition: string;
}

const storageRoot = path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'uploads'));
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');

const safeSegment = (value: string, fallback: string): string => {
    const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    return cleaned || fallback;
};

const safeRelativePath = (folder: string, filename: string): string => {
    const folderPath = folder.split(/[\\/]+/).filter(Boolean).map((part) => safeSegment(part, 'images')).join('/');
    const safeFilename = safeSegment(filename, 'upload.bin');
    return path.posix.join(folderPath || 'images', safeFilename);
};

const absolutePathFor = (relativePath: string): string => {
    const absolutePath = path.resolve(storageRoot, relativePath);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
        throw new Error('Invalid storage path');
    }
    return absolutePath;
};

const toResult = (relativePath: string, contentType: string): LocalUploadResult => ({
    url: `${publicBaseUrl}/uploads/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`,
    pathname: relativePath,
    contentType,
    contentDisposition: 'inline',
});

export const uploadImageToBlob = async (
    file: Buffer,
    filename: string,
    folder: string = 'images',
    contentType: string = 'image/jpeg'
): Promise<LocalUploadResult> => {
    try {
        const relativePath = safeRelativePath(folder, filename);
        const absolutePath = absolutePathFor(relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, file, { flag: 'w' });
        return toResult(relativePath, contentType);
    } catch (error) {
        console.error('Error writing local image storage:', error);
        throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const uploadBase64ImageToBlob = async (
    base64Data: string,
    filename: string,
    folder: string = 'images'
): Promise<LocalUploadResult> => {
    try {
        const dataUrlMatch = base64Data.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
        const contentType = dataUrlMatch?.[1] || 'image/jpeg';
        const base64String = base64Data.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
        return await uploadImageToBlob(Buffer.from(base64String, 'base64'), filename, folder, contentType);
    } catch (error) {
        console.error('Error writing local base64 image storage:', error);
        throw new Error(`Failed to save base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const deleteImageFromBlob = async (urlOrPath: string): Promise<void> => {
    try {
        const parsed = urlOrPath.startsWith('http') ? new URL(urlOrPath) : null;
        const pathname = parsed ? decodeURIComponent(parsed.pathname.replace(/^\/uploads\//, '')) : urlOrPath.replace(/^\/?uploads\//, '');
        await fs.rm(absolutePathFor(pathname), { force: true });
    } catch (error) {
        console.error('Error deleting local image:', error);
        throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const listImagesInFolder = async (folder: string = 'images', limit: number = 100): Promise<LocalUploadResult[]> => {
    try {
        const safeFolder = folder.split(/[\\/]+/).filter(Boolean).map((part) => safeSegment(part, 'images')).join('/');
        const folderPath = absolutePathFor(safeFolder || 'images');
        const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return [];
            throw error;
        });
        const files = entries.filter((entry) => entry.isFile()).slice(0, Math.max(0, limit));
        return Promise.all(files.map(async (entry) => {
            const relativePath = path.posix.join(safeFolder || 'images', entry.name);
            const extension = path.extname(entry.name).toLowerCase();
            const contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : extension === '.gif' ? 'image/gif' : 'image/jpeg';
            return toResult(relativePath, contentType);
        }));
    } catch (error) {
        console.error('Error listing local images:', error);
        throw new Error(`Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const generateUniqueFilename = (originalName: string, userId?: string): string => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const userPrefix = userId ? `${userId}_` : '';
    return `${userPrefix}${baseName}_${timestamp}_${randomId}.${extension}`;
};

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});
