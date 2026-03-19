'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Leaf, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';

export default function ConsumerLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rbacError, setRbacError] = useState<{ message: string; correctPortal: string } | null>(null);

    const handleLogin = async () => {
        setLoading(true);
        setRbacError(null);
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, requiredRole: 'CONSUMER' }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            router.push('/consumer/dashboard');
        } else if (res.status === 403) {
            // RBAC: Wrong portal
            const data = await res.json();
            setRbacError({ message: data.error, correctPortal: data.correctPortal });
            setLoading(false);
        } else {
            alert('Login failed. Please register if you are new.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row-reverse bg-white">
            
            {/* Right Side - Image Cover */}
            <div className="hidden md:flex md:w-1/2 relative bg-blue-950 border-l border-blue-100/20">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80 mix-blend-overlay"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1600')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/40 to-transparent" />
                
                <div className="relative z-10 p-12 flex flex-col justify-end w-full h-full text-white">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-lg">
                        <ShoppingCart className="text-blue-300" size={32} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-5xl font-black tracking-tight leading-tight">
                            புதிய விளைபொருட்கள்,<br/>உங்கள் வீட்டிற்கே!
                        </h1>
                        <h2 className="text-2xl font-bold text-blue-100/90 leading-snug">
                            Fresh from farm, straight to you.
                        </h2>
                        <p className="text-blue-100/80 text-lg max-w-md font-medium leading-relaxed mt-4">
                            இடைத்தரகர்கள் இல்லாமல் விவசாயிகளிடமிருந்து நேரடியாக ஆரோக்கியமான காய்கறிகளை குறைந்த விலையில் வாங்குங்கள்.
                        </p>
                    </div>
                </div>
            </div>

            {/* Left Side - Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative">
                
                {/* Mobile BG subtle patterns */}
                <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none md:hidden" />

                <div className="w-full max-w-md space-y-8 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-100 md:hidden">
                            <ShoppingCart size={12} />
                            <span>FarmDirect</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight">நுகர்வோர் நுழைவு</h2>
                        <h3 className="text-xl font-bold text-slate-500 tracking-tight">Consumer Access</h3>
                        <p className="text-blue-500 pt-1 text-sm font-bold">மீண்டும் வருக! உங்கள் விவரங்களை உள்ளிடவும்.</p>
                    </div>

                    {/* RBAC Error Banner */}
                    {rbacError && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
                                <div>
                                    <p className="text-red-700 font-bold">{rbacError.message}</p>
                                    <p className="text-red-500/80 text-xs font-medium mt-1">நீங்கள் விவசாயி. தவறான நுழைவாயில்!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(rbacError.correctPortal)}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-md hover:shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                            >
                                <Leaf size={18} />
                                Go to Farmer Portal / விவசாயி
                            </button>
                        </div>
                    )}

                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex gap-1">Email or Phone <span className="text-blue-600">/ மின்னஞ்சல் (அ) செல்போன்</span></label>
                            <input
                                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                placeholder="Enter your email or phone"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex gap-1">Password <span className="text-blue-600">/ கடவுச்சொல்</span></label>
                                <span className="text-blue-500 text-xs font-bold hover:underline cursor-pointer transition-all">Forgot? / மறந்ததா?</span>
                            </div>
                            <input
                                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" isLoading={loading} className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 flex justify-center items-center gap-2 group shadow-blue-500/20 shadow-lg">
                                <span>உள்நுழைய / Sign In</span>
                                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                            </Button>
                        </div>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-400 text-xs font-bold uppercase tracking-widest">New Customer?</span>
                        </div>
                    </div>

                    <Button 
                        onClick={() => router.push('/consumer/register')} 
                        variant="outline" 
                        disabled={loading} 
                        className="w-full h-14 text-base font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Create an Account
                        <span className="text-[10px] font-normal opacity-70 ml-2">பதிவு செய்</span>
                    </Button>
                </div>
            </div>

        </div>
    );
}
