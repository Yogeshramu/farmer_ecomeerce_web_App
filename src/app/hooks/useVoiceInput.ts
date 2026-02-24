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

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (!mountedRef.current) return;

        const speakNative = () => {
            if (!window.speechSynthesis) return false;
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            utterance.rate = 0.9;
            utterance.pitch = 1;

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

        const nativeStarted = speakNative();
        if (!nativeStarted) speakFallback();
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
            // THE CORE FIX: Silence non-critical errors entirely
            const silentErrors = ['network', 'no-speech', 'aborted'];
            if (!silentErrors.includes(event.error)) {
                console.error('Speech Recognition Error:', event.error);
            }

            if (mountedRef.current) {
                let errorMessage = null;
                if (event.error === 'not-allowed') errorMessage = 'Microphone permission denied';
                // We keep the state update for UI but avoid the console.error above
                if (event.error === 'network') errorMessage = 'Connection error';

                setState(prev => ({
                    ...prev,
                    isListening: false,
                    error: errorMessage
                }));
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
