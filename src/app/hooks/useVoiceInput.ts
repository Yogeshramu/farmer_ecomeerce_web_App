import { useState, useEffect, useRef, useCallback } from 'react';

// Types for Speech Recognition
interface WindowWithSpeech extends Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

export type Language = 'ta-IN' | 'en-IN';

interface VoiceInputState {
    isListening: boolean;
    isSpeaking: boolean;
    error: string | null;
    transcript: string;
}

export const useVoiceInput = (language: Language = 'ta-IN') => {
    const [state, setState] = useState<VoiceInputState>({
        isListening: false,
        isSpeaking: false,
        error: null,
        transcript: ''
    });

    const recognitionRef = useRef<any>(null);
    const recognitionActiveRef = useRef(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        return () => {
            mountedRef.current = false;
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, []);

    const speak = useCallback(async (text: string, onEnd?: () => void) => {
        if (!mountedRef.current) return;

        // 1. Try High-Quality AI Voice API first
        const speakAI = async () => {
            try {
                const response = await fetch('/api/ai/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, language })
                });

                if (!response.ok) return false;

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);

                audio.onplay = () => setState(prev => ({ ...prev, isSpeaking: true }));
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    if (mountedRef.current) {
                        setState(prev => ({ ...prev, isSpeaking: false }));
                        if (onEnd) onEnd();
                    }
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(url);
                    return false;
                };

                await audio.play();
                return true; // Success!
            } catch (err) {
                console.warn('AI TTS failed, falling back to native TTS...');
                return false;
            }
        };

        const speakNative = () => {
            if (!window.speechSynthesis) return false;
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            utterance.rate = 1.0;
            utterance.pitch = 1.1;

            const voices = window.speechSynthesis.getVoices();
            let selectedVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith(language.split('-')[0]));
            if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onstart = () => {
                if (mountedRef.current) setState(prev => ({ ...prev, isSpeaking: true }));
            };

            utterance.onend = () => {
                if (mountedRef.current) {
                    setState(prev => ({ ...prev, isSpeaking: false }));
                    if (onEnd) onEnd();
                }
            };

            utterance.onerror = (e: any) => {
                if (e.error !== 'canceled' && e.error !== 'interrupted') {
                    console.warn('Native TTS failed, trying fallback...', e);
                    speakFallback();
                }
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            return true;
        };

        const speakFallback = () => {
            try {
                const langCode = language.split('-')[0];
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodeURIComponent(text)}`;
                const audio = new Audio(url);
                audio.onplay = () => setState(prev => ({ ...prev, isSpeaking: true }));
                audio.onended = () => {
                    if (mountedRef.current) {
                        setState(prev => ({ ...prev, isSpeaking: false }));
                        if (onEnd) onEnd();
                    }
                };
                audio.onerror = () => {
                    setState(prev => ({ ...prev, isSpeaking: false }));
                    if (onEnd) onEnd();
                };
                audio.play();
            } catch (err) {
                setState(prev => ({ ...prev, isSpeaking: false }));
                if (onEnd) onEnd();
            }
        };

        const aiStarted = await speakAI();
        if (!aiStarted) {
            const nativeStarted = speakNative();
            if (!nativeStarted) speakFallback();
        }
    }, [language]);

    const startListening = useCallback(() => {
        if (!mountedRef.current || typeof window === 'undefined') return;

        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) {
            setState(prev => ({ ...prev, error: 'Voice input not supported' }));
            return;
        }

        // Clean up previous
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }

        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = language;

        rec.onstart = () => {
            recognitionActiveRef.current = true;
            if (mountedRef.current) setState(prev => ({ ...prev, isListening: true, error: null }));
        };

        rec.onresult = (event: any) => {
            if (mountedRef.current) {
                const text = event.results[0][0].transcript;
                setState(prev => ({ ...prev, transcript: text, isListening: false }));
            }
        };

        rec.onerror = (event: any) => {
            // Silent errors: auto-retry, never show to user
            const silentErrors = ['network', 'no-speech', 'aborted', 'audio-capture'];

            if (mountedRef.current) {
                if (event.error === 'not-allowed') {
                    // Only mic-denied is a real visible error
                    setState(prev => ({
                        ...prev,
                        isListening: false,
                        error: 'Microphone permission denied. Please allow mic access. / மைக்க ஆன் பண்ணி விடுங்க.'
                    }));
                } else if (silentErrors.includes(event.error)) {
                    // Silently clear listening state — VoiceQAFlow will handle retry via tap
                    setState(prev => ({ ...prev, isListening: false, error: null }));
                } else {
                    console.warn('Speech Recognition Error:', event.error);
                    setState(prev => ({ ...prev, isListening: false, error: null }));
                }
            }
        };

        rec.onend = () => {
            recognitionActiveRef.current = false;
            if (mountedRef.current) {
                setState(prev => ({ ...prev, isListening: false }));
            }
        };

        recognitionRef.current = rec;

        // Use a longer delay and check if already active
        setTimeout(() => {
            if (mountedRef.current && !recognitionActiveRef.current) {
                try {
                    rec.start();
                } catch (e) { }
            }
        }, 200);
    }, [language]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }
    }, []);

    const resetTranscript = useCallback(() => {
        setState(prev => ({ ...prev, transcript: '' }));
    }, []);

    return {
        ...state,
        speak,
        startListening,
        stopListening,
        resetTranscript
    };
};
