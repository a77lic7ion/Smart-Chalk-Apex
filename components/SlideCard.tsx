import React, { useState, useRef, ChangeEvent } from 'react';
import type { Slide } from '../types';
import { UploadIcon, ApexLogo, ApexLogoFull, GlobeAltIcon, DatabaseIcon } from './Icons';
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

const IntroSlide: React.FC<{ slide: Slide }> = ({ slide }) => (
    <div className="bg-white border-2 border-brand-green rounded-xl p-8 transition-shadow hover:shadow-lg h-full flex flex-col justify-center items-center text-center">
        <ApexLogoFull className="h-24 w-auto mb-6" />
        <h1 className="text-4xl font-bold text-brand-navy">{slide.title}</h1>
        <div className="text-lg text-slate-600 mt-2">
            <FormattedText text={slide.content} />
        </div>
    </div>
);

const ContentSlide: React.FC<{ slide: Slide, onUpdate: (updatedSlide: Slide) => void, subject: string; topic: string; }> = ({ slide, onUpdate, subject, topic }) => {
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
            onUpdate({ ...slide, imageData: base64 });
            await saveImageToLibrary(base64);
        } catch (e) {
            setImageError(e instanceof Error ? e.message : "Failed to read image file.");
        } finally {
            setIsProcessing(false);
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
            <div className="bg-white border-2 border-brand-green rounded-xl p-4 transition-shadow hover:shadow-lg h-full flex gap-4">
                {/* Left Column (Image) */}
                 <div className="w-1/3 flex-shrink-0 flex flex-col gap-2">
                    <div 
                        className="flex-grow bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-center p-4 relative cursor-pointer hover:border-brand-green transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green"
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        onPaste={handlePaste}
                        tabIndex={0}
                        aria-label="Image upload area. Click to upload, or focus and paste an image."
                    >
                        {isProcessing ? (
                            <Loader className="h-8 w-8 text-brand-green" />
                        ) : slide.imageData ? (
                            <img src={slide.imageData} alt="Slide visual" className="max-h-full max-w-full object-contain rounded" />
                        ) : (
                            <div className="text-slate-500">
                                <UploadIcon className="h-10 w-10 mx-auto" />
                                <p className="text-sm mt-2 font-semibold">Upload or Paste Image</p>
                            </div>
                        )}
                         <input type="file" ref={fileInputRef} onChange={handleImageFileChange} className="hidden" accept="image/*" />
                         {imageError && <p className="absolute bottom-2 left-2 right-2 text-xs text-red-600 bg-red-100 p-1 rounded">{imageError}</p>}
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
}

export const SlideCard: React.FC<SlideCardProps> = ({ slide, onUpdate, subject, topic }) => {
    if (slide.isIntro) {
        return <IntroSlide slide={slide} />;
    }
    
    return <ContentSlide slide={slide} onUpdate={onUpdate} subject={subject} topic={topic} />;
};