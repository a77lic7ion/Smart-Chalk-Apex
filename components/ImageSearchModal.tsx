import React, { useState, useEffect, useRef } from 'react';
import { searchPexelsImages, fetchPexelsImageAsBlob } from '../services/pexelService';
import { Loader } from './Loader';
import { ExclamationTriangleIcon } from './Icons';
import { Button } from './Button';

interface ImageSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (imageBlob: Blob) => void;
    initialSearchQuery: string;
}

interface PexelsWebImage {
    id: number;
    src: {
        medium: string; // URL for the grid view
        original: string; // URL for downloading
    };
    alt: string;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({ isOpen, onClose, onImageSelect, initialSearchQuery }) => {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [images, setImages] = useState<PexelsWebImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const handleSearch = async (queryOverride?: string) => {
        const query = (queryOverride ?? searchQuery).trim();
        if (!query) {
            setError("Please enter a search term.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setImages([]);
        try {
            const result = await searchPexelsImages(query);
            if (result.length === 0) {
                setError("No images found for your search query.");
            }
            setImages(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred during image search.');
            setImages([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageClick = async (image: PexelsWebImage) => {
        setDownloadingId(image.id);
        setError(null);
        try {
            const blob = await fetchPexelsImageAsBlob(image.src.original);
            onImageSelect(blob);
            setDownloadingId(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to download selected image.');
            setDownloadingId(null);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            setSearchQuery(initialSearchQuery);
            if (initialSearchQuery) {
                handleSearch(initialSearchQuery);
            }
        } else {
            setImages([]);
            setError(null);
            setIsLoading(false);
            setDownloadingId(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialSearchQuery]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/80 p-4">
            <div ref={modalRef} className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-200 p-5">
                    <h2 className="text-lg font-semibold text-brand-black">Find an Image from Pexels</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for high-quality images..."
                            className="min-h-11 flex-grow rounded-xl border border-slate-300 bg-white px-3 py-2 text-brand-charcoal outline-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/40"
                            autoFocus
                        />
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                            Search
                        </Button>
                    </form>
                </div>
                
                <div className="flex-grow overflow-y-auto bg-brand-paper p-5">
                    {error && (
                         <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                             <ExclamationTriangleIcon className="mb-2 h-12 w-12 text-brand-yellow"/>
                             <p className="font-semibold text-brand-black">Search Failed</p>
                             <p className="text-sm">{error}</p>
                         </div>
                    )}
                    {!error && !isLoading && images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <button
                                    key={image.id}
                                    onClick={() => handleImageClick(image)}
                                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-brand-yellow focus:ring-offset-2"
                                    disabled={downloadingId !== null}
                                >
                                    <img 
                                        src={image.src.medium} 
                                        alt={image.alt} 
                                        title={image.alt}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                     {downloadingId === image.id && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader className="h-8 w-8 text-white"/>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                     {isLoading && (
                         <div className="flex items-center justify-center h-full">
                            <Loader className="h-12 w-12 text-brand-yellow" />
                         </div>
                     )}
                </div>
                
                <div className="flex justify-end border-t border-slate-200 p-5">
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};