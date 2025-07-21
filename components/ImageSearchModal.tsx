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

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError("Please enter a search term.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setImages([]);
        try {
            const result = await searchPexelsImages(searchQuery);
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
                handleSearch();
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-brand-navy">Find an Image from Pexels</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for high-quality images..."
                            className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                            autoFocus
                        />
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                            Search
                        </Button>
                    </form>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4">
                    {error && (
                         <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                             <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mb-2"/>
                             <p className="font-semibold text-slate-700">Search Failed</p>
                             <p className="text-sm">{error}</p>
                         </div>
                    )}
                    {!error && !isLoading && images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <button
                                    key={image.id}
                                    onClick={() => handleImageClick(image)}
                                    className="aspect-square bg-slate-100 rounded-lg overflow-hidden focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-brand-green group relative"
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
                            <Loader className="h-12 w-12 text-brand-green" />
                         </div>
                     )}
                </div>
                
                <div className="p-4 border-t border-slate-200 flex justify-end">
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};