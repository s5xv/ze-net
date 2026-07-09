import Footer from '../components/Footer';
import { supabase } from './services/supabase';
import { useTheme } from './hooks/useTheme';
import { useState } from 'react';

export default function Login() {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        console.error("Supabase Login Error:", error);
        alert("Login failed: " + error.message);
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
      alert("An unexpected error occurred. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-[#09090b] dark:to-[#111111] flex items-center justify-center px-4 py-12">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="px-4 py-2 text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-lg border border-neutral-200 dark:border-white/10"
        >
          {isDark ? '☀️ LIGHT' : '🌙 DARK'}
        </button>
      </div>

      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <img 
              src="/assets/logo.png" 
              alt="Z&E Net" 
              className="h-32 w-32 object-contain mx-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">
            Z&E <span className="text-orange-500">Net</span>
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">DemocracyCraft Centralized Directory</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/5 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">Sign in to access your account</p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#4752C4]/50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Discord'}
          </button>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-white/10">
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a 
            href="/" 
            className="text-sm font-mono text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide"
          >
            ← BACK TO HOME
          </a>
        </div>
      </div>
    </div>
  );
}
