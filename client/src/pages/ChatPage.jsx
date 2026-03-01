import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/http';
import { useAuth } from '../context/AuthContext';
import MessageBubble from '../components/MessageBubble';
import BadgeName from '../components/BadgeName';

export default function ChatPage() {
  const { token, user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const socket = useMemo(() => io('http://localhost:4000', { auth: { token } }), [token]);

  useEffect(() => {
    api.get('/chats').then((r) => {
      setChats(r.data);
      if (r.data[0]) setActiveChat(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    api.get(`/chats/${activeChat.id}/messages`).then((r) => setMessages(r.data));
    socket.emit('chat:join', activeChat.id);
    socket.on('message:new', (m) => setMessages((prev) => [...prev, m]));
    socket.on('typing:start', () => setTyping(true));
    socket.on('typing:stop', () => setTyping(false));
    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [activeChat, socket]);

  const send = async () => {
    if (!text.trim() || !activeChat) return;
    await api.post(`/chats/${activeChat.id}/messages`, { text });
    setText('');
    socket.emit('typing:stop', { chatId: activeChat.id });
  };

  const sendBot = async () => {
    if (!text.trim()) return;
    const { data } = await api.post('/emoji/bot', { text });
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: { displayName: 'EmojiBot' }, text: data.reply }]);
    setText('');
  };

  return (
    <div className="h-screen p-4 grid grid-cols-12 gap-3">
      <aside className="glass rounded-3xl p-3 col-span-3 overflow-auto">
        <div className="flex justify-between items-center mb-3"><BadgeName user={user} /><button onClick={logout}>Exit</button></div>
        {chats.map((chat) => (
          <button key={chat.id} onClick={() => setActiveChat(chat)} className="w-full text-left glass rounded-xl p-2 mb-2">
            {chat.title || chat.members.map((m) => m.user.displayName).join(', ')}
          </button>
        ))}
      </aside>
      <main className="glass rounded-3xl p-4 col-span-6 flex flex-col">
        <h2 className="font-bold mb-2">{activeChat?.title || 'Chat'}</h2>
        <div className="flex-1 overflow-auto">
          {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
        </div>
        {typing && <div className="text-xs text-violet-200">typing...</div>}
        <div className="flex gap-2 mt-2">
          <input value={text} onChange={(e) => { setText(e.target.value); socket.emit('typing:start', { chatId: activeChat?.id }); }} className="flex-1 bg-white/10 rounded-xl p-2" placeholder="message" />
          <button onClick={send} className="bg-violet-500 rounded-xl px-4">Send</button>
          <button onClick={sendBot} className="bg-fuchsia-500 rounded-xl px-3">EmojiBot</button>
        </div>
      </main>
      <section className="glass rounded-3xl p-4 col-span-3">
        <AdminPanel />
      </section>
    </div>
  );
}

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [packs, setPacks] = useState([]);

  const load = async () => {
    const [u, p] = await Promise.all([api.get('/admin/users'), api.get('/admin/emoji/packs')]);
    setUsers(u.data);
    setPacks(p.data);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const updatePremium = async (userId, enabled) => { await api.post(`/admin/users/${userId}/premium`, { enabled }); load(); };

  return (
    <div>
      <h3 className="font-semibold mb-2">Admin UI</h3>
      <div className="max-h-48 overflow-auto text-sm">
        {users.map((u) => (
          <div key={u.id} className="glass rounded-xl p-2 mb-1 flex justify-between items-center">
            <span>{u.username} ({u.tier})</span>
            <button className="text-xs bg-violet-500 rounded px-2 py-1" onClick={() => updatePremium(u.id, u.tier !== 'PREMIUM')}>toggle premium</button>
          </div>
        ))}
      </div>
      <h4 className="mt-3 text-sm">Pending emoji packs: {packs.length}</h4>
    </div>
  );
}
