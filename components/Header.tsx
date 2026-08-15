import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import type { UserProfile } from '../types';
import { SmartChalkLogo } from './Icons';
import type { AppView, ThemeMode } from '../App';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: UserProfile;
  onLogout: () => void;
  isAdmin: boolean;
  theme: ThemeMode;
  onThemeToggle: () => void;
}

const AnimatedLabel: React.FC<{ label: string }> = ({ label }) => (
    <>
        <span className="label-static">{label}</span>
        <span className="label-animated" aria-hidden="true">
            {label.split('').map((letter, index) => (
                <div key={index} style={{ '--delay': index } as React.CSSProperties}>
                    {letter === ' ' ? '\u00A0' : letter}
                </div>
            ))}
        </span>
    </>
);

const getNavItems = (isAdmin: boolean): { view: AppView, label: string }[] => {
    const baseItems: { view: AppView, label: string }[] = [
        { view: 'testGenerator', label: 'Test Gen' },
        { view: 'exam', label: 'Exam Gen' },
        { view: 'homeworkGenerator', label: 'Homework Gen' },
        { view: 'lessonGenerator', label: 'Lesson Gen' },
        { view: 'slidesGenerator', label: 'Slides Gen' },
        { view: 'myContent', label: 'My Content' },
    ];

    if (isAdmin) {
        return [
            { view: 'dashboard', label: 'Dashboard' },
            { view: 'manualExamBuilder', label: 'Exam Creator' },
            ...baseItems,
            { view: 'settings', label: 'Settings' },
        ];
    }

    return [
        { view: 'dashboard', label: 'Dashboard' },
        ...baseItems,
        { view: 'settings', label: 'Settings' },
    ];
};

export const Header: React.FC<HeaderProps> = ({ currentView, setView, user, onLogout, isAdmin, theme, onThemeToggle }) => {
    const navRef = useRef<HTMLElement>(null);
    const [bubbleLeft, setBubbleLeft] = useState(0);
    const [bubbleWidth, setBubbleWidth] = useState(0);
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const currentNavItems = useMemo(() => getNavItems(isAdmin), [isAdmin]);

    useLayoutEffect(() => {
        const navNode = navRef.current;
        if (!navNode) return;

        const activeItem = navNode.querySelector('button.active');
        if (activeItem) {
            const navRect = navNode.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();
            setBubbleLeft(itemRect.left - navRect.left);
            setBubbleWidth(itemRect.width);
            setBubbleVisible(true);
        } else {
            setBubbleVisible(false);
        }
    }, [currentView, currentNavItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="bg-brand-paper sticky top-0 z-40 shadow-sm">
            <div className="container mx-auto flex items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
                <SmartChalkLogo className="h-12 w-auto shrink-0" />

                <div className="min-w-0 flex-1 overflow-x-auto px-1">
                    <nav className="animated-tab-bar" ref={navRef}>
                        <ul>
                            {currentNavItems.map(item => (
                                <li key={item.view}>
                                    <button
                                        onClick={() => setView(item.view)}
                                        className={currentView === item.view ? 'active' : ''}
                                    >
                                        <AnimatedLabel label={item.label} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div 
                            className="bubble" 
                            style={{ 
                                left: bubbleLeft, 
                                width: bubbleWidth,
                                opacity: bubbleVisible ? 1 : 0,
                                transform: bubbleVisible ? 'scale(1)' : 'scale(0.95)'
                            }}
                        ></div>
                    </nav>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onThemeToggle}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                        aria-pressed={theme === 'dark'}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-brand-yellow bg-brand-black px-3 text-xs font-bold uppercase tracking-wide text-brand-yellow transition-colors hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2"
                    >
                        <span aria-hidden="true" className="text-base leading-none">{theme === 'dark' ? '☀' : '◐'}</span>
                        <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                    </button>
                    <div className="relative">
                    <button onClick={() => setIsProfileOpen(p => !p)} className="flex items-center gap-2 rounded-full hover:bg-slate-200 p-1 transition-colors">
                        <img src={user.picture} alt={user.name || 'User profile'} className="h-8 w-8 rounded-full" />
                    </button>
                    {isProfileOpen && (
                        <div ref={profileRef} className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2">
                            <div className="px-3 py-2 border-b border-slate-200">
                                <p className="text-sm font-semibold text-brand-black truncate">{user.name || 'User'}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </header>
    );
};