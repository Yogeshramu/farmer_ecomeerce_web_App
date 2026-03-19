import Link from 'next/link';
import { Leaf, ShoppingCart, ArrowRight, ShieldCheck, Zap, Globe, MessageSquare, Heart, Mic } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Transparent Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
                        <Leaf className="text-white" size={24} />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-emerald-950">FarmDirect</span>
                </div>
                <div className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
                    <a href="#how-it-works" className="hover:text-emerald-600 transition-colors flex flex-col items-center">
                        <span>எப்படி செயல்படுகிறது</span>
                        <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter">How it Works</span>
                    </a>
                    <a href="#features" className="hover:text-emerald-600 transition-colors flex flex-col items-center">
                        <span>சிறப்பம்சங்கள்</span>
                        <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter">Features</span>
                    </a>
                    <a href="#about" className="hover:text-emerald-600 transition-colors flex flex-col items-center">
                        <span>எங்களைப் பற்றி</span>
                        <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter">About Us</span>
                    </a>
                </div>
                <div className="flex gap-4">
                    <Link href="/consumer/login">
                        <button className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-50 text-slate-800 hover:bg-slate-100 transition-all border border-slate-200 flex flex-col items-center leading-tight">
                            <span>உள்நுழைய</span>
                            <span className="text-[9px] font-normal opacity-60 uppercase">Login</span>
                        </button>
                    </Link>
                    <Link href="/farmer/login">
                        <button className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 flex flex-col items-center leading-tight">
                            <span>விவசாயியாக சேருங்கள்</span>
                            <span className="text-[9px] font-normal opacity-80 uppercase">Join as Farmer</span>
                        </button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-10 blur-3xl pointer-events-none">
                    <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-400 rounded-full animate-pulse" />
                    <div className="absolute top-1/2 left-3/4 w-[400px] h-[400px] bg-blue-300 rounded-full animate-bounce" />
                </div>

                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8 animate-in slide-in-from-left duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/50 border border-emerald-200 backdrop-blur-sm">
                            <Zap size={14} className="text-emerald-600 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">விவசாயத்தின் எதிர்காலம் | FUTURE OF AGRI</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-slate-950 tracking-tighter leading-none">
                            புத்துணர்ச்சி. <br />
                            <span className="text-emerald-600 italic">புதிய வடிவில்.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-600 max-w-xl font-bold leading-relaxed">
                            இயற்கை விவசாயிகளை நேரடியாக உங்கள் சமையலறைக்கு இணைக்கிறோம். <br />
                            <span className="text-lg font-medium text-slate-400 block mt-2 italic">Connecting farmers directly to your kitchen. No middlemen, no markups.</span>
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link href="/consumer" className="flex-1 min-w-[200px]">
                                <button className="w-full bg-slate-950 text-white px-8 py-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-0 hover:bg-slate-800 transition-all group overflow-hidden relative shadow-2xl shadow-slate-900/30">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">இப்போது வாங்க</span>
                                        <ShoppingCart size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <span className="text-[10px] font-normal opacity-60 uppercase tracking-widest mt-0.5">Start Shopping</span>
                                </button>
                            </Link>
                            <Link href="/farmer/login" className="flex-1 min-w-[200px]">
                                <button className="w-full bg-white text-emerald-600 border-2 border-emerald-600 px-8 py-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-0 hover:bg-emerald-50 transition-all hover:scale-[1.02]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">பயிர்களை விற்க</span>
                                        <ArrowRight size={20} />
                                    </div>
                                    <span className="text-[10px] font-normal opacity-70 uppercase tracking-widest mt-0.5">List Your Harvest</span>
                                </button>
                            </Link>
                        </div>
                        <div className="flex items-center gap-6 pt-4 text-slate-400">
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-emerald-950 tracking-tighter">150+</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest">செயல்படும் விவசாயிகள் | ACTIVE FARMERS</span>
                            </div>
                            <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                            <div className="flex flex-col text-xs space-y-1">
                                <p className="font-bold text-slate-500 text-sm">விவசாயிகளை நேரடியாக நுகர்வோருடன் இணைக்கிறோம்.</p>
                                <p className="italic">"Directly connecting farmers with consumers."</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative animate-in zoom-in duration-1000 delay-200">
                        <div className="w-full aspect-square rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rotate-3 hover:rotate-0 transition-transform duration-700">
                            <img src="/images/hero.png" alt="Farm Sunset" className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-700" />
                        </div>
                        <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 animate-bounce duration-[3000ms]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-2xl">
                                    <Heart className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">இயற்கையானது | PURE ORGANIC</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tighter">100% நம்பகமானது</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats/Badges Row */}
            <div className="bg-slate-50 py-10 border-y border-slate-100 mb-10 overflow-hidden">
                <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                    <div className="flex flex-col items-center gap-1 font-bold text-lg tracking-tighter text-slate-800">
                        <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> தரம் சான்றளிக்கப்பட்டது</div>
                        <span className="text-[10px] text-slate-400 uppercase font-normal">Quality Certified</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 font-bold text-lg tracking-tighter text-slate-800">
                        <div className="flex items-center gap-2"><Globe className="text-emerald-600" /> இயற்கைக்கு உகந்தது</div>
                        <span className="text-[10px] text-slate-400 uppercase font-normal">Eco-Friendly</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 font-bold text-lg tracking-tighter text-slate-800">
                        <div className="flex items-center gap-1"><Zap className="text-emerald-600" /> வேகமான டெலிவரி</div>
                        <span className="text-[10px] text-slate-400 uppercase font-normal">Fast Delivery</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 font-bold text-lg tracking-tighter text-slate-800">
                        <div className="flex items-center gap-2"><MessageSquare className="text-emerald-600" /> 24/7 ஆதரவு</div>
                        <span className="text-[10px] text-slate-400 uppercase font-normal">24/7 Support</span>
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 px-6 bg-white overflow-hidden relative">
                <div className="max-w-6xl mx-auto text-center mb-20 space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-tight">வணிக சங்கிலியில் <span className="text-emerald-600">புரட்சி.</span></h2>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto font-bold">விவசாயிகளின் அறுவடை நேரடியாக உங்கள் வீட்டிற்கு வருவதற்கான ஒரு புதிய தளம்.</p>
                    <p className="text-slate-400 text-sm italic">"Revolutionizing the supply chain from harvest to home."</p>
                </div>

                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
                    <div className="space-y-6 group p-8 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-50 group-hover:-translate-y-2 transition-transform">
                            <Mic size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tighter">குரல்-AI விற்பனை</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Voice-AI Guided Selling</p>
                        </div>
                        <p className="text-slate-500 font-medium leading-relaxed">விவசாயிகள் தங்கள் தாய்மொழியில் பேசினாலே போதும். AI தானாகவே பயிர் வகையை அடையாளம் கண்டு விலையை பரிந்துரைக்கும்.</p>
                    </div>

                    <div className="space-y-6 group p-8 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-50 group-hover:-translate-y-2 transition-transform">
                            <ShoppingCart size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tighter">நேரடி சந்தை</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Direct Consumer Market</p>
                        </div>
                        <p className="text-slate-500 font-medium leading-relaxed">உங்கள் பயிரை யார் பயிரிட்டார்கள் எப்போது அறுவடை செய்யப்பட்டது என்பதை முழுமையாக அறிந்து வாங்குங்கள்.</p>
                    </div>

                    <div className="space-y-6 group p-8 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 shadow-lg shadow-amber-50 group-hover:-translate-y-2 transition-transform">
                            <ShieldCheck size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tighter">மொத்த ஆர்டர்கள்</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Bulk Orders & Inquiries</p>
                        </div>
                        <p className="text-slate-500 font-medium leading-relaxed">மொத்தமாக வாங்க விரும்புவோர் விவசாயிகளுடன் நேரடியாக பேசி விலை மற்றும் அளவை முடிவு செய்யலாம்.</p>
                    </div>
                </div>
            </section>

            {/* Features Row - Visual Split */}
            <section id="features" className="py-24 px-6 bg-slate-950 text-white rounded-[3rem] mx-4 md:mx-10 mb-24 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-full h-full -z-10 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />

                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
                    <div className="flex-1">
                        <div className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl skew-y-1">
                            <img src="/images/market.png" alt="Market Produce" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">அறுவடையின் இதயத்தில் <br /> <span className="text-emerald-400">தொழில்நுட்பம்.</span></h2>
                        <ul className="space-y-8">
                            <li className="flex gap-4 items-start">
                                <div className="mt-1 p-1 bg-emerald-500/20 rounded-lg text-emerald-400"><Zap size={20} /></div>
                                <div>
                                    <p className="font-bold text-xl">முன்கணிப்பு விலை | Predictive Pricing</p>
                                    <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-tight">தூரம் சார்ந்த டெலிவரி கட்டணங்கள் மற்றும் சந்தை போக்கு பகுப்பாய்வு.</p>
                                </div>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="mt-1 p-1 bg-emerald-500/20 rounded-lg text-emerald-400"><Zap size={20} /></div>
                                <div>
                                    <p className="font-bold text-xl">உடனடி ஒத்திசைவு | Instant Sync</p>
                                    <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-tight">ஆர্ডার அப்டேட்கள் மற்றும் அலர்ட்களை நிகழ்நேரத்தில் பெற WebSocket தொழில்நுட்பம்.</p>
                                </div>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="mt-1 p-1 bg-emerald-500/20 rounded-lg text-emerald-400"><Zap size={20} /></div>
                                <div>
                                    <p className="font-bold text-xl">தமிழ் மொழி ஆதரவு | Native Support</p>
                                    <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-tight">தாய்மொழியிலேயே விற்பனை மற்றும் வாங்குதல் - அனைவருக்கும் எளிதான அணுகல்.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="about" className="py-24 px-6 text-center max-w-4xl mx-auto space-y-10">
                <h2 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter leading-tight">புதுமையான பசுமைப் <br /> <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-8">புரட்சிக்கு வாருங்கள்.</span></h2>
                <div className="flex flex-wrap justify-center gap-6">
                    <Link href="/consumer">
                        <button className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-bold text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 transition-all flex flex-col items-center">
                            <span>சுவைக்க ஆரம்பியுங்கள்</span>
                            <span className="text-xs font-normal opacity-80 uppercase tracking-widest mt-1">Taste Freshness</span>
                        </button>
                    </Link>
                    <Link href="/farmer/login">
                        <button className="bg-white text-slate-900 border-2 border-slate-900 px-10 py-5 rounded-[2rem] font-bold text-xl hover:bg-slate-50 hover:scale-105 transition-all flex flex-col items-center">
                            <span>பயிர்களை பட்டியலிடுங்கள்</span>
                            <span className="text-xs font-normal opacity-70 uppercase tracking-widest mt-1">List Your Harvest</span>
                        </button>
                    </Link>
                </div>
                <div className="pt-10 flex flex-col items-center gap-2">
                    <p className="text-xl text-slate-900 font-black tracking-tighter animate-pulse">"விவசாயிகளுக்கு ஆதரவளிப்போம், தரமான உணவை உண்போம்."</p>
                    <p className="text-slate-400 text-xs italic font-semibold">
                        Support small farmers, feed your soul.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-100 bg-slate-50">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-sm">
                    <div className="col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-600 rounded-lg">
                                <Leaf className="text-white" size={18} />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-emerald-950">FarmDirect</span>
                        </div>
                        <p className="text-slate-800 font-bold max-w-xs leading-relaxed">நேரடி நுகர்வோர் டிஜிட்டல் தளம் மூலம் விவசாய சமூகத்தை வலுப்படுத்துகிறோம். விவசாயிகளுக்காக பெருமையுடன் உருவாக்கப்பட்டது.</p>
                        <p className="text-slate-400 italic">"Empowering farmers through direct digital infrastructure."</p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-slate-900">Platform | தளம்</h4>
                        <ul className="text-slate-500 space-y-3 font-medium">
                            <li className="hover:text-emerald-600 cursor-pointer">Farmer Portal</li>
                            <li className="hover:text-emerald-600 cursor-pointer">Consumer App</li>
                            <li className="hover:text-emerald-600 cursor-pointer">Wholesale Inquiries</li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-slate-900">Legal | சட்டம்</h4>
                        <ul className="text-slate-500 space-y-3 font-medium">
                            <li className="hover:text-emerald-600 cursor-pointer">Terms of Service</li>
                            <li className="hover:text-emerald-600 cursor-pointer">Privacy Policy</li>
                            <li className="hover:text-emerald-600 cursor-pointer">Cookie Policy</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto pt-20 border-t border-slate-200 mt-10 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest gap-4">
                    <span>© 2026 FarmDirect Project. விவசாயிகளின் உழைப்பு, உங்கள் வீட்டில்.</span>
                    <div className="flex gap-6">
                        <span className="hover:text-emerald-600 cursor-pointer">Instagram</span>
                        <span className="hover:text-emerald-600 cursor-pointer">Twitter</span>
                        <span className="hover:text-emerald-600 cursor-pointer">Facebook</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
