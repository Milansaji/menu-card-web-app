import React from 'react';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className = '', disabled = false, ...props }) => {
  const baseStyles = 'relative overflow-hidden px-6 py-3 rounded-2xl font-bold transition-all duration-300 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95';
  
  const variants = {
    primary: 'bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_25px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 focus:ring-indigo-100',
    secondary: 'bg-white text-gray-900 border border-gray-100 shadow-sm hover:bg-gray-50 focus:ring-gray-50',
    danger: 'bg-linear-to-br from-red-500 to-rose-600 text-white shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_25px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 focus:ring-red-500/20',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500/20',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400/20',
    glass: 'glass text-gray-900 hover:bg-white/50 focus:ring-white/20 shadow-sm'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </button>
  );
};

export default Button;
