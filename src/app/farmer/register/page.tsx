'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Home } from 'lucide-react';

export default function FarmerRegister() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        mobile: '',
        pincode: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async () => {
        // Validation
        if (!formData.name || !formData.email || !formData.password || !formData.mobile) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ ...formData, role: 'FARMER' }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                alert('Registration Successful!');
                router.push('/farmer/dashboard');
            } else {
                const data = await res.json();
                alert(data.error || 'Registration failed');
            }
        } catch {
            alert('Something went wrong');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-emerald-100">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 -ml-2">
                    <ArrowLeft size={16} className="mr-1" /> Back
                </Button>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-emerald-900">Farmer Registration</h1>
                    <p className="text-slate-500">Join FarmDirect to sell your crops</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <User size={16} className="inline mr-1" /> Full Name *
                        </label>
                        <input
                            name="name"
                            placeholder="Enter your full name"
                            onChange={handleChange}
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Mail size={16} className="inline mr-1" /> Email Address *
                        </label>
                        <input
                            name="email"
                            type="email"
                            placeholder="your.email@example.com"
                            onChange={handleChange}
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Lock size={16} className="inline mr-1" /> Password *
                        </label>
                        <input
                            name="password"
                            type="password"
                            placeholder="Create a strong password"
                            onChange={handleChange}
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Phone size={16} className="inline mr-1" /> Mobile Number *
                        </label>
                        <input
                            name="mobile"
                            type="tel"
                            placeholder="10-digit mobile number"
                            onChange={handleChange}
                            maxLength={10}
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <MapPin size={16} className="inline mr-1" /> Pincode
                            </label>
                            <input
                                name="pincode"
                                placeholder="600001"
                                onChange={handleChange}
                                maxLength={6}
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Home size={16} className="inline mr-1" /> Village/Area
                            </label>
                            <input
                                name="address"
                                placeholder="Your village"
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleRegister} isLoading={loading} className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                    Create Account
                </Button>

                <p className="text-xs text-center text-slate-400">
                    Already have an account? <a href="/farmer/login" className="text-emerald-600 hover:underline">Login here</a>
                </p>
            </div>
        </div>
    );
}
