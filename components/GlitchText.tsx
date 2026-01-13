import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'p' | 'span' | 'div';
}

const GlitchText: React.FC<GlitchTextProps> = ({ text, className = "", as = 'span' }) => {
  const Component = as;
  
  return (
    <Component className={`relative inline-block group ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-70 animate-pulse group-hover:translate-x-[2px] group-hover:translate-y-[1px] mix-blend-screen select-none">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-blue-500 opacity-70 animate-pulse delay-75 group-hover:-translate-x-[2px] group-hover:-translate-y-[1px] mix-blend-screen select-none">
        {text}
      </span>
    </Component>
  );
};

export default GlitchText;
