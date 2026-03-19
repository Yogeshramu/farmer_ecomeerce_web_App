import React, { useState, useEffect, useCallback } from 'react';
import { Mic, RefreshCw, Volume2, Sparkles, Loader2, CheckCircle, TrendingUp, AlertTriangle, Edit3 } from 'lucide-react';
import { useVoiceInput, Language } from '../hooks/useVoiceInput';
import { processAiConversation } from '../utils/aiAssistant';

interface CropData {
    name: string;
    quantityKg: string;
    basePrice: string;
}

interface VoiceQAFlowProps {
    onComplete: (data: CropData) => void;
}

export default function VoiceQAFlow({ onComplete }: VoiceQAFlowProps) {
    const [currentLang, setCurrentLang] = useState<Language>('ta-IN');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [aiStatus, setAiStatus] = useState<string>('');
    const [priceReason, setPriceReason] = useState<string | null>(null);
    const [answers, setAnswers] = useState<CropData>({ name: '', quantityKg: '', basePrice: '' });

    // ✅ NEW: Confirmation modal state
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState<CropData>({ name: '', quantityKg: '', basePrice: '' });

    const { isListening, isSpeaking, transcript, error, startListening, stopListening, resetTranscript, speak } = useVoiceInput(currentLang);

    // Initial greeting
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

    // Main AI interaction
    const handleAiInteraction = useCallback(async (text: string) => {
        if (!text || text.trim().length < 2) return;

        setIsAiProcessing(true);
        setAiStatus(currentLang === 'ta-IN' ? 'யோசிக்குதுங்க...' : 'Thinking...');

        const response = await processAiConversation(text, answers, currentLang);
        setIsAiProcessing(false);

        // Update answers with extracted data
        const newAnswers: CropData = {
            name: response.extractedData.name || answers.name,
            quantityKg: response.extractedData.quantityKg || answers.quantityKg,
            basePrice: response.extractedData.basePrice || answers.basePrice,
        };
        setAnswers(newAnswers);

        // Save price reason if AI provided one
        if (response.priceReason) setPriceReason(response.priceReason);

        resetTranscript();
        setAiStatus(response.message);

        speak(response.message, () => {
            if (response.isComplete) {
                // ✅ Show confirmation dialog instead of immediately submitting
                setShowConfirm(true);
                setConfirmData(newAnswers);
                stopListening();
            } else {
                startListening();
            }
        });
    }, [answers, currentLang, resetTranscript, speak, startListening, stopListening]);

    // Trigger AI when user stops speaking
    useEffect(() => {
        if (!isListening && transcript && !isSpeaking && hasStarted && !isAiProcessing) {
            handleAiInteraction(transcript);
        }
    }, [isListening, transcript, isSpeaking, hasStarted, isAiProcessing, handleAiInteraction]);

    // Gentle retry prompt when no speech detected
    useEffect(() => {
        if (!isListening && !transcript && !isSpeaking && hasStarted && !isAiProcessing && !showConfirm) {
            const retryMsg = currentLang === 'ta-IN'
                ? 'சரியா கேக்கலீங்க... மறுபடியும் தட்டி சொல்லுங்க.'
                : "Didn't catch that. Tap to speak again.";
            setAiStatus(prev => prev === retryMsg ? prev : retryMsg);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, isSpeaking]);

    const handleManualRestart = () => {
        setHasStarted(false);
        setShowConfirm(false);
        setAnswers({ name: '', quantityKg: '', basePrice: '' });
        setPriceReason(null);
        setAiStatus('');
        resetTranscript();
        stopListening();
    };

    const toggleLanguage = () => {
        setCurrentLang(currentLang === 'ta-IN' ? 'en-IN' : 'ta-IN');
        handleManualRestart();
    };

    // ✅ Farmer confirms and submits
    const handleConfirmSubmit = () => {
        onComplete(confirmData);
        setShowConfirm(false);
    };

    // ✅ Farmer edits and re-speaks
    const handleGoBack = () => {
        setShowConfirm(false);
        setAnswers(confirmData); // keep edited values
        const reaskText = currentLang === 'ta-IN'
            ? 'சரிங்க, என்ன மாத்தணும்னு சொல்லுங்க.'
            : 'OK, tell me what to change.';
        setAiStatus(reaskText);
        speak(reaskText, () => startListening());
    };

    const progress = (answers.name ? 33.3 : 0) + (answers.quantityKg ? 33.3 : 0) + (answers.basePrice ? 33.4 : 0);

    // ========== CONFIRMATION MODAL (BRIGHT GREEN & WHITE) ==========
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
                            {currentLang === 'ta-IN' ? 'எல்லாம் சரியா இருந்தா சேர்க்கலாம்' : 'Edit details below, then hit confirm to add'}
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
                                    onChange={e => setConfirmData(p => ({ ...p, name: e.target.value }))}
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
                                        onChange={e => setConfirmData(p => ({ ...p, quantityKg: e.target.value }))}
                                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        {currentLang === 'ta-IN' ? 'விலை (Price)' : 'Price (₹/kg)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={confirmData.basePrice}
                                        onChange={e => setConfirmData(p => ({ ...p, basePrice: e.target.value }))}
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
                                <p className="text-xs text-emerald-700/60 font-medium">
                                    {confirmData.quantityKg} kg × ₹{confirmData.basePrice}/kg
                                </p>
                            </div>
                            <p className="text-3xl font-black text-emerald-600">
                                ₹{((parseFloat(confirmData.quantityKg) || 0) * (parseFloat(confirmData.basePrice) || 0)).toLocaleString()}
                            </p>
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

    // ========== VOICE INTERACTION UI (BRIGHT & FRESH) ==========
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-emerald-50 flex flex-col items-center min-h-[550px] relative overflow-hidden">
                
                {/* Immersive background glow (Soft Emerald) */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-[3000ms] pointer-events-none z-0
                    ${isListening ? 'bg-rose-100 scale-125 opacity-70' : 
                      isSpeaking ? 'bg-indigo-100 scale-150 opacity-70' : 
                      isAiProcessing ? 'bg-emerald-100 scale-110 opacity-70' : 'bg-emerald-50/50'}`} 
                />

                {/* Header */}
                <div className="w-full flex justify-between items-center z-10 p-6 pb-2">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <Sparkles size={16} className={isAiProcessing ? "animate-spin text-emerald-500" : "text-emerald-500"} />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">FarmDirect AI</span>
                    </div>
                    <button 
                        onClick={toggleLanguage} 
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                    >
                        {currentLang === 'ta-IN' ? 'EN / தமிழ்' : 'TA / English'}
                    </button>
                </div>

                {/* Visualizer Area */}
                <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 px-6 py-4">
                    {!hasStarted ? (
                        <div className="flex flex-col items-center gap-8 w-full animate-in fade-in zoom-in-95 duration-500">
                            <button 
                                onClick={handleStart} 
                                className="group relative w-36 h-36 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                            >
                                <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
                                <div className="absolute inset-0 bg-emerald-50 rounded-full border-4 border-emerald-100 scale-110" />
                                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white border-2 border-white shadow-xl">
                                    <Mic size={52} strokeWidth={2.5} className="drop-shadow-md" />
                                </div>
                            </button>
                            
                            <div className="text-center space-y-5">
                                <div>
                                    <h2 className="text-slate-800 text-3xl font-black mb-2 tracking-tight">
                                        {currentLang === 'ta-IN' ? 'AI குரல் உதவியாளர்' : 'AI Voice Assistant'}
                                    </h2>
                                    <p className="text-slate-500 text-base font-medium">
                                        {currentLang === 'ta-IN' ? 'பேசத் தொடங்க மைக் பட்டனை அழுத்தவும்' : 'Tap the mic to start speaking'}
                                    </p>
                                </div>
                                <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-100/80 p-5 rounded-2xl max-w-sm mx-auto shadow-sm">
                                    <p className="text-emerald-700 text-sm font-semibold leading-relaxed">
                                        {currentLang === 'ta-IN' 
                                            ? '"பயிர் பெயர், அளவு, விலை கூறுங்கள். நான் பார்த்துக்கொள்கிறேன்!"'
                                            : '"Just say your crop name, quantity, and price. I will do the rest!"'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div 
                                className="relative cursor-pointer group flex items-center justify-center mt-2 w-48 h-48"
                                onClick={() => !isSpeaking && !isListening && !isAiProcessing && startListening()}
                            >
                                {/* Audio wave simulation rings - Lighter colors for white theme */}
                                {isSpeaking && (
                                    <>
                                        <div className="absolute inset-4 border-[3px] border-indigo-200 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                        <div className="absolute inset-4 border-[3px] border-indigo-100 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                                    </>
                                )}
                                {isListening && (
                                    <div className="absolute inset-4 border-[3px] border-rose-200 rounded-full animate-[ping_1.5s_ease-out_infinite]" />
                                )}
                                {isAiProcessing && (
                                    <div className="absolute inset-2 border-[4px] border-emerald-100 border-t-emerald-400 rounded-full animate-spin" />
                                )}

                                {/* Main Orb */}
                                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 overflow-hidden
                                    ${isListening ? 'bg-gradient-to-br from-rose-400 to-red-500 shadow-[0_10px_40px_rgba(225,29,72,0.3)] scale-110 border-4 border-white' :
                                      isSpeaking ? 'bg-gradient-to-tr from-indigo-400 to-violet-500 shadow-[0_10px_40px_rgba(79,70,229,0.3)] scale-105 border-4 border-white' :
                                      isAiProcessing ? 'bg-gradient-to-bl from-emerald-400 to-teal-500 shadow-[0_10px_40px_rgba(16,185,129,0.3)]' :
                                      'bg-white border-[6px] border-emerald-50 shadow-xl hover:shadow-2xl hover:border-emerald-100 hover:scale-105 group-hover:bg-emerald-50 transition-all'}`}
                                >
                                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                                        {isAiProcessing ? (
                                            <Sparkles size={40} className="text-white animate-pulse" />
                                        ) : isSpeaking ? (
                                            <div className="flex gap-1.5 items-center justify-center h-12 w-16">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="w-1.5 bg-white rounded-full animate-[pulse_1s_ease-in-out_infinite]"
                                                        style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                                                ))}
                                            </div>
                                        ) : isListening ? (
                                            <div className="relative flex items-center justify-center">
                                                <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse" />
                                                <Mic size={44} className="text-white drop-shadow-sm" />
                                            </div>
                                        ) : (
                                            <Mic size={44} className="text-emerald-400 group-hover:text-emerald-500 transition-colors" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full text-center space-y-3 h-[100px] flex flex-col justify-center max-w-sm">
                                {error ? (
                                    <div className="bg-rose-50 border border-rose-200 py-3 px-5 rounded-2xl inline-flex items-center gap-2 text-rose-600 mx-auto shadow-sm">
                                        <AlertTriangle size={16} />
                                        <span className="text-sm font-bold">{error}</span>
                                        <button onClick={() => startListening()} className="text-rose-500 ml-3 font-black text-xs uppercase hover:underline">Retry</button>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in duration-300">
                                        <p className={`text-xl font-bold transition-colors ${isSpeaking ? 'text-indigo-600' : isListening ? 'text-rose-600' : isAiProcessing ? 'text-emerald-600' : 'text-slate-600'} italic`}>
                                            {aiStatus || (isListening ? (transcript || '...') : (currentLang === 'ta-IN' ? 'பேசத் தட்டவும்...' : 'Tap to speak...'))}
                                        </p>
                                        {isListening && transcript && (
                                            <div className="mt-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl inline-block border border-slate-100 shadow-sm">
                                                <p className="text-slate-600 text-sm font-medium">"{transcript}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dashboard Dock - Light Theme Edition */}
                <div className={`w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 p-5 rounded-b-[2rem] z-10 transition-all duration-700 transform relative ${hasStarted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                    
                    {/* Shadow overlay separating top and bottom */}
                    <div className="absolute top-[-20px] left-0 right-0 h-5 bg-gradient-to-b from-transparent to-slate-900/[0.02]" />

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {currentLang === 'ta-IN' ? 'தற்போதைய தரவு' : 'Live Data Extraction'}
                        </span>
                        {progress > 0 && (
                            <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-full">
                                <span className="text-[10px] font-bold text-emerald-600">{Math.round(progress)}% Extracted</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <LightDataCard 
                            label={currentLang === 'ta-IN' ? 'பயிர் / Crop' : 'Crop'} 
                            value={answers.name} 
                            placeholder="---"
                        />
                        <LightDataCard 
                            label={currentLang === 'ta-IN' ? 'அளவு (kg)' : 'Qty (kg)'} 
                            value={answers.quantityKg} 
                            placeholder="---"
                        />
                        <LightDataCard 
                            label={currentLang === 'ta-IN' ? 'விலை (₹)' : 'Price'} 
                            value={answers.basePrice} 
                            prefix="₹" 
                            placeholder="---"
                        />
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-1">
                        <button onClick={handleManualRestart} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-100 group">
                            <RefreshCw size={14} className="group-hover:-rotate-90 transition-transform duration-300" />
                            {currentLang === 'ta-IN' ? 'ரீசெட்' : 'Reset'}
                        </button>

                        {isListening && (
                            <button onClick={stopListening} className="bg-rose-50 text-rose-500 hover:bg-rose-100 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 border border-rose-100 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                Stop Listening
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function LightDataCard({ label, value, prefix = '', placeholder = '' }: { label: string, value: string, prefix?: string, placeholder?: string }) {
    return (
        <div className={`px-4 py-3 rounded-2xl border transition-all duration-300 flex flex-col justify-center items-center text-center ${value ? 'bg-emerald-50/50 border-emerald-100 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)]' : 'bg-slate-50 border-transparent border-slate-100'}`}>
            <span className={`text-[9px] uppercase tracking-wider font-bold mb-1.5 block truncate ${value ? 'text-emerald-500' : 'text-slate-400'}`}>
                {label}
            </span>
            <span className={`text-xl font-black truncate w-full ${value ? 'text-slate-700' : 'text-slate-300'}`}>
                {value ? `${prefix}${value}` : placeholder}
            </span>
        </div>
    );
}
