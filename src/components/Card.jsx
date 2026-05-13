import React from 'react';

const Card = ({ children, className = '', padding = 'p-5', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-[2rem] border border-gray-100/50 
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] 
        hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] 
        transition-all duration-500 ease-out 
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} 
        ${padding} ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
