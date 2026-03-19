import React, { useState, useEffect, useCallback } from 'react';
import { Mic, RefreshCw, Sparkles, Loader2, CheckCircle, TrendingUp, AlertTriangle, Edit3, IndianRupee } from 'lucide-react';
import { useVoiceInput, Language } from '../hooks/useVoiceInput';
import { processAiConversation } from '../utils/aiAssistant';

interface CropData {
    name: string;
    quantityKg: string;
    basePrice: string;
}

interface VoiceQAFlowProps {
    onComplete: (data: CropData) => void;
    language?: Language;
    onLanguageChange?: (language: Language) => void;
}

export default function VoiceQAFlow({ onComplete, language = 'ta-IN', onLanguageChange }: VoiceQAFlowProps) {
    const currentLang = language;
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [aiStatus, setAiStatus] = useState<string>('');
    const [priceReason, setPriceReason] = useState<string | null>(null);
    const [answers, setAnswers] = useState<CropData>({ name: '', quantityKg: '', basePrice: '' });

    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState<CropData>({ name: '', quantityKg: '', basePrice: '' });

    const { isListening, isSpeaking, transcript, error, startListening, stopListening, resetTranscript, speak } = useVoiceInput(currentLang);

    const handleStart = useCallback(async () => {
        setHasStarted(true);
        setShowConfirm(false);
        setAnswers({ name: '', quantityKg: '', basePrice: '' });
        setPriceReason(null);
        resetTranscript();

        const welcomeText = currentLang === 'ta-IN'
            ? 'வணக்கம்ங்க! நா உங்க AI விவசாய உதவியாளரு பேசுறேன். இன்னைக்கு என்னங்க விக்க போறீங்க?'
            : 'Hello! I am your AI farming assistant. What would you like to sell today?';

        setAiStatus(welcomeText);
        speak(welcomeText, () => startListening());
    }, [currentLang, resetTranscript, speak, startListening]);

    const handleAiInteraction = useCallback(async (text: string) => {
        if (!text || text.trim().length < 2) return;

        setIsAiProcessing(true);
        setAiStatus(currentLang === 'ta-IN' ? 'யோசிக்குதுங்க...' : 'Thinking...');

        const response = await processAiConversation(text, answers, currentLang);
        setIsAiProcessing(false);

        const newAnswers: CropData = {
            name: response.extractedData.name || answers.name,
            quantityKg: response.extractedData.quantityKg || answers.quantityKg,
            basePrice: response.extractedData.basePrice || answers.basePrice,
        };
        setAnswers(newAnswers);

        if (response.priceReason) setPriceReason(response.priceReason);

        resetTranscript();
        setAiStatus(response.message);

        speak(response.message, () => {
            if (response.isComplete) {
                setShowConfirm(true);
                setConfirmData(newAnswers);
                stopListening();
            } else {
                startListening();
            }
        });
    }, [answers, currentLang, resetTranscript, speak, startListening, stopListening]);

    useEffect(() => {
        if (!isListening && transcript && !isSpeaking && hasStarted && !isAiProcessing) {
            handleAiInteraction(transcript);
        }
    }, [isListening, transcript, isSpeaking, hasStarted, isAiProcessing, handleAiInteraction]);

    useEffect(() => {
        if (!isListening && !transcript && !isSpeaking && hasStarted && !isAiProcessing && !showConfirm) {
            const retryMsg = currentLang === 'ta-IN'
                ? 'சரியா கேக்கலீங்க... மறுபடியும் தட்டி சொல்லுங்க.'
                : "Didn't catch that. Tap to speak again.";
            setAiStatus((prev) => prev === retryMsg ? prev : retryMsg);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, isSpeaking]);

    const handleManualRestart = useCallback(() => {
        setHasStarted(false);
        setShowConfirm(false);
        setAnswers({ name: '', quantityKg: '', basePrice: '' });
        setPriceReason(null);
        setAiStatus('');
        resetTranscript();
        stopListening();
    }, [resetTranscript, stopListening]);

    useEffect(() => {
        handleManualRestart();
    }, [currentLang, handleManualRestart]);

    const handleConfirmSubmit = () => {
        onComplete(confirmData);
        setShowConfirm(false);
    };

    const handleGoBack = () => {
        setShowConfirm(false);
        setAnswers(confirmData);
        const reaskText = currentLang === 'ta-IN'
            ? 'சரிங்க, என்ன மாத்தணும்னு சொல்லுங்க.'
            : 'OK, tell me what to change.';
        setAiStatus(reaskText);
        speak(reaskText, () => startListening());
    };

    const progress = (answers.name ? 33.3 : 0) + (answers.quantityKg ? 33.3 : 0) + (answers.basePrice ? 33.4 : 0);

    if (showConfirm) {
        return (
            <div className="w-full max-w-xl mx-auto">
                <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-emerald-100 p-8 flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />

                    <div className="text-center space-y-2 pt-2">
                        <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-full mb-2">
                            <CheckCircle className="text-emerald-500" size={36} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">
                            {currentLang === 'ta-IN' ? 'விவரங்களை சரிபார்க்கவும்' : 'Review & Confirm'}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {currentLang === 'ta-IN' ? 'விவரங்கள் சரியா இருந்தா உறுதிப்படுத்துங்க' : 'Review details, edit if needed, then confirm to upload'}
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {currentLang === 'ta-IN' ? 'பயிர் பெயர் (Crop)' : 'Crop Name'}
                                </label>
                                <input
                                    value={confirmData.name}
                                    onChange={(e) => setConfirmData((p) => ({ ...p, name: e.target.value }))}
                                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none capitalize transition-all shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        {currentLang === 'ta-IN' ? 'அளவு (Qty)' : 'Quantity (kg)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={confirmData.quantityKg}
                                        onChange={(e) => setConfirmData((p) => ({ ...p, quantityKg: e.target.value }))}
                                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        {currentLang === 'ta-IN' ? 'விலை (Price)' : 'Price (/kg)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={confirmData.basePrice}
                                        onChange={(e) => setConfirmData((p) => ({ ...p, basePrice: e.target.value }))}
                                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {priceReason && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                <TrendingUp className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">AI Market Insight</p>
                                    <p className="text-sm text-amber-800 leading-snug">{priceReason}</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-emerald-600/80 font-bold uppercase tracking-wider mb-1">
                                    {currentLang === 'ta-IN' ? 'மதிப்பீடு' : 'Total Value'}
                                </p>
                                <p className="text-xs text-emerald-700/60 font-medium flex items-center gap-1">
                                    {confirmData.quantityKg} kg × <IndianRupee size={14} className="text-emerald-600" />{confirmData.basePrice}/kg
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <IndianRupee size={28} className="text-emerald-600" />
                                <p className="text-3xl font-black text-emerald-600">
                                    {((parseFloat(confirmData.quantityKg) || 0) * (parseFloat(confirmData.basePrice) || 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleGoBack}
                            className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all flex justify-center items-center gap-2 shadow-sm focus:ring-2 focus:ring-slate-200 focus:outline-none"
                        >
                            <Edit3 size={18} />
                            {currentLang === 'ta-IN' ? 'மாற்றவும்' : 'Edit Details'}
                        </button>
                        <button
                            onClick={handleConfirmSubmit}
                            disabled={!confirmData.name || !confirmData.quantityKg || !confirmData.basePrice}
                            className="flex-[2] py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/20 flex justify-center items-center gap-2 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
                        >
                            <CheckCircle size={20} />
                            {currentLang === 'ta-IN' ? 'பயிரை சேர்க்கவும்' : 'Confirm & Upload'}
                        </button>
                    </div>

                    <button onClick={handleManualRestart} className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-2">
                        {currentLang === 'ta-IN' ? 'ரத்து செய்ய' : 'Cancel & Reset'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/30 text-gray-900 overflow-hidden shadow-[0_16px_48px_rgba(16,185,129,0.1)] relative">
                <div className="relative z-10 p-6 md:p-8">
                    <section className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-emerald-100">
                            <h3 className="text-lg font-black tracking-tight text-gray-900">{currentLang === 'ta-IN' ? 'குரல் தொடர்பு' : 'Voice Interaction'}</h3>
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black">
                                <div className="flex items-center gap-1 bg-white border-2 border-emerald-200 rounded-lg p-1">
                                    <button
                                        onClick={() => onLanguageChange?.('en-IN')}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${
                                            currentLang === 'en-IN'
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                : 'bg-white text-gray-600 border border-transparent hover:border-emerald-200'
                                        }`}
                                    >
                                        EN
                                    </button>
                                    <span className="text-gray-300 text-[10px]">/</span>
                                    <button
                                        onClick={() => onLanguageChange?.('ta-IN')}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${
                                            currentLang === 'ta-IN'
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                : 'bg-white text-gray-600 border border-transparent hover:border-emerald-200'
                                        }`}
                                    >
                                        தமிழ்
                                    </button>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5 transition-all ${isListening ? 'border-emerald-500 text-emerald-600 bg-emerald-100' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                                    {isListening ? <Mic size={14} className="animate-pulse" /> : <AlertTriangle size={14} />}
                                    {isListening ? (currentLang === 'ta-IN' ? 'கேட்கிறேன்' : 'Listening') : (currentLang === 'ta-IN' ? 'நிறுத்தம்' : 'Idle')}
                                </span>
                                <span className={`px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5 transition-all ${isSpeaking ? 'border-emerald-500 text-emerald-600 bg-emerald-100' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                                    {isSpeaking ? <Sparkles size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                                    {isSpeaking ? (currentLang === 'ta-IN' ? 'பதில்' : 'Speaking') : (currentLang === 'ta-IN' ? 'மௌனம்' : 'Silent')}
                                </span>
                            </div>
                        </div>

                        {!hasStarted ? (
                            <div className="space-y-4 pt-2">
                                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-sm text-gray-700 leading-relaxed flex items-start gap-3">
                                    <Sparkles size={18} className="text-emerald-600 mt-1 shrink-0" />
                                    <span className="font-medium">
                                        {currentLang === 'ta-IN'
                                            ? 'தொடங்கு பொத்தை தட்டுங்க. பிறகு பயிர் பெயர், அளவு, விலை சொன்னா போதும்.'
                                            : 'Tap Start button, then say crop name, quantity, and price one after another.'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleStart}
                                    className="w-full h-16 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-2.5 shadow-md"
                                >
                                    <Mic size={20} />
                                    {currentLang === 'ta-IN' ? 'தொடங்கு' : 'Start Session'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={() => !isSpeaking && !isListening && !isAiProcessing && startListening()}
                                    className={`w-full h-28 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-black tracking-wide ${
                                        isListening
                                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/30'
                                            : isSpeaking
                                                ? 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-md'
                                                : isAiProcessing
                                                    ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-md'
                                                    : 'bg-white border-emerald-200 text-gray-900 hover:bg-emerald-50 hover:shadow-md active:scale-95'
                                    }`}
                                >
                                    {isAiProcessing ? <Loader2 size={26} className="animate-spin text-amber-600" /> : <Mic size={26} className={isListening ? 'text-emerald-600 animate-pulse' : ''} />}
                                    <div className="text-left">
                                        <div className="text-sm">
                                            {isListening
                                                ? (currentLang === 'ta-IN' ? 'குரல் கேட்கிறது...' : 'Listening...')
                                                : isSpeaking
                                                    ? (currentLang === 'ta-IN' ? 'AI பேசுகிறது...' : 'AI speaking...')
                                                    : isAiProcessing
                                                        ? (currentLang === 'ta-IN' ? 'செயலாக்கம்...' : 'Processing...')
                                                        : (currentLang === 'ta-IN' ? 'மீண்டும் பேச தட்டவும்' : 'Tap to speak')}
                                        </div>
                                    </div>
                                </button>

                                {error ? (
                                    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <AlertTriangle size={18} className="shrink-0" />
                                            <span className="font-semibold">{error}</span>
                                        </div>
                                        <button onClick={() => startListening()} className="text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">Retry</button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 min-h-[140px] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-emerald-600" />
                                            <p className="text-xs uppercase tracking-widest text-emerald-600 font-black">AI Response</p>
                                        </div>
                                        <p className="text-sm leading-relaxed text-gray-800 font-medium">
                                            {aiStatus || (currentLang === 'ta-IN' ? 'குரல் துவங்க தயார்.' : 'Ready for voice input.')}
                                        </p>
                                        {isListening && transcript && (
                                            <p className="text-sm text-emerald-700 border-l-4 border-emerald-500 pl-4 italic">"{transcript}"</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-100">
                            <button onClick={handleManualRestart} className="px-5 py-2.5 rounded-lg border-2 border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all hover:border-emerald-300 hover:shadow-md">
                                <RefreshCw size={15} />
                                {currentLang === 'ta-IN' ? 'ரீசெட்' : 'Reset'}
                            </button>
                            {isListening && (
                                <button onClick={stopListening} className="px-5 py-2.5 rounded-lg border-2 border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider transition-all hover:shadow-md active:scale-95">
                                    {currentLang === 'ta-IN' ? 'கேட்குவது நிறுத்து' : 'Stop Listening'}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function LightDataCard({ label, value, placeholder = '', showIcon = false }: { label: string, value: string, placeholder?: string, showIcon?: boolean }) {
    const hasValue = Boolean(value);

    return (
        <div className={`rounded-xl border-2 px-4 py-3.5 transition-all ${hasValue ? 'border-emerald-200 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-1.5">
                {hasValue ? <CheckCircle size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-gray-400" />}
                <p className={`text-[10px] uppercase tracking-wider font-bold ${hasValue ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {label}
                </p>
            </div>
            <div className="flex items-center gap-1">
                {showIcon && hasValue && <IndianRupee size={14} className="text-emerald-700" />}
                <p className={`text-base font-black truncate ${hasValue ? 'text-emerald-700' : 'text-gray-400'}`}>{hasValue ? value : placeholder}</p>
            </div>
        </div>
    );
}
