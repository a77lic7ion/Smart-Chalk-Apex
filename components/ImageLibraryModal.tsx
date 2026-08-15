import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import type { ImageLibraryRecord } from '../types';
import { Loader } from './Loader';
import { ExclamationTriangleIcon } from './Icons';
import { Button } from './Button';
import { Input } from './Input';

interface ImageLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (imageData: string) => void;
}

export const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ isOpen, onClose, onImageSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [images, setImages] = useState<ImageLibraryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            db.imageLibrary.toArray()
                .then(data => setImages(data.sort((a,b) => b.createdAt - a.createdAt)))
                .catch(err => setError(err.message || 'Failed to load image library.'))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const filteredImages = useMemo(() => {
        if (!searchQuery.trim()) return images;
        const lowercasedQuery = searchQuery.toLowerCase();
        return images.filter(img => 
            img.subject.toLowerCase().includes(lowercasedQuery) ||
            img.topic.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, images]);

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
                    <h2 className="text-lg font-semibold text-brand-black">Select from Your Image Library</h2>
                    <Input
                        label=""
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by subject or topic..."
                        className="mt-2"
                        wrapperClassName="w-full"
                    />
                </div>
                
                <div className="flex-grow overflow-y-auto bg-brand-paper p-5">
                    {isLoading && (
                         <div className="flex items-center justify-center h-full">
                            <Loader className="h-12 w-12 text-brand-yellow" />
                         </div>
                     )}
                    {error && (
                         <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                             <ExclamationTriangleIcon className="mb-2 h-12 w-12 text-brand-yellow"/>
                             <p className="font-semibold text-brand-black">Error Loading Library</p>
                             <p className="text-sm">{error}</p>
                         </div>
                    )}
                    {!isLoading && !error && filteredImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredImages.map((image) => (
                                <button
                                    key={image.id}
                                    onClick={() => onImageSelect(image.imageData)}
                                    className="group aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-brand-yellow focus:ring-offset-2"
                                >
                                    <img 
                                        src={image.imageData} 
                                        alt={`${image.subject} - ${image.topic}`} 
                                        title={`${image.subject} - ${image.topic}`}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                     {!isLoading && !error && filteredImages.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                           <p className="font-semibold text-brand-black">No Images Found</p>
                           <p className="text-sm">{searchQuery ? "No images match your search." : "Your image library is empty."}</p>
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