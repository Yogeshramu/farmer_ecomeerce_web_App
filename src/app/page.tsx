import Link from 'next/link';
import { Leaf, ShoppingCart, ArrowRight } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white flex flex-col items-center justify-center p-6 text-center space-y-12">
            <div className="space-y-6 animate-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold tracking-wider uppercase">
                    College Project Demo
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-emerald-950 tracking-tighter">
                    Farm<span className="text-emerald-600">Direct</span>.
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                    Empowering farmers. Removing middlemen. <br />
                    <span className="text-emerald-600">Fresh from soil to doorstep.</span>
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
                <Link
                    href="/farmer/login"
                    className="group relative bg-white p-10 rounded-[2rem] shadow-2xl shadow-emerald-900/10 hover:shadow-emerald-900/20 hover:-translate-y-2 transition-all duration-300 border border-emerald-100 flex flex-col items-center gap-6"
                >
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <Leaf size={48} className="text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-slate-800">Farmer</h2>
                        <p className="text-slate-500 font-medium">Sell your crops easily with voice.</p>
                    </div>
                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="text-emerald-400" />
                    </div>
                </Link>

                <Link
                    href="/consumer"
                    className="group relative bg-white p-10 rounded-[2rem] shadow-2xl shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-2 transition-all duration-300 border border-blue-50 flex flex-col items-center gap-6"
                >
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <ShoppingCart size={48} className="text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-slate-800">Consumer</h2>
                        <p className="text-slate-500 font-medium">Buy fresh, support locals.</p>
                    </div>
                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="text-blue-400" />
                    </div>
                </Link>
            </div>

            <footer className="text-slate-400 text-sm font-medium">
                © 2026 FarmDirect Project
            </footer>
        </div>
    );
}
