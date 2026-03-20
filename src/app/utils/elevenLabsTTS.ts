/**
 * ElevenLabs Text-to-Speech utility for natural-sounding voice synthesis
 * Calls secure server API to generate speech
 */

const TTS_API_ENDPOINTS = ['/api/tts/free', '/api/tts/elevenlabs', '/api/ai/tts'];

interface SpeechOptions {
    language?: 'en-IN' | 'ta-IN';
    speed?: number; // 0.5 to 2.0
    onPlay?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Speaks text using ElevenLabs API for natural voice synthesis
 */
export async function speakWithElevenLabs(
    text: string,
    options: SpeechOptions = {}
): Promise<void> {
    const {
        language = 'en-IN',
        speed = 1.0,
        onPlay,
        onEnd,
        onError
    } = options;

    if (!text || text.trim().length === 0) {
        const error = new Error('Text to speak cannot be empty');
        onError?.(error);
        return;
    }

    try {
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        console.log('[Client TTS] Requesting audio:', { text: text.substring(0, 50), language });

        // Call server API to generate speech (secure - API key not exposed).
        // Try each route until one succeeds, to handle quota/availability errors.
        let response: Response | null = null;
        for (const endpoint of TTS_API_ENDPOINTS) {
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, language })
                });

                if (response.ok) {
                    break;
                } else {
                    console.warn(`[Client TTS] Endpoint ${endpoint} failed with status ${response.status}, trying next...`);
                }
            } catch (err) {
                console.warn(`[Client TTS] Endpoint ${endpoint} threw an error, trying next...`, err);
            }
        }

        if (!response) {
            throw new Error('TTS Error: No API response received');
        }

        console.log('[Client TTS] Response received, status:', response.status);

        if (!response.ok) {
            let errorMessage = `TTS Error: HTTP ${response.status}`;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('[Client TTS] Error response:', errorData);
                    
                    // Handle various error formats
                    if (errorData.error && typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if (errorData.message && typeof errorData.message === 'string') {
                        errorMessage = errorData.message;
                    } else if (Object.keys(errorData).length === 0) {
                        errorMessage = `TTS Error: Empty error response from server (HTTP ${response.status})`;
                    }
                } else {
                    const errorText = await response.text();
                    console.error('[Client TTS] Error response (text):', errorText);
                    errorMessage = `TTS Error: ${errorText.substring(0, 200) || response.statusText}`;
                }
            } catch (parseError) {
                console.error('[Client TTS] Could not parse error response:', parseError);
            }

            throw new Error(errorMessage);
        }

        // Get audio blob from response
        const audioBlob = await response.blob();
        console.log('[Client TTS] Audio blob received, size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
            throw new Error('Received empty audio blob from server');
        }

        // Create audio element and play
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        currentAudio.playbackRate = speed;

        console.log('[Client TTS] Audio element created, type:', audioBlob.type);

        currentAudio.onplay = () => {
            console.log('[Client TTS] Audio playback started');
            onPlay?.();
        };

        currentAudio.onended = () => {
            console.log('[Client TTS] Audio playback ended normally');
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            onEnd?.();
        };

        currentAudio.onerror = (error) => {
            const mediaError = currentAudio?.error;
            const errorMsg = `Audio error: ${mediaError?.message || 'Code ' + mediaError?.code || 'Unknown'}`;
            const err = new Error(errorMsg);
            console.error('[Client TTS] Playback error:', {
                code: mediaError?.code,
                message: mediaError?.message,
                fullError: error
            });
            onError?.(err);
        };

        console.log('[Client TTS] Calling Audio.play()...');
        await currentAudio.play();
        console.log('[Client TTS] Audio.play() promise resolved');

    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[Client TTS] ElevenLabs failed, trying browser fallback:', err.message);

        // Fallback to browser's built-in SpeechSynthesis
        try {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                console.log('[Client TTS] Using browser SpeechSynthesis fallback');
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = language;
                utterance.rate = speed;

                // Try to find a matching voice
                const voices = window.speechSynthesis.getVoices();
                const matchingVoice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
                if (matchingVoice) {
                    utterance.voice = matchingVoice;
                }

                utterance.onstart = () => {
                    console.log('[Client TTS] Browser fallback started');
                    onPlay?.();
                };
                utterance.onend = () => {
                    console.log('[Client TTS] Browser fallback ended');
                    onEnd?.();
                };
                utterance.onerror = (e) => {
                    console.error('[Client TTS] Browser fallback error:', e);
                    onError?.(new Error('Browser TTS also failed'));
                };

                window.speechSynthesis.cancel(); // Clear any queued speech
                window.speechSynthesis.speak(utterance);
                return;
            }
        } catch (fallbackError) {
            console.error('[Client TTS] Browser fallback also failed:', fallbackError);
        }

        onError?.(err);
    }
}

/**
 * Stop any currently playing audio
 */
export function stopSpeaking(): void {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
    return currentAudio !== null && !currentAudio.paused;
}
