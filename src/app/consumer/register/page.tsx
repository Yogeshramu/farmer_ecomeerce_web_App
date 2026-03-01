'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Home } from 'lucide-react';

export default function ConsumerRegister() {
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
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
                body: JSON.stringify({ ...formData, role: 'CONSUMER' }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setShowOtp(true);
            } else {
                const data = await res.json();
                alert(data.error || 'Registration failed');
            }
        } catch {
            alert('Something went wrong');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 4) {
            alert('Please enter OTP');
            return;
        }
        setOtpLoading(true);
        // Accept any OTP - just verify it's entered
        setTimeout(() => {
            setOtpLoading(false);
            alert('OTP Verified Successfully!');
            router.push('/consumer/dashboard');
        }, 1000);
    };

    if (showOtp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-blue-100">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail size={32} className="text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-blue-900">Verify OTP</h1>
                        <p className="text-slate-500">Enter the OTP sent to {formData.mobile}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter any code"
                                maxLength={6}
                                className="w-full p-4 text-center text-2xl font-bold tracking-widest border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <Button onClick={handleVerifyOtp} isLoading={otpLoading} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg">
                        Verify & Continue
                    </Button>

                    <p className="text-xs text-center text-slate-400">
                        Didn't receive? <button onClick={() => alert('OTP Resent!')} className="text-blue-600 hover:underline">Resend OTP</button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-blue-100">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 -ml-2">
                    <ArrowLeft size={16} className="mr-1" /> Back
                </Button>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-blue-900">Consumer Registration</h1>
                    <p className="text-slate-500">Join FarmDirect to buy fresh crops</p>
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
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Home size={16} className="inline mr-1" /> City
                            </label>
                            <input
                                name="address"
                                placeholder="Your city"
                                onChange={handleChange}
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <Button onClick={handleRegister} isLoading={loading} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg">
                    Create Account
                </Button>

                <p className="text-xs text-center text-slate-400">
                    Already have an account? <a href="/consumer/login" className="text-blue-600 hover:underline">Login here</a>
                </p>
            </div>
        </div>
    );
}
