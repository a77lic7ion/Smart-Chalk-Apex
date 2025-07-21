import React, { useState, useRef, ChangeEvent } from 'react';
import type { ImagePlaceholder } from '../types';
import { UploadIcon, CheckIcon, GlobeAltIcon, DatabaseIcon } from './Icons';
import { Loader } from './Loader';
import { Button } from './Button';
import { ImageSearchModal } from './ImageSearchModal';
import { ImageLibraryModal } from './ImageLibraryModal';
import { db } from '../db';

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

interface ImagePlaceholderCardProps {
    placeholder: ImagePlaceholder;
    onImageUpload: (placeholderId: string, imageData: string, status: ImagePlaceholder['status']) => void;
    subject: string;
    topic: string;
}

export const ImagePlaceholderCard: React.FC<ImagePlaceholderCardProps> = ({ placeholder, onImageUpload, subject, topic }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    
    const isBusy = isProcessing || placeholder.status === 'generating';

     const saveImageToLibrary = async (imageData: string) => {
        const newRecord = {
            id: crypto.randomUUID(),
            imageData,
            subject,
            topic,
            createdAt: Date.now()
        };
        try {
            await db.imageLibrary.add(newRecord);
        } catch (error) {
            console.warn("Could not save image to library. It might already exist.", error);
        }
    }

    const processAndUploadFile = async (file: File | Blob) => {
        if (!file.type.startsWith('image/')) {
            setImageError('Please upload a valid image file (PNG, JPG, etc.).');
            return;
        }
        setIsProcessing(true);
        setImageError(null);
        try {
            const base64 = await readFileAsBase64(file as File);
            onImageUpload(placeholder.id, base64, 'uploaded');
            await saveImageToLibrary(base64);
        } catch (e) {
            setImageError(e instanceof Error ? e.message : "Failed to read image file.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            processAndUploadFile(e.target.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    processAndUploadFile(file);
                    return;
                }
            }
        }
    };
    
    const handleWebImageSelect = async (imageBlob: Blob) => {
        setIsSearchModalOpen(false);
        await processAndUploadFile(imageBlob);
    };

    const handleLibraryImageSelect = (imageData: string) => {
        onImageUpload(placeholder.id, imageData, 'uploaded');
        setIsLibraryModalOpen(false);
    };

    const getStatusColor = () => {
        switch(placeholder.status) {
            case 'uploaded': return 'border-green-400 bg-green-50';
            case 'generating': return 'border-blue-400 bg-blue-50';
            case 'pending':
            default: return 'border-slate-300 bg-white';
        }
    }

    return (
         <>
            <ImageSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onImageSelect={handleWebImageSelect}
                initialSearchQuery={placeholder.description}
            />
             <ImageLibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onImageSelect={handleLibraryImageSelect}
            />
            <div className={`p-4 rounded-xl shadow-sm border ${getStatusColor()} transition-colors`}>
                <p className="font-semibold text-brand-navy text-sm mb-2">{placeholder.description}</p>
                 <div
                    className="relative w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-center p-2 cursor-pointer hover:border-brand-green transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green mb-2"
                    onClick={() => !isBusy && fileInputRef.current?.click()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    aria-label="Image upload area. Click to upload, or focus and paste an image."
                >
                    {isBusy && <Loader className="h-6 w-6 text-brand-green" />}
                    
                    {!isBusy && placeholder.status === 'uploaded' && placeholder.imageData && (
                        <img src={placeholder.imageData} alt={placeholder.description} className="max-h-full max-w-full object-contain rounded" />
                    )}

                    {!isBusy && placeholder.status === 'pending' && (
                         <div className="text-slate-500">
                            <UploadIcon className="h-6 w-6 mx-auto" />
                            <p className="text-xs mt-1 font-semibold">Upload or Paste</p>
                        </div>
                    )}
                    
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isBusy} />
                </div>
                
                {imageError && <p className="text-xs text-red-600 mb-2">{imageError}</p>}

                 <div className="flex flex-wrap gap-2">
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" disabled={isBusy}>
                        <UploadIcon className="h-4 w-4 mr-1" /> {placeholder.status === 'uploaded' ? 'Replace' : 'Upload'}
                    </Button>
                     <Button onClick={() => setIsSearchModalOpen(true)} variant="secondary" size="sm" disabled={isBusy} title="Find an image from the web">
                        <GlobeAltIcon className="h-4 w-4 mr-1" /> Find Image
                    </Button>
                    <Button onClick={() => setIsLibraryModalOpen(true)} variant="secondary" size="sm" disabled={isBusy} title="Pick an image from your local library">
                        <DatabaseIcon className="h-4 w-4 mr-1"/> Pick from Library
                    </Button>
                </div>

                {placeholder.status === 'uploaded' && (
                    <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-green-700">
                        <CheckIcon className="h-4 w-4" />
                        <span>Image Ready</span>
                    </div>
                )}
            </div>
         </>
    );
};