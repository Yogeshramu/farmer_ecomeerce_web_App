
import React, { useState, useEffect, useCallback } from 'react';
import { Mic, RefreshCw, Volume2, Sparkles, Loader2 } from 'lucide-react';
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
    const [answers, setAnswers] = useState<CropData>({
        name: '',
        quantityKg: '',
        basePrice: ''
    });

    const {
        isListening,
        isSpeaking,
        transcript,
        error,
        startListening,
        stopListening,
        resetTranscript,
        speak
    } = useVoiceInput(currentLang);

    // Initial greeting
    const handleStart = useCallback(async () => {
        setHasStarted(true);
        setAnswers({ name: '', quantityKg: '', basePrice: '' });
        resetTranscript();

        const welcomeText = currentLang === 'ta-IN'
            ? 'வணக்கம்! நான் உங்கள் AI விவசாய உதவியாளர். நீங்கள் எதை விற்க விரும்புகிறீர்கள்?'
            : 'Hello! I am your AI farming assistant. What would you like to sell today?';

        setAiStatus(welcomeText);
        speak(welcomeText, () => startListening());
    }, [currentLang, resetTranscript, speak, startListening]);

    // Main logic: Process user input with AI
    const handleAiInteraction = useCallback(async (text: string) => {
        if (!text || text.trim().length < 2) return;

        setIsAiProcessing(true);
        setAiStatus(currentLang === 'ta-IN' ? 'யோசிக்கிறேன்...' : 'Thinking...');

        const response = await processAiConversation(text, answers, currentLang);
        setIsAiProcessing(false);

        // Update answers with what AI extracted
        if (response.extractedData) {
            setAnswers(prev => ({
                name: response.extractedData.name || prev.name,
                quantityKg: response.extractedData.quantityKg || prev.quantityKg,
                basePrice: response.extractedData.basePrice || prev.basePrice
            }));
        }

        resetTranscript();
        setAiStatus(response.message);

        // Speak the AI's response
        speak(response.message, () => {
            if (response.isComplete) {
                // Finalize if AI says we have everything
                const finalData = {
                    name: response.extractedData.name || answers.name,
                    quantityKg: response.extractedData.quantityKg || answers.quantityKg,
                    basePrice: response.extractedData.basePrice || answers.basePrice
                };
                setTimeout(() => onComplete(finalData as CropData), 1000);
            } else {
                // Otherwise keep listening
                startListening();
            }
        });
    }, [answers, currentLang, onComplete, resetTranscript, speak, startListening]);

    // Effect to trigger AI when user stops speaking
    useEffect(() => {
        if (!isListening && transcript && !isSpeaking && hasStarted && !isAiProcessing) {
            handleAiInteraction(transcript);
        }
    }, [isListening, transcript, isSpeaking, hasStarted, isAiProcessing, handleAiInteraction]);

    const handleManualRestart = () => {
        setHasStarted(false);
        setAnswers({ name: '', quantityKg: '', basePrice: '' });
        setAiStatus('');
        resetTranscript();
        stopListening();
    };

    const toggleLanguage = () => {
        const newLang = currentLang === 'ta-IN' ? 'en-IN' : 'ta-IN';
        setCurrentLang(newLang);
        handleManualRestart();
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 flex flex-col items-center gap-8 min-h-[500px] relative overflow-hidden">

                {/* Visual Progress Bar */}
                <div className="absolute top-0 inset-x-0 h-2 flex">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(answers.name ? 33.3 : 0) + (answers.quantityKg ? 33.3 : 0) + (answers.basePrice ? 33.4 : 0)}%` }}></div>
                </div>

                {/* Header */}
                <div className="text-center space-y-2 z-10 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-emerald-500" size={16} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">FarmDirect AI</span>
                        </div>
                        <button onClick={toggleLanguage} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors">
                            {currentLang === 'ta-IN' ? 'English' : 'தமிழ்'}
                        </button>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        {isSpeaking ? (currentLang === 'ta-IN' ? 'AI பேசுகிறது...' : 'AI Speaking...') :
                            isListening ? (currentLang === 'ta-IN' ? 'கேட்டுக்கொண்டிருக்கிறேன்...' : 'Listening...') :
                                isAiProcessing ? (currentLang === 'ta-IN' ? 'யோசிக்கிறேன்...' : 'Thinking...') :
                                    (currentLang === 'ta-IN' ? 'AI உதவியாளர்' : 'AI Assistant')}
                    </h2>
                </div>

                {/* Main Interaction Area */}
                <div className="relative flex-1 flex flex-col items-center justify-center w-full gap-8">
                    {!hasStarted ? (
                        <button
                            onClick={handleStart}
                            className="group relative flex flex-col items-center gap-4 transition-all hover:scale-105 active:scale-95"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                <div className="relative w-32 h-32 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                                    <Volume2 size={48} className="animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-800">
                                    {currentLang === 'ta-IN' ? 'AI-உடன் பேசுங்கள்' : 'Talk to AI'}
                                </p>
                                <p className="text-sm text-slate-400">
                                    {currentLang === 'ta-IN' ? 'விற்பனை செய்ய தட்டவும்' : 'Tap to start selling'}
                                </p>
                            </div>
                        </button>
                    ) : (
                        <>
                            <div
                                className="relative cursor-pointer group"
                                onClick={() => !isSpeaking && !isListening && !isAiProcessing && startListening()}
                            >
                                <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 transition-all duration-700
                                    ${isListening ? 'bg-red-500 animate-pulse scale-150' :
                                        isSpeaking ? 'bg-blue-500 animate-pulse scale-125' :
                                            isAiProcessing ? 'bg-emerald-500 animate-spin scale-110' :
                                                'bg-emerald-500 opacity-10 group-hover:opacity-20'}
                                `}></div>

                                <div className={`relative w-44 h-44 rounded-full flex items-center justify-center bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 transition-all duration-500
                                    ${isListening ? 'border-red-100 scale-105' :
                                        isSpeaking ? 'border-blue-100' :
                                            isAiProcessing ? 'border-emerald-100' :
                                                'border-emerald-50/50 hover:border-emerald-100'}
                                `}>
                                    {isAiProcessing ? (
                                        <Loader2 size={56} className="text-emerald-500 animate-spin" />
                                    ) : isSpeaking ? (
                                        <div className="flex gap-1 items-end h-12">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="w-1.5 bg-blue-500 rounded-full animate-bounce"
                                                    style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>
                                    ) : isListening ? (
                                        <Mic size={56} className="text-red-500 animate-pulse" />
                                    ) : (
                                        <Mic size={56} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                                    )}
                                </div>
                            </div>

                            <div className="w-full text-center space-y-4 px-4 min-h-[80px] flex items-center justify-center">
                                {error && !error.includes('Network') ? (
                                    <div className="space-y-2">
                                        <p className="text-lg font-bold text-amber-600 leading-tight">{error}</p>
                                        <button onClick={() => startListening()} className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xl font-medium text-slate-700 leading-tight italic">
                                        {aiStatus || (isListening ? (transcript || '...') : (currentLang === 'ta-IN' ? 'சொல்ல தட்டவும்' : 'Tap to speak'))}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Data Slots Summary */}
                <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-6 border-t border-slate-50">
                    <div className={`p-2 rounded-2xl text-center transition-all ${answers.name ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Crop</p>
                        <p className={`text-xs font-bold truncate ${answers.name ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {answers.name || '---'}
                        </p>
                    </div>
                    <div className={`p-2 rounded-2xl text-center transition-all ${answers.quantityKg ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Qty</p>
                        <p className={`text-xs font-bold truncate ${answers.quantityKg ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {answers.quantityKg ? `${answers.quantityKg}kg` : '---'}
                        </p>
                    </div>
                    <div className={`p-2 rounded-2xl text-center transition-all ${answers.basePrice ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Price</p>
                        <p className={`text-xs font-bold truncate ${answers.basePrice ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {answers.basePrice ? `₹${answers.basePrice}` : '---'}
                        </p>
                    </div>
                </div>

                <div className="w-full flex justify-between items-center mt-2">
                    <button onClick={handleManualRestart} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <RefreshCw size={18} />
                    </button>
                    {isListening && (
                        <button onClick={stopListening} className="text-xs font-bold text-red-500 uppercase tracking-wider">Stop</button>
                    )}
                </div>
            </div>
        </div>
    );
}
