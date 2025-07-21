import React from 'react';

const formatPart = (part: string, key: string): React.ReactNode => {
    if (part.match(/^\d+\/\d+$/)) {
        const [num, den] = part.split('/');
        return <span key={key} className="fraction"><sup>{num}</sup><sub>{den}</sub></span>;
    }
    if (part === '½') return <span key={key} className="fraction"><sup>1</sup><sub>2</sub></span>;
    if (part === '¼') return <span key={key} className="fraction"><sup>1</sup><sub>4</sub></span>;
    if (part === '¾') return <span key={key} className="fraction"><sup>3</sup><sub>4</sub></span>;
    if (part === '*') return <React.Fragment key={key}>&times;</React.Fragment>;
    if (part === '^') return <React.Fragment key={key}>/</React.Fragment>;
    return <React.Fragment key={key}>{part}</React.Fragment>;
}

export const FormattedText: React.FC<{ text: string; className?: string; as?: 'span' | 'div' }> = ({ text, className, as = 'div' }) => {
    if (!text) return null;
    
    const mathSymbolRegex = /(\d+\/\d+|[½¼¾]|\*|\^)/g;
    
    const lines = text.split('\n');
    
    const Component = as;

    return (
        <Component className={className}>
            {lines.map((line, lineIndex) => {
                // Perform markdown-like cleaning first
                let processedLine = line.trim();

                if (processedLine.trim().startsWith('#### ')) {
                     processedLine = processedLine.trim().substring(5).toUpperCase();
                }
                
                // Remove bold markers
                processedLine = processedLine.replace(/\*\*/g, '');
                
                // Replace list markers
                processedLine = processedLine.replace(/^\s*\*\s+/, '⦁\t');

                return (
                    <React.Fragment key={lineIndex}>
                        {processedLine ? processedLine.split(mathSymbolRegex).map((part, partIndex) => formatPart(part, `${lineIndex}-${partIndex}`)) : <>&nbsp;</>}
                        {lineIndex < lines.length - 1 && <br />}
                    </React.Fragment>
                );
            })}
        </Component>
    );
};