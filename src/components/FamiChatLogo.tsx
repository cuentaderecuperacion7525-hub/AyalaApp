import React from 'react';

interface FamiChatLogoProps {
  className?: string;
}

export const FamiChatLogo: React.FC<FamiChatLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer elegant chat bubble */}
      <path 
        d="M21 11.5C21 16.1944 16.9706 20 12 20C10.5181 20 9.12384 19.654 7.89311 19.043L3 20L4.10235 15.6575C3.4116 14.4379 3 13.0182 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z" 
        fill="currentColor" 
        fillOpacity="0.15" 
      />
      {/* House outline inside the bubble representing "Familia" and "Home" */}
      <path 
        d="M8.5 12.2L12 9L15.5 12.2" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M9.8 12V15.5C9.8 15.9 10.1 16.2 10.5 16.2H13.5C13.9 16.2 14.2 15.9 14.2 15.5V12" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Center loving heart shape reflecting the family seal */}
      <path 
        d="M12 14.8C12 14.8 11.3 14.1 11.3 13.4C11.3 13.0 11.6 12.7 12 12.7C12.4 12.7 12.7 13.0 12.7 13.4C12.7 14.1 12 14.8 12 14.8Z" 
        fill="currentColor" 
        stroke="currentColor" 
        strokeWidth="0.8" 
      />
    </svg>
  );
};
