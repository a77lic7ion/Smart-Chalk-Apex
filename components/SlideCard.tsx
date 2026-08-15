import React, { useState, useRef, ChangeEvent } from 'react';
import type { Slide } from '../types';
import { UploadIcon, SmartChalkLogoMark, GlobeAltIcon, DatabaseIcon } from './Icons';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Loader } from './Loader';
import { ImageSearchModal } from './ImageSearchModal';
import { ImageLibraryModal } from './ImageLibraryModal';
import { db } from '../db';
import { FormattedText } from './FormattedText';

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const cropImageToSquare = async (source: Blob): Promise<File> => {
    const objectUrl = URL.createObjectURL(source);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () => reject(new Error('The selected image could not be read.'));
            element.src = objectUrl;
        });
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not prepare the square image crop.');
        context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, size, size);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not create the square image.')), 'image/jpeg', 0.92);
        });
        return new File([blob], 'smartchalk-square-image.jpg', { type: 'image/jpeg' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

const IntroSlide: React.FC<{ slide: Slide }> = ({ slide }) => (
    <div className="bg-white border-2 border-brand-yellow rounded-xl p-8 transition-shadow hover:shadow-lg h-full flex flex-col justify-center items-center text-center">
        <SmartChalkLogoMark className="h-24 w-auto mb-6" />
        <h1 className="text-4xl font-bold text-brand-black">{slide.title}</h1>
        <div className="text-lg text-slate-600 mt-2">
            <FormattedText text={slide.content} />
        </div>
    </div>
);

const ContentSlide: React.FC<{ slide: Slide, onUpdate: (updatedSlide: Slide) => void, subject: string; topic: string; onProcessingChange?: (isProcessing: boolean) => void; }> = ({ slide, onUpdate, subject, topic, onProcessingChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    const saveImageToLibrary = async (imageData: string) => {
        const newRecord = {
            id: crypto.randomUUID(),
            imageData,
            subject,
            topic,
            slideId: slide.id,
            presentationId: slide.presentationId,
            createdAt: Date.now(),
            syncStatus: 'dirty'
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
        onProcessingChange?.(true);
        setImageError(null);
        try {
            const squareFile = await cropImageToSquare(file);
            // Upload to Vercel Blob storage
            const formData = new FormData();
            formData.append('image', squareFile);
            formData.append('folder', 'slides');
            
            const token = localStorage.getItem('google_token') || localStorage.getItem('googleToken');
            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });

            const base64 = await readFileAsBase64(squareFile);
            if (response.ok) {
                await response.json();
                // Keep the durable local copy on the slide itself. The remote URL is optional;
                // local base64 prevents saved presentations from losing images when cloud storage
                // is unavailable, expired, or inaccessible from the browser.
                onUpdate({ ...slide, imageData: base64 });
            } else {
                // Keep the slide usable in the static-first/local workspace even when cloud upload is unavailable.
                onUpdate({ ...slide, imageData: base64 });
            }

            // Keep a local copy available for the presentation image library.
            await saveImageToLibrary(base64);
        } catch (e) {
            try {
                const squareFile = await cropImageToSquare(file);
                const base64 = await readFileAsBase64(squareFile);
                onUpdate({ ...slide, imageData: base64 });
                await saveImageToLibrary(base64);
                setImageError(null);
            } catch {
                setImageError(e instanceof Error ? e.message : "Failed to upload image.");
            }
        } finally {
            setIsProcessing(false);
            onProcessingChange?.(false);
        }
    };

    const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await processAndUploadFile(file);
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

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onUpdate({ ...slide, [e.target.name]: e.target.value });
    };
    
    const handleWebImageSelect = async (imageBlob: Blob) => {
        setIsSearchModalOpen(false);
        await processAndUploadFile(imageBlob);
    };

    const handleLibraryImageSelect = (imageData: string) => {
        onUpdate({ ...slide, imageData: imageData });
        setIsLibraryModalOpen(false);
    };

    return (
        <>
            <ImageSearchModal 
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onImageSelect={handleWebImageSelect}
                initialSearchQuery={slide.title}
            />
             <ImageLibraryModal 
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onImageSelect={handleLibraryImageSelect}
            />
            <div className="bg-white border-2 border-brand-yellow rounded-xl p-4 transition-shadow hover:shadow-lg h-full flex gap-4">
                {/* Left Column (Image) */}
                 <div className="w-1/3 flex-shrink-0 flex flex-col gap-2">
                    <div 
                        className="flex-grow rounded-xl border-2 border-dashed border-slate-300 bg-brand-paper p-4 relative flex items-center justify-center text-center cursor-pointer transition-colors hover:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        onPaste={handlePaste}
                        tabIndex={0}
                        aria-label="Image upload area. Click to upload, or focus and paste an image."
                    >
                        {isProcessing ? (
                            <Loader className="h-8 w-8 text-brand-yellow" />
                        ) : slide.imageData ? (
                            <img src={slide.imageData} alt="Slide visual" className="max-h-full max-w-full object-contain rounded" />
                        ) : (
                            <div className="text-slate-500">
                                <UploadIcon className="h-10 w-10 mx-auto" />
                                <p className="text-sm mt-2 font-semibold">Upload or Paste Image</p>
                            </div>
                        )}
                         <input type="file" ref={fileInputRef} onChange={handleImageFileChange} className="hidden" accept="image/*" />
                         {imageError && <p role="alert" className="absolute bottom-2 left-2 right-2 rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-brand-black">{imageError}</p>}
                    </div>
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" disabled={isProcessing} >
                            <UploadIcon className="h-4 w-4 mr-1"/>
                            {slide.imageData ? 'Replace' : 'Upload'}
                        </Button>
                         <Button onClick={() => setIsSearchModalOpen(true)} variant="secondary" size="sm" disabled={isProcessing} title="Find an image from the web">
                            <GlobeAltIcon className="h-4 w-4 mr-1"/>
                            Find Image
                        </Button>
                         <Button onClick={() => setIsLibraryModalOpen(true)} variant="secondary" size="sm" disabled={isProcessing} title="Pick an image from your local library">
                            <DatabaseIcon className="h-4 w-4 mr-1"/>
                            Pick from Library
                        </Button>
                    </div>
                </div>

                {/* Right Column (Content) */}
                <div className="w-2/3 flex flex-col gap-2">
                     <Input 
                        label={`Slide ${slide.slideNumber -1} Title`} 
                        name="title" 
                        value={slide.title}
                        onChange={handleTextChange}
                        className="text-lg font-bold"
                    />
                    <TextArea 
                        label="Content" 
                        name="content"
                        value={slide.content} 
                        onChange={handleTextChange} 
                        rows={8}
                        wrapperClassName="flex flex-col flex-grow"
                        className="flex-grow resize-none"
                    />
                </div>
            </div>
        </>
    );
};


interface SlideCardProps {
    slide: Slide;
    onUpdate: (updatedSlide: Slide) => void;
    subject: string;
    topic: string;
    onProcessingChange?: (isProcessing: boolean) => void;
}

export const SlideCard: React.FC<SlideCardProps> = ({ slide, onUpdate, subject, topic, onProcessingChange }) => {
    if (slide.isIntro) {
        return <IntroSlide slide={slide} />;
    }
    
    return <ContentSlide slide={slide} onUpdate={onUpdate} subject={subject} topic={topic} onProcessingChange={onProcessingChange} />;
};