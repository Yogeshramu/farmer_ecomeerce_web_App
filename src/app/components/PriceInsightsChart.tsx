'use client';

import React, { useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
    TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw, AlertCircle,
    LineChart as LineChartIcon, BarChart2, Store, Lightbulb, CheckCircle,
    Leaf, Search
} from 'lucide-react';

interface PriceData {
    currentPrice: number;
    minPrice: number;
    maxPrice: number;
    trend: 'rising' | 'falling' | 'stable';
    trendPercent: number;
    recommendation: string;
    recommendationTamil: string;
    monthlyPrices: { month: string; price: number; marketAvg: number }[];
    weeklyPrices: { day: string; wholesale: number; retail: number }[];
    marketComparison: { market: string; price: number }[];
    bestTimeToSell: string;
    bestMarket: string;
}

interface Props {
    crops: { id: string; name: string; basePrice: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm border border-slate-700">
                <p className="font-bold text-slate-300 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color }} className="font-semibold">
                        {p.name}: ₹{p.value}/கிலோ
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const TipBox = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2 mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
        <Lightbulb size={14} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-emerald-700 font-medium">{children}</p>
    </div>
);

export default function PriceInsightsChart({ crops }: Props) {
    const [selectedCrop, setSelectedCrop] = useState(crops[0]?.name || '');
    const [customCrop, setCustomCrop] = useState('');
    const [priceData, setPriceData] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeChart, setActiveChart] = useState<'monthly' | 'weekly' | 'market'>('monthly');

    const fetchInsights = async (cropName: string) => {
        if (!cropName.trim()) return;
        setLoading(true);
        setError('');
        setPriceData(null);
        try {
            const res = await fetch('/api/price-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cropName })
            });
            const json = await res.json();
            if (json.success) {
                setPriceData(json.data);
            } else {
                setError('விலை தகவல் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.');
            }
        } catch {
            setError('இணைப்பு தோல்வி. உங்கள் நெட்வொர்க்கை சரிபார்க்கவும்.');
        }
        setLoading(false);
    };

    const TrendIcon = priceData?.trend === 'rising' ? TrendingUp
        : priceData?.trend === 'falling' ? TrendingDown : Minus;

    const trendColor = priceData?.trend === 'rising' ? 'text-emerald-600'
        : priceData?.trend === 'falling' ? 'text-red-500' : 'text-amber-500';

    const trendBg = priceData?.trend === 'rising' ? 'bg-emerald-50 border-emerald-200'
        : priceData?.trend === 'falling' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';

    const trendLabel = priceData?.trend === 'rising' ? 'விலை உயர்கிறது'
        : priceData?.trend === 'falling' ? 'விலை குறைகிறது' : 'நிலையான விலை';

    const tabs = [
        { key: 'monthly' as const, tamil: '6 மாத போக்கு', english: '6-Month Trend', icon: LineChartIcon },
        { key: 'weekly' as const, tamil: 'வாரம் விலை', english: 'Weekly Prices', icon: BarChart2 },
        { key: 'market' as const, tamil: 'சந்தை ஒப்பீடு', english: 'Market Compare', icon: Store },
    ];

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-violet-100 p-2 rounded-xl">
                    <Sparkles className="text-violet-600" size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">AI விலை நுண்ணறிவு</h2>
                    <p className="text-xs text-slate-400">Price Intelligence • Groq AI மூலம் இயக்கப்படுகிறது</p>
                </div>
            </div>

            {/* Crop Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-0.5">பகுப்பாய்வு செய்ய பயிர் தேர்வு செய்யுங்கள்</p>
                    <p className="text-[11px] text-slate-400">Select Crop to Analyze</p>
                </div>

                {crops.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {crops.map(crop => (
                            <button
                                key={crop.id}
                                onClick={() => { setSelectedCrop(crop.name); setCustomCrop(''); }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-1.5 ${
                                    selectedCrop === crop.name && !customCrop
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                                }`}
                            >
                                <Leaf size={13} className={selectedCrop === crop.name && !customCrop ? 'text-emerald-200' : 'text-emerald-500'} />
                                {crop.name}
                                <span className="text-[10px] opacity-70 font-normal">₹{crop.basePrice}/கிலோ</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium">அல்லது வேறு பயிர் பெயர் தட்டச்சு செய்யுங்கள் / Or type any other crop</p>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="எ.கா: வெங்காயம், கத்திரிக்காய், உருளைக்கிழங்கு..."
                            value={customCrop}
                            onChange={e => { setCustomCrop(e.target.value); setSelectedCrop(e.target.value); }}
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                        />
                    </div>
                </div>

                <button
                    onClick={() => fetchInsights(selectedCrop)}
                    disabled={loading || !selectedCrop}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Groq AI பகுப்பாய்வு செய்கிறது... <span className="font-normal opacity-80">Analyzing...</span></span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            <span>
                                {selectedCrop ? `"${selectedCrop}" விலை நுண்ணறிவு பெறுக` : 'பயிர் தேர்வு செய்யுங்கள்'}
                                {selectedCrop && <span className="ml-1 font-normal opacity-80 text-xs">/ Get Price Insights</span>}
                            </span>
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                    <AlertCircle size={18} className="shrink-0" />
                    <div>
                        <p className="text-sm font-bold">{error}</p>
                        <p className="text-xs opacity-70 mt-0.5">Something went wrong. Please try again.</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                        <div className="flex justify-center mb-3">
                            <RefreshCw size={28} className="animate-spin text-emerald-500" />
                        </div>
                        <p className="text-emerald-700 font-bold">Groq AI சந்தை தரவு ஆய்வு செய்கிறது...</p>
                        <p className="text-emerald-500 text-sm mt-1">Fetching Tamil Nadu mandi prices</p>
                    </div>
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                            <div className="h-40 bg-slate-50 rounded-xl" />
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {priceData && !loading && (
                <div className="space-y-5">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">தற்போதைய விலை</p>
                            <p className="text-[9px] text-slate-400 mb-1">Current Price</p>
                            <p className="text-2xl font-black text-emerald-600">₹{priceData.currentPrice}</p>
                            <p className="text-[10px] text-slate-400">ஒரு கிலோ / per kg</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">குறைந்த விலை</p>
                            <p className="text-[9px] text-slate-400 mb-1">Min Price</p>
                            <p className="text-2xl font-black text-slate-700">₹{priceData.minPrice}</p>
                            <p className="text-[10px] text-slate-400">சீசன் குறைந்தது</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">அதிக விலை</p>
                            <p className="text-[9px] text-slate-400 mb-1">Max Price</p>
                            <p className="text-2xl font-black text-slate-700">₹{priceData.maxPrice}</p>
                            <p className="text-[10px] text-slate-400">சீசன் அதிகம்</p>
                        </div>
                        <div className={`rounded-2xl border shadow-sm p-4 ${trendBg}`}>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">போக்கு / Trend</p>
                            <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
                                <TrendIcon size={22} />
                                <p className="text-xl font-black">{priceData.trendPercent}%</p>
                            </div>
                            <p className={`text-[10px] font-bold mt-1.5 ${trendColor}`}>{trendLabel}</p>
                        </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={15} className="text-emerald-200" />
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">AI பரிந்துரை / AI Recommendation</p>
                        </div>
                        <p className="font-bold text-xl leading-snug">{priceData.recommendationTamil}</p>
                        <p className="text-emerald-100 text-sm mt-2 leading-relaxed">{priceData.recommendation}</p>

                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-500/50">
                            <div className="flex items-start gap-2">
                                <TrendingUp size={16} className="text-emerald-300 mt-0.5" />
                                <div>
                                    <p className="text-emerald-200 text-[10px] uppercase font-bold tracking-wider">விற்க சிறந்த நேரம்</p>
                                    <p className="text-[10px] text-emerald-300 mb-1">Best Time to Sell</p>
                                    <p className="font-bold text-sm">{priceData.bestTimeToSell}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Store size={16} className="text-emerald-300 mt-0.5" />
                                <div>
                                    <p className="text-emerald-200 text-[10px] uppercase font-bold tracking-wider">சிறந்த சந்தை</p>
                                    <p className="text-[10px] text-emerald-300 mb-1">Best Market</p>
                                    <p className="font-bold text-sm">{priceData.bestMarket}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Tabs */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-100">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveChart(tab.key)}
                                        className={`flex-1 py-3 px-1 text-center transition-all flex flex-col items-center gap-1 ${
                                            activeChart === tab.key
                                                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                                                : 'text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        <p className="text-[11px] font-bold">{tab.tamil}</p>
                                        <p className="text-[9px] opacity-60">{tab.english}</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-5">
                            {/* Monthly Trend */}
                            {activeChart === 'monthly' && (
                                <div>
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-slate-800">உங்கள் பயிர் விலை vs சந்தை சராசரி</p>
                                        <p className="text-xs text-slate-400">Your Crop Price vs Market Average (₹/kg) — Last 6 Months</p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <AreaChart data={priceData.monthlyPrices} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${v}`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend formatter={(val) => val === 'price' ? 'உங்கள் பயிர் (Your Crop)' : 'சந்தை சராசரி (Market Avg)'} />
                                            <Area type="monotone" dataKey="price" name="price" stroke="#059669" strokeWidth={2.5} fill="url(#priceGrad)" dot={{ fill: '#059669', r: 4 }} />
                                            <Area type="monotone" dataKey="marketAvg" name="marketAvg" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" fill="url(#avgGrad)" dot={{ fill: '#06b6d4', r: 3 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    <TipBox>சந்தை சராசரியை விட அதிகமாக இருந்தால் விற்க சிறந்த நேரம் — Sell when above market average for best profit</TipBox>
                                </div>
                            )}

                            {/* Weekly Prices */}
                            {activeChart === 'weekly' && (
                                <div>
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-slate-800">மொத்த விலை vs சில்லறை விலை (இந்த வாரம்)</p>
                                        <p className="text-xs text-slate-400">Wholesale vs Retail Price This Week (₹/kg)</p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={priceData.weeklyPrices} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${v}`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend formatter={(val) => val === 'wholesale' ? 'மொத்த விலை (Wholesale)' : 'சில்லறை விலை (Retail)'} />
                                            <Bar dataKey="wholesale" name="wholesale" fill="#059669" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="retail" name="retail" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <TipBox>FarmDirect மூலம் விற்றால் சில்லறை விலை கிடைக்கும் — Direct selling gets you retail price, not wholesale</TipBox>
                                </div>
                            )}

                            {/* Market Comparison */}
                            {activeChart === 'market' && (
                                <div>
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-slate-800">தமிழ்நாடு சந்தைகளில் விலை ஒப்பீடு</p>
                                        <p className="text-xs text-slate-400">Price Across Tamil Nadu Markets (₹/kg)</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ResponsiveContainer width="100%" height={240}>
                                            <RadarChart data={priceData.marketComparison}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="market" tick={{ fontSize: 11, fill: '#64748b' }} />
                                                <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `₹${v}`} />
                                                <Radar name="விலை" dataKey="price" stroke="#059669" fill="#059669" fillOpacity={0.2} strokeWidth={2} />
                                                <Tooltip content={<CustomTooltip />} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                அதிக விலை — Highest to Lowest
                                            </p>
                                            {[...priceData.marketComparison].sort((a, b) => b.price - a.price).map((m, i) => (
                                                <div key={m.market} className={`flex items-center justify-between p-3 rounded-xl border ${m.market === priceData.bestMarket ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-400 w-5">#{i + 1}</span>
                                                        <span className="font-bold text-slate-700 text-sm">{m.market}</span>
                                                        {m.market === priceData.bestMarket && (
                                                            <span className="flex items-center gap-0.5 text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                                                <CheckCircle size={9} /> சிறந்தது
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-black text-emerald-700">₹{m.price}/கிலோ</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <TipBox>{priceData.bestMarket} சந்தையில் விற்றால் அதிக லாபம் — Best profit at {priceData.bestMarket} market</TipBox>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchInsights(selectedCrop)}
                        className="w-full py-3 border border-emerald-200 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} />
                        <span>மீண்டும் புதுப்பிக்கவும் <span className="font-normal text-emerald-500">/ Refresh Price Data</span></span>
                    </button>
                </div>
            )}
        </div>
    );
}
