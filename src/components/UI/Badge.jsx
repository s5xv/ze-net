import { twMerge } from 'tailwind-merge';

export default function Badge({ 
  children, 
  variant = 'default', 
  className = '',
  icon: Icon 
}) {
  const variants = {
    default: 'bg-gray-800 text-gray-400',
    verified: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    sponsored: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    category: 'bg-gray-800 text-gray-300',
  };
  
  return (
    <span className={twMerge(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}
