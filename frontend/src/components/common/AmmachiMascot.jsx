import React from 'react';

export const AmmachiMascot = ({ size = 'md', className = '', speaking = false }) => {
  const sizeClasses = {
    xs: 'w-10 h-10',
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36'
  };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 p-1 shadow-md ${speaking ? 'ring-4 ring-amber-300 animate-pulse' : ''} ${className}`}>
      <div className={`flex items-center justify-center rounded-full bg-amber-50 shadow-inner overflow-hidden ${sizeClasses[size] || sizeClasses.md}`}>
        <img 
          src="/logo/ammachi_logo.jpg" 
          alt="Ammachi Mascot" 
          className="w-full h-full object-cover transform hover:scale-110 transition-transform" 
        />
      </div>
      {speaking && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
        </span>
      )}
    </div>
  );
};
