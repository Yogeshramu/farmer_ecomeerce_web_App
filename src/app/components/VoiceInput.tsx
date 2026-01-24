'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
    onResult: (text: string) => void;
    lang?: string;
}

export function VoiceInput({ onResult, lang = 'en-US' }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRec = (window as unknown as WindowWithSpeech).SpeechRecognition ||
                (window as unknown as WindowWithSpeech).webkitSpeechRecognition;

            if (SpeechRec) {
                const rec = new SpeechRec();
                rec.continuous = false;
                rec.lang = lang;
                rec.interimResults = false;

                rec.onresult = (event: SpeechRecognitionEvent) => {
                    const text = event.results[0][0].transcript;
                    onResult(text);
                    setIsListening(false);
                    setError('');
                };

                rec.onerror = (event: SpeechRecognitionErrorEvent) => {
                    if (event.error === 'network') {
                        setError('Offline: Voice unavailable. Use buttons below.');
                    } else {
                        let msg = 'Speech recognition error';
                        if (event.error === 'not-allowed') msg = 'Microphone access denied. Please allow permissions.';
                        if (event.error === 'no-speech') msg = 'No speech detected. Please try again.';
                        setError(msg);
                    }
                    setIsListening(false);
                };

                rec.onend = () => {
                    setIsListening(false);
                };

                const timer = setTimeout(() => setRecognition(rec), 0);
                return () => clearTimeout(timer);
            }
        }
    }, [onResult, lang]);

    const toggleListening = () => {
        if (error && (error.includes('Offline') || error.includes('network'))) {
            setIsListening(true);
            setError('');
            setTimeout(() => {
                const simulatedSpeech = prompt("🎤 [Demo Mode] What did you say? (e.g., 'Brinjal 40')");
                if (simulatedSpeech) {
                    onResult(simulatedSpeech);
                }
                setIsListening(false);
            }, 500);
            return;
        }

        if (!recognition) {
            alert("Voice recognition not supported in this browser. Use Chrome.");
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            setError('');
            try {
                recognition.start();
                setIsListening(true);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <Button
                onClick={toggleListening}
                variant={isListening ? 'danger' : 'primary'}
                className="rounded-full w-24 h-24 shadow-2xl flex items-center justify-center transition-all bg-emerald-600 hover:bg-emerald-700"
            >
                {isListening ? <MicOff size={40} /> : <Mic size={40} />}
            </Button>
            <p className="text-sm font-medium text-slate-500 animate-pulse">
                {isListening ? 'Listening...' : 'Tap Mic to Speak'}
            </p>

            <div className="flex flex-col items-center gap-3 w-full">
                {error && (
                    <div className="flex flex-col items-center gap-1 w-full relative">
                        <p className="text-red-500 text-xs text-center px-4 bg-red-50 py-1 rounded border border-red-100 w-full">
                            {error}
                        </p>
                        {error.includes('Offline') && (
                            <button
                                onClick={() => setError('')}
                                className="text-[10px] text-blue-600 underline hover:text-blue-800"
                            >
                                Retry Connection
                            </button>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => { setError(''); onResult("Tomato 50"); }}
                        className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                        Demo: &quot;Tomato 50&quot;
                    </button>

                    <button
                        onClick={() => {
                            const input = prompt("Manual Input (e.g., Potato 20):");
                            if (input) onResult(input);
                        }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-medium transition-colors border border-slate-200"
                    >
                        ⌨️ Type Manually
                    </button>
                </div>
            </div>
        </div>
    );
}

// Type definitions for Speech Recognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
}
