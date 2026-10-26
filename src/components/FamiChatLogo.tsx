import React from 'react';

interface FamiChatLogoProps {
  className?: string;
}

/** Marca FamiChat: globo de chat con un corazón central. Hereda el color con currentColor. */
export const FamiChatLogo: React.FC<FamiChatLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2.5C6.75 2.5 2.5 6.4 2.5 11.2c0 2.1.8 4 2.15 5.5L3.8 20.6a.7.7 0 0 0 .95.8l3.9-1.6c1.05.35 2.2.55 3.35.55 5.25 0 9.5-3.9 9.5-8.7S17.25 2.5 12 2.5Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.6s-3.6-2.3-3.6-4.9c0-1.3 1-2.3 2.2-2.3.65 0 1.15.3 1.4.7.25-.4.75-.7 1.4-.7 1.2 0 2.2 1 2.2 2.3 0 2.6-3.6 4.9-3.6 4.9Z"
        fill="currentColor"
      />
    </svg>
  );
};
