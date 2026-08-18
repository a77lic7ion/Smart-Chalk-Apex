import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { UserProfile } from '../types';
import { SmartChalkLogo, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './Icons';
import darkThemeLogo from '../SmartChalk-logo-dark.png';
import type { AppView, ThemeMode } from '../App';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: UserProfile;
  onLogout: () => void;
  isAdmin: boolean;
  theme: ThemeMode;
  onThemeToggle: () => void;
  isSidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

const getCompactNavLabel = (view: AppView): string => ({
  dashboard: 'DB',
  testGenerator: 'TG',
  exam: 'EG',
  homeworkGenerator: 'HW',
  lessonGenerator: 'LS',
  slidesGenerator: 'SL',
  myContent: 'MC',
  settings: 'ST',
}[view] || 'SC');

const getNavItems = (isAdmin: boolean): { view: AppView; label: string }[] => {
  const baseItems: { view: AppView; label: string }[] = [
    { view: 'testGenerator', label: 'Test Gen' },
    { view: 'exam', label: 'Exam Gen' },
    { view: 'homeworkGenerator', label: 'Homework Gen' },
    { view: 'lessonGenerator', label: 'Lesson Gen' },
    { view: 'slidesGenerator', label: 'Slides Gen' },
    { view: 'myContent', label: 'My Content' },
  ];

  return isAdmin
    ? [
        { view: 'dashboard', label: 'Dashboard' },
        ...baseItems,
        { view: 'settings', label: 'Settings' },
      ]
    : [
        { view: 'dashboard', label: 'Dashboard' },
        ...baseItems,
        { view: 'settings', label: 'Settings' },
      ];
};

const UserAvatar: React.FC<{ user: UserProfile; size?: 'sm' | 'md' }> = ({ user, size = 'sm' }) => {
  const dimensions = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const initial = user.name?.trim().charAt(0).toUpperCase() || 'S';

  if (user.picture) {
    return <img src={user.picture} alt={user.name || 'User profile'} className={`${dimensions} rounded-full object-cover`} />;
  }

  return (
    <span aria-hidden="true" className={`${dimensions} inline-flex items-center justify-center rounded-full bg-brand-yellow text-sm font-black text-brand-black`}>
      {initial}
    </span>
  );
};

const HeaderLogo: React.FC<{ theme: ThemeMode; compact?: boolean }> = ({ theme, compact = false }) => (
  <div className={`smartchalk-logo-backdrop w-fit rounded-xl px-2.5 py-1.5 shadow-sm ${theme === 'dark' ? 'smartchalk-logo-backdrop-dark' : 'bg-white'}`}>
    {theme === 'dark'
      ? <img src={darkThemeLogo} alt="SmartChalk" className={`${compact ? 'h-10' : 'h-12'} w-auto object-contain`} />
      : <SmartChalkLogo className={`${compact ? 'h-10' : 'h-12'} w-auto self-start`} />}
  </div>
);

export const Header: React.FC<HeaderProps> = ({ currentView, setView, user, onLogout, isAdmin, theme, onThemeToggle, isSidebarCollapsed, onSidebarToggle }) => {
  const profileRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const currentNavItems = useMemo(() => getNavItems(isAdmin), [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewChange = (nextView: AppView) => {
    setView(nextView);
    setIsMobileNavOpen(false);
  };

  const profileMenu = (
    <div ref={profileRef} className="relative">
      <button
        type="button"
        onClick={() => setIsProfileOpen(open => !open)}
        aria-expanded={isProfileOpen}
        aria-label="Open user menu"
        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
      >
        <UserAvatar user={user} />
      </button>
      {isProfileOpen && (
        <div className="absolute bottom-full right-0 z-[80] mb-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl lg:bottom-0 lg:left-full lg:right-auto lg:top-auto lg:ml-3 lg:mt-0 lg:mb-0">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="truncate text-sm font-semibold text-brand-black">{user.name || 'User'}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="z-40">
      <aside className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200 bg-brand-paper px-4 py-6 transition-[width] duration-300 lg:flex ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          {!isSidebarCollapsed && (
            <HeaderLogo theme={theme} />
          )}
          <button
            type="button"
            onClick={onSidebarToggle}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-yellow bg-brand-black text-brand-yellow transition-colors hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          >
            {isSidebarCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
          </button>
        </div>

        <nav className={`mt-10 ${isSidebarCollapsed ? 'mt-8' : ''}`} aria-label="Primary navigation">
          <ul className="space-y-2">
            {currentNavItems.map(item => {
              const isActive = currentView === item.view;
              return (
                <li key={item.view}>
                  <button
                    type="button"
                    onClick={() => handleViewChange(item.view)}
                    aria-label={item.label}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full rounded-xl px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow ${isSidebarCollapsed ? 'mx-auto flex h-11 w-14 items-center justify-center rounded-lg border border-slate-300 bg-white text-center shadow-sm hover:border-brand-yellow hover:bg-brand-paper' : 'text-left'} ${
                      isActive
                        ? 'bg-brand-yellow text-brand-black shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-brand-charcoal'
                    }`}
                  >
                    {isSidebarCollapsed ? getCompactNavLabel(item.view) : item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'dark'}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand-yellow bg-brand-black px-3 text-xs font-bold uppercase tracking-wide text-brand-yellow transition-colors hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2"
          >
            <span aria-hidden="true" className="text-base leading-none">{theme === 'dark' ? '☀' : '◐'}</span>
            {!isSidebarCollapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-black">{user.name || 'Educator'}</p>
                <p className="truncate text-xs text-slate-500">Local workspace</p>
              </div>
            )}
            {profileMenu}
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-50 border-b border-slate-200 bg-brand-paper px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <HeaderLogo theme={theme} compact />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              aria-label="Switch account"
              title="Switch account"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-yellow bg-white text-brand-black transition-colors hover:bg-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              <UserAvatar user={user} size="sm" />
            </button>
            <button
              type="button"
              onClick={onThemeToggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'dark'}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-brand-yellow bg-brand-black px-3 text-xs font-bold uppercase tracking-wide text-brand-yellow transition-colors hover:bg-brand-yellow hover:text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(open => !open)}
              aria-controls="smartchalk-mobile-navigation"
              aria-expanded={isMobileNavOpen}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-brand-yellow px-3 text-xs font-bold uppercase tracking-wide text-brand-black transition-colors hover:bg-brand-black hover:text-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              <span aria-hidden="true" className="text-base leading-none">{isMobileNavOpen ? '×' : '☰'}</span>
              <span>Menu</span>
            </button>
          </div>
        </div>

        {isMobileNavOpen && (
          <div id="smartchalk-mobile-navigation" className="mt-3 border-t border-slate-200 pt-3">
            <nav aria-label="Primary navigation">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {currentNavItems.map(item => {
                  const isActive = currentView === item.view;
                  return (
                    <li key={item.view}>
                      <button
                        type="button"
                        onClick={() => handleViewChange(item.view)}
                        className={`w-full rounded-lg border px-3 py-3 text-left text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-brand-yellow ${
                          isActive
                            ? 'border-brand-yellow bg-brand-yellow text-brand-black'
                            : 'border-slate-200 bg-white text-brand-charcoal hover:border-brand-yellow hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
