'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';

export default function ConsumerLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            router.push('/consumer/dashboard');
        } else {
            alert('Login failed. Please register if you are new.');
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name: 'Consumer User', role: 'CONSUMER' }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            router.push('/consumer/dashboard');
        } else {
            alert('Registration failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-blue-100">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-blue-900">Consumer Login</h1>
                    <p className="text-slate-500">Shop fresh crops directly</p>
                </div>

                <div className="space-y-4">
                    <input
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button onClick={handleLogin} isLoading={loading} className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-blue-500/30">Login</Button>
                    <Button onClick={handleRegister} isLoading={loading} variant="outline" className="flex-1 h-12 text-lg">Register</Button>
                </div>
            </div>
        </div>
    );
}
