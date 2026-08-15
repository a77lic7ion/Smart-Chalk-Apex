import React from 'react';
import { FacebookIcon, InstagramIcon, TwitterIcon, YouTubeIcon, TikTokIcon, WhatsAppIcon, LinkedInIcon, SmartChalkLogo } from './Icons';

const socialLinks = [
    { name: 'Facebook', icon: FacebookIcon, href: 'https://www.facebook.com/' },
    { name: 'Instagram', icon: InstagramIcon, href: 'https://www.instagram.com/' },
    { name: 'Twitter', icon: TwitterIcon, href: 'https://twitter.com/' },
    { name: 'YouTube', icon: YouTubeIcon, href: 'https://www.youtube.com/' },
    { name: 'TikTok', icon: TikTokIcon, href: 'https://www.tiktok.com/' },
    { name: 'WhatsApp', icon: WhatsAppIcon, href: '#' },
    { name: 'LinkedIn', icon: LinkedInIcon, href: 'https://www.linkedin.com/' },
];

export const Footer: React.FC = () => {
    return (
        <footer className="bg-brand-dark-grey text-brand-light-grey mt-auto">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex-shrink-0 rounded-md bg-white px-3 py-1.5">
                        <SmartChalkLogo className="h-12 w-auto" />
                    </div>
                    <div className="flex flex-wrap justify-center gap-5">
                        {socialLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-light-grey hover:text-brand-green transition-colors"
                                aria-label={link.name}
                            >
                                <link.icon className="h-6 w-6" />
                            </a>
                        ))}
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} SmartChalk. All Rights Reserved.
                </div>
            </div>
        </footer>
    );
};