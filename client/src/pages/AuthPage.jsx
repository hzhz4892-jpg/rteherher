import { useState } from 'react';
import api from '../api/http';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ login: '', password: '', username: '', displayName: '' });
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    const { data } = await api.post(`/auth/${mode}`, form);
    login(data.token, data.user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="glass rounded-3xl p-8 w-full max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Yotix</h1>
        <input className="w-full bg-white/10 rounded-xl p-2" placeholder="login" onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <input type="password" className="w-full bg-white/10 rounded-xl p-2" placeholder="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mode === 'register' && (
          <>
            <input className="w-full bg-white/10 rounded-xl p-2" placeholder="@username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className="w-full bg-white/10 rounded-xl p-2" placeholder="display name" onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </>
        )}
        <button className="w-full rounded-xl bg-violet-500 py-2">{mode}</button>
        <button type="button" className="text-sm text-violet-300" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need account? Register' : 'Have account? Login'}
        </button>
      </form>
    </div>
  );
}
