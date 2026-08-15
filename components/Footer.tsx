import React from 'react';
import { FacebookIcon, InstagramIcon, TwitterIcon, YouTubeIcon, TikTokIcon, WhatsAppIcon, LinkedInIcon } from './Icons';

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
        <footer className="bg-brand-black text-white mt-auto">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-center">
                    <div className="flex flex-wrap justify-center gap-4">
                        {socialLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-brand-yellow transition-colors"
                                aria-label={link.name}
                            >
                                <link.icon className="h-5 w-5" />
                            </a>
                        ))}
                    </div>
                </div>
                <div className="mt-3 border-t border-gray-700 pt-2 text-center text-[10px] text-gray-400">
                    &copy; {new Date().getFullYear()} SmartChalk. All Rights Reserved.
                </div>
            </div>
        </footer>
    );
};