import React from 'react';

const SlyntosLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path 
      d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" 
      fill="currentColor" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default SlyntosLogo;
