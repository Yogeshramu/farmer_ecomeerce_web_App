'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';

export default function FarmerLogin() {
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
            router.push('/farmer/dashboard');
        } else {
            alert('Login failed. Please register if you are new.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-emerald-100">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-emerald-900">Farmer Access</h1>
                    <p className="text-slate-500">Login to manage your crops</p>
                </div>

                <div className="space-y-4">
                    <input
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="Email / Phone"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button onClick={handleLogin} isLoading={loading} className="flex-1 h-12 text-lg">Login</Button>
                    <Button onClick={() => router.push('/farmer/register')} variant="outline" disabled={loading} className="flex-1 h-12 text-lg">Register</Button>
                </div>

                <p className="text-xs text-center text-slate-400">
                    *Demo: Register button creates a random farmer account.
                </p>
            </div>
        </div>
    );
}
