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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200">
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
                
                <div className="flex-grow overflow-y-auto p-4">
                    {isLoading && (
                         <div className="flex items-center justify-center h-full">
                            <Loader className="h-12 w-12 text-brand-yellow" />
                         </div>
                     )}
                    {error && (
                         <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                             <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mb-2"/>
                             <p className="font-semibold text-slate-700">Error Loading Library</p>
                             <p className="text-sm">{error}</p>
                         </div>
                    )}
                    {!isLoading && !error && filteredImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredImages.map((image) => (
                                <button
                                    key={image.id}
                                    onClick={() => onImageSelect(image.imageData)}
                                    className="aspect-square bg-slate-100 rounded-lg overflow-hidden focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-brand-yellow group"
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
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                           <p className="font-semibold text-slate-700">No Images Found</p>
                           <p className="text-sm">{searchQuery ? "No images match your search." : "Your image library is empty."}</p>
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