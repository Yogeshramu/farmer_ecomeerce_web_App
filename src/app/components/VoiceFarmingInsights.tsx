import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { Language, useVoiceInput } from '../hooks/useVoiceInput';

interface VoiceFarmingInsightsProps {
    language?: Language;
    onLanguageChange?: (language: Language) => void;
}

export default function VoiceFarmingInsights({ language = 'ta-IN', onLanguageChange }: VoiceFarmingInsightsProps) {
    const currentLang = language;
    const [hasStarted, setHasStarted] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    const [lastQuestion, setLastQuestion] = useState('');

    const { isListening, isSpeaking, transcript, error, startListening, stopListening, resetTranscript, speak } = useVoiceInput(currentLang);

    const getSystemPrompt = (lang: Language) => {
        if (lang === 'ta-IN') {
            return [
                'நீங்கள் தமிழ்நாடு விவசாயிகளுக்கான விவசாய ஆலோசகர் AI.',
                'விலை, சந்தை போக்கு, பூச்சி மேலாண்மை, நீர்ப்பாசனம், உரம், நோய் தடுப்பு குறித்து மட்டும் பதில் கொடு.',
                'சொல்லாக்கம் எளிமையான, நம்பிக்கையூட்டும், நேரடி பேசு தமிழ் ஆக இருக்க வேண்டும்.',
                'ஒரு பதிலில் அதிகபட்சம் 3 குறுகிய வரிகள். தேவையற்ற நீளமான விளக்கம் வேண்டாம்.',
                'பாதுகாப்பு முக்கியம்: அதிக டோஸ் மருந்து அல்லது ஆபத்தான ஆலோசனை கூற வேண்டாம்.',
                'பயனர் கேள்வி தெளிவில்லையெனில் ஒரே ஒரு தெளிவான follow-up கேள்வி கேள்.'
            ].join(' ');
        }

        return [
            'You are an agricultural advisory assistant for Tamil Nadu farmers.',
            'Answer only farming topics: crop health, pest control, irrigation, fertilizer, weather and market guidance.',
            'Keep answers practical, short, and spoken-friendly in plain English.',
            'At most 3 short lines per answer.',
            'If question is unclear, ask one follow-up question.'
        ].join(' ');
    };

    const askInsight = useCallback(async (question: string) => {
        if (!question || question.trim().length < 2) return;

        setIsAiProcessing(true);
        setAiStatus(currentLang === 'ta-IN' ? 'விவசாய ஆலோசனை தயார் செய்றேன்...' : 'Preparing farming advice...');

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: getSystemPrompt(currentLang) },
                        { role: 'user', content: question }
                    ]
                })
            });

            const data = await res.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            const answer = content || (currentLang === 'ta-IN'
                ? 'இந்த கேள்விக்கு இன்னும் கொஞ்சம் விவரம் சொல்லுங்க, நல்ல ஆலோசனை தரேன்.'
                : 'Please share a bit more detail so I can give better advice.');

            setAiStatus(answer);
            setLastQuestion(question);
            setIsAiProcessing(false);

            speak(answer, () => startListening());
        } catch {
            setIsAiProcessing(false);
            const fallback = currentLang === 'ta-IN'
                ? 'சர்வர் இணைப்பு சிக்கல். கொஞ்சம் நேரம் கழித்து மறுபடியும் கேளுங்க.'
                : 'Server connection issue. Please ask again in a moment.';
            setAiStatus(fallback);
            speak(fallback, () => startListening());
        }
    }, [currentLang, speak, startListening]);

    const handleStart = useCallback(() => {
        setHasStarted(true);
        setLastQuestion('');
        resetTranscript();

        const intro = currentLang === 'ta-IN'
            ? 'வணக்கம். நான் உங்க விவசாய ஆலோசனை உதவியாளர். கேள்வி கேளுங்க.'
            : 'Hi, I am your crop advisory assistant. Ask your farming question.';
        setAiStatus(intro);

        speak(intro, () => startListening());
    }, [currentLang, resetTranscript, speak, startListening]);

    const handleReset = useCallback(() => {
        setHasStarted(false);
        setAiStatus('');
        setLastQuestion('');
        setIsAiProcessing(false);
        resetTranscript();
        stopListening();
    }, [resetTranscript, stopListening]);

    useEffect(() => {
        handleReset();
    }, [currentLang, handleReset]);

    useEffect(() => {
        if (!isListening && transcript && !isSpeaking && hasStarted && !isAiProcessing) {
            askInsight(transcript);
        }
    }, [askInsight, hasStarted, isAiProcessing, isListening, isSpeaking, transcript]);

    const quickQuestions = currentLang === 'ta-IN'
        ? [
            'தக்காளி இலை சுருங்குது, என்ன பண்ணலாம்?',
            'வெயில் காலத்தில் எந்த நேரம் பாசனம் நல்லது?',
            'மிளகாய் காய்களில் துளை வருது, கட்டுப்பாடு என்ன?'
        ]
        : [
            'Tomato leaves are curling, what should I do?',
            'Best irrigation timing during summer?',
            'How to control fruit borer in chilli?'
        ];

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/30 text-gray-900 overflow-hidden shadow-[0_16px_48px_rgba(16,185,129,0.1)] relative">
                <div className="relative z-10 p-6 md:p-8">
                    <section className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-emerald-100">
                            <h3 className="text-lg font-black tracking-tight text-gray-900">
                                {currentLang === 'ta-IN' ? 'குரல் விவசாய ஆலோசனை' : 'Voice Farming Insight'}
                            </h3>
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
                            <div className="space-y-4">
                                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-sm text-gray-700 leading-relaxed">
                                    {currentLang === 'ta-IN'
                                        ? 'நோய், பூச்சி, பாசனம், உரம், சந்தை விலை பற்றி குரலில கேளுங்க.'
                                        : 'Ask by voice about pest, disease, irrigation, fertilizer, and market strategy.'}
                                </div>
                                <button
                                    onClick={handleStart}
                                    className="w-full h-16 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-2.5 shadow-md"
                                >
                                    <Mic size={20} />
                                    {currentLang === 'ta-IN' ? 'ஆலோசனை தொடங்கு' : 'Start Advisory'}
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
                                    <div className="text-left text-sm">
                                        {isListening
                                            ? (currentLang === 'ta-IN' ? 'கேட்கிறேன்...' : 'Listening...')
                                            : isSpeaking
                                                ? (currentLang === 'ta-IN' ? 'ஆலோசனை சொல்லுறேன்...' : 'Giving advice...')
                                                : isAiProcessing
                                                    ? (currentLang === 'ta-IN' ? 'பதில் தயாராகுது...' : 'Preparing answer...')
                                                    : (currentLang === 'ta-IN' ? 'மீண்டும் கேட்க தட்டவும்' : 'Tap to ask again')}
                                    </div>
                                </button>

                                {error ? (
                                    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                                        {error}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 min-h-[140px] space-y-3">
                                        <p className="text-xs uppercase tracking-widest text-emerald-600 font-black">
                                            {currentLang === 'ta-IN' ? 'AI ஆலோசனை' : 'AI Advice'}
                                        </p>
                                        <p className="text-sm leading-relaxed text-gray-800 font-medium">
                                            {aiStatus || (currentLang === 'ta-IN' ? 'கேள்வி கேட்க தயாராக இருக்கேன்.' : 'Ready for your farming question.')}
                                        </p>
                                        {lastQuestion && (
                                            <p className="text-sm text-emerald-700 border-l-4 border-emerald-500 pl-4 italic">
                                                {currentLang === 'ta-IN' ? 'கடைசி கேள்வி' : 'Last question'}: "{lastQuestion}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-3">
                                        {currentLang === 'ta-IN' ? 'விரைவு கேள்விகள்' : 'Quick Questions'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {quickQuestions.map((question) => (
                                            <button
                                                key={question}
                                                onClick={() => askInsight(question)}
                                                className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-100">
                            <button onClick={handleReset} className="px-5 py-2.5 rounded-lg border-2 border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all hover:border-emerald-300 hover:shadow-md">
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
