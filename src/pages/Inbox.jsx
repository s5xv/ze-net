import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState('');
  const [newMsg, setNewMsg] = useState({ to: '', text: '' });
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at, sender:sender_id(username), receiver:receiver_id(username)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);
    const map = {};
    (data || []).forEach(m => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      const otherName = m.sender_id === user.id ? (m.receiver?.username || 'Unknown') : (m.sender?.username || 'Unknown');
      if (!map[otherId] || new Date(m.created_at) > new Date(map[otherId].created_at)) {
        map[otherId] = { ...m, otherId, otherName };
      }
    });
    setConversations(Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  };

  const loadThread = async (otherId) => {
    setActive(otherId);
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at, sender:sender_id(username)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(500);
    setThread(data || []);
    await supabase.from('messages').update({ read: true }).eq('sender_id', otherId).eq('receiver_id', user.id).eq('read', false);
    loadConversations();
  };

  const sendReply = async () => {
    if (!active || !reply.trim() || !user) return;
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: active, content: reply.trim() });
    if (error) { alert('Error: ' + error.message); return; }
    setReply('');
    loadThread(active);
  };

  const sendNew = async () => {
    if (!newMsg.to.trim() || !newMsg.text.trim() || !user) return;
    const { data: recipient, error: profErr } = await supabase.from('profiles').select('id').eq('username', newMsg.to.trim()).maybeSingle();
    if (profErr || !recipient) { alert('User not found'); return; }
    if (recipient.id === user.id) { alert("You can't message yourself"); return; }
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: recipient.id, content: newMsg.text.trim() });
    if (error) { alert('Error: ' + error.message); return; }
    setNewMsg({ to: '', text: '' });
    loadConversations();
    loadThread(recipient.id);
  };

  useEffect(() => { loadConversations(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);
  useEffect(() => {
    if (!user) return;
    const sub = supabase.channel('inbox-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => { loadConversations(); if (active) loadThread(active); })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user, active]);

  return (
    <Layout user={user}>
      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-white mb-6">Inbox</h1>
        {!user ? (
          <div className="text-center py-16 text-gray-400">Please sign in to use the inbox.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-[#303134] border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-300 mb-3">New Message</h3>
                <input
                  type="text"
                  value={newMsg.to}
                  onChange={e => setNewMsg({ ...newMsg, to: e.target.value })}
                  placeholder="Recipient username"
                  className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm mb-2"
                />
                <textarea
                  value={newMsg.text}
                  onChange={e => setNewMsg({ ...newMsg, text: e.target.value })}
                  placeholder="Message..."
                  rows="3"
                  className="w-full px-3 py-2 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm mb-2"
                />
                <button onClick={sendNew} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Send</button>
              </div>
              <div className="bg-[#303134] border border-gray-700 rounded-xl overflow-hidden">
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-sm p-4 text-center">No conversations yet</p>
                ) : (
                  conversations.map(c => (
                    <button key={c.otherId} onClick={() => loadThread(c.otherId)} className={`w-full text-left px-4 py-3 border-b border-gray-700 last:border-0 transition-colors ${active === c.otherId ? 'bg-[#202124]' : 'hover:bg-[#202124]/60'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-sm truncate">{c.otherName}</span>
                        {!c.read && c.sender_id !== user.id && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate mt-0.5">{c.content}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-[#303134] border border-gray-700 rounded-xl flex flex-col" style={{ height: '600px' }}>
              {!active ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-700 flex-1 overflow-y-auto space-y-3">
                    {thread.length === 0 && <p className="text-gray-500 text-sm text-center pt-8">No messages yet — say hi!</p>}
                    {thread.map(m => (
                      <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${m.sender_id === user.id ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#202124] text-gray-200 rounded-bl-sm'}`}>
                          <p className="text-sm break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? 'text-blue-200' : 'text-gray-500'}`}>{new Date(m.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div className="p-4 border-t border-gray-700 flex gap-2">
                    <input
                      type="text"
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-[#202124] border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <button onClick={sendReply} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Send</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
