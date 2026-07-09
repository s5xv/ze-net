import { twMerge } from 'tailwind-merge';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-700 text-gray-300 hover:bg-gray-800 focus:ring-gray-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-gray-800',
    sponsored: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  };
  
  return (
    <button 
      className={twMerge(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
