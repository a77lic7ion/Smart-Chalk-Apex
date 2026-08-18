import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="mt-auto border-t border-brand-black/10 bg-brand-black text-white">
            <div className="container mx-auto px-4 py-2 text-center text-[10px] text-white/70">
                &copy; {new Date().getFullYear()} SmartChalk. All Rights Reserved.
            </div>
        </footer>
    );
};
