import React from 'react';

const Card = ({ children, className = '', padding = 'p-4', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 ${padding} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  );
};

export default Card;
