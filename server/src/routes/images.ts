import { Router } from 'express';
import { AuthenticatedRequest, authMiddleware as authenticateToken } from '../middleware/auth';
import { uploadImageToBlob, uploadBase64ImageToBlob, deleteImageFromBlob, listImagesInFolder, generateUniqueFilename } from '../services/blobService';
import { upload } from '../services/blobService';

const router = Router();

/**
 * POST /api/images/upload
 * Upload an image file to Vercel Blob storage
 */
router.post('/upload', authenticateToken, upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const userId = req.user?.id?.toString();
        const folder = req.body.folder || 'images';
        const filename = generateUniqueFilename(req.file.originalname, userId);

        const result = await uploadImageToBlob(
            req.file.buffer,
            filename,
            folder,
            req.file.mimetype
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ 
            error: 'Failed to upload image',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/images/upload-base64
 * Upload a base64 encoded image to Vercel Blob storage
 */
router.post('/upload-base64', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { base64Data, filename, folder = 'images' } = req.body;

        if (!base64Data || !filename) {
            return res.status(400).json({ error: 'Base64 data and filename are required' });
        }

        const userId = req.user?.id?.toString();
        const uniqueFilename = generateUniqueFilename(filename, userId);

        const result = await uploadBase64ImageToBlob(base64Data, uniqueFilename, folder);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error uploading base64 image:', error);
        res.status(500).json({ 
            error: 'Failed to upload base64 image',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/images/:url
 * Delete an image from Vercel Blob storage
 */
router.delete('/:filename', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const url = decodeURIComponent(req.params.encodedUrl);

        await deleteImageFromBlob(url);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ 
            error: 'Failed to delete image',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/images/list
 * List images in a specific folder
 */
router.get('/list', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const folder = req.query.folder as string || 'images';
        const limit = parseInt(req.query.limit as string) || 100;

        const blobs = await listImagesInFolder(folder, limit);

        res.json({
            success: true,
            data: blobs
        });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ 
            error: 'Failed to list images',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/images/bulk-upload
 * Upload multiple images at once
 */
router.post('/bulk-upload', authenticateToken, upload.array('images', 10), async (req: AuthenticatedRequest, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided' });
        }

        const userId = req.user?.id?.toString();
        const folder = req.body.folder || 'images';
        const uploadPromises = req.files.map(async (file) => {
            const filename = generateUniqueFilename(file.originalname, userId);
            return await uploadImageToBlob(file.buffer, filename, folder, file.mimetype);
        });

        const results = await Promise.all(uploadPromises);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ 
            error: 'Failed to upload images',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;