import { useState, useEffect, useRef, useCallback } from 'react';
import { speakWithElevenLabs } from '../utils/elevenLabsTTS';

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
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
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

        try {
            await speakWithElevenLabs(text, {
                language: language as 'en-IN' | 'ta-IN',
                speed: 1.0,
                onPlay: () => {
                    if (mountedRef.current) {
                        setState(prev => ({ ...prev, isSpeaking: true }));
                    }
                },
                onEnd: () => {
                    if (mountedRef.current) {
                        setState(prev => ({ ...prev, isSpeaking: false }));
                        if (onEnd) onEnd();
                    }
                },
                onError: (error) => {
                    const errorInfo = {
                        message: error instanceof Error ? error.message : String(error),
                        type: error instanceof Error ? error.constructor.name : typeof error,
                        details: error
                    };
                    console.error('[Hook] ElevenLabs TTS error:', errorInfo);
                    if (mountedRef.current) {
                        setState(prev => ({ ...prev, isSpeaking: false }));
                        if (onEnd) onEnd();
                    }
                }
            });
        } catch (error) {
            const errorInfo = {
                message: error instanceof Error ? error.message : String(error),
                type: error instanceof Error ? error.constructor.name : typeof error,
                stack: error instanceof Error ? error.stack : undefined
            };
            console.error('[Hook] Failed to speak:', errorInfo);
            if (mountedRef.current) {
                setState(prev => ({ ...prev, isSpeaking: false }));
                if (onEnd) onEnd();
            }
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
