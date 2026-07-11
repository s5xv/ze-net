import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Contact() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      setSent(true);
      setName(''); setEmail(''); setSubject(''); setMessage('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        {sent ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
            <p className="text-green-600 dark:text-green-400 font-bold">Message sent! We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows="5" className="w-full px-3 py-2 bg-gray-100 dark:bg-[#202124] border border-gray-300 dark:border-gray-700 rounded-lg"></textarea>
            </div>
            <button type="submit" disabled={sending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </main>
    </Layout>
  );
}
