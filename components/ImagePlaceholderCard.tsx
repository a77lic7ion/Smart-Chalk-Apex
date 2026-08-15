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
            // Upload to Vercel Blob storage
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', 'presentations');
            
            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('googleToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload image to cloud storage');
            }
            
            const result = await response.json();
            const imageUrl = result.data.url;
            
            // Use the cloud URL instead of base64
            onImageUpload(placeholder.id, imageUrl, 'uploaded');
            
            // Also save to local library for offline access (keep base64 for this)
            const base64 = await readFileAsBase64(file as File);
            await saveImageToLibrary(base64);
        } catch (e) {
            setImageError(e instanceof Error ? e.message : "Failed to upload image.");
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
            case 'uploaded': return 'border-brand-yellow bg-brand-paper';
            case 'generating': return 'border-brand-black bg-brand-paper';
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
            <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${getStatusColor()}`}>
                <p className="font-semibold text-brand-black text-sm mb-2">{placeholder.description}</p>
                 <div
                    className="relative mb-2 flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-brand-paper p-2 text-center transition-colors hover:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                    onClick={() => !isBusy && fileInputRef.current?.click()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    aria-label="Image upload area. Click to upload, or focus and paste an image."
                >
                    {isBusy && <Loader className="h-6 w-6 text-brand-yellow" />}
                    
                    {!isBusy && placeholder.status === 'uploaded' && placeholder.imageData && (
                        <img src={placeholder.imageData} alt={placeholder.description} className="max-h-full max-w-full object-contain rounded" />
                    )}

                    {!isBusy && placeholder.status === 'pending' && (
                         <div className="text-brand-black">
                            <UploadIcon className="h-6 w-6 mx-auto" />
                            <p className="text-xs mt-1 font-semibold">Upload or Paste</p>
                        </div>
                    )}
                    
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isBusy} />
                </div>
                
                {imageError && <p role="alert" className="mb-2 rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-brand-black">{imageError}</p>}

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
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-black">
                        <CheckIcon className="h-4 w-4" />
                        <span>Image Ready</span>
                    </div>
                )}
            </div>
         </>
    );
};