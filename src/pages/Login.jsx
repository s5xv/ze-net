import { supabase } from '../services/supabase';
import { useTheme } from '../hooks/useTheme';

export default function Login() {
  const { isDark, toggleTheme } = useTheme();

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      // If there is an error, show it so we know what is wrong
      if (error) {
        console.error("Supabase Login Error:", error);
        alert("Login failed: " + error.message);
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
      alert("An unexpected error occurred. Check the console.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center px-4">
      
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-6">
        <button
          onClick={toggleTheme}
          className="text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide"
        >
          {isDark ? 'LIGHT' : 'DARK'}
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <img 
          src="/assets/logo.png" 
          alt="Z&E Net" 
          className="h-32 w-32 object-contain mb-6"
          style={{ imageRendering: 'pixelated' }}
        />
        <h1 className="text-5xl font-bold tracking-tight">
          Z&E <span className="text-orange-500">Net</span>
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-3">Sign in to manage your account</p>
      </div>

      <button
        onClick={handleSignIn}
        className="px-8 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono font-medium rounded-lg transition-colors flex items-center gap-3 text-lg shadow-lg tracking-wide"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        SIGN IN WITH DISCORD
      </button>

      <a 
        href="/" 
        className="mt-8 text-sm font-mono text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide"
      >
        BACK TO HOME
      </a>
    </div>
  );
}
