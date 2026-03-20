import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Free voices available on ElevenLabs free tier
// eleven_multilingual_v2 model handles Tamil natively with ANY voice
const VOICE_IDS: Record<string, string> = {
    'en-IN': 'CwhRBWXzGAHq8TQ4Fs17',  // Roger - conversational English
    'ta-IN': 'EXAVITQu4vr4xnSDxMaL',  // Sarah - works with Tamil via multilingual model
    'default': 'EXAVITQu4vr4xnSDxMaL'
};

export async function POST(request: NextRequest) {
    try {
        const { text, language = 'en-IN' } = await request.json();

        console.log('[TTS API] Request received:', { text: text?.substring(0, 50), language });

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: 'Text to speak cannot be empty' },
                { status: 400 }
            );
        }

        if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.length === 0) {
            console.error('[TTS API] ElevenLabs API key not configured');
            return NextResponse.json(
                { error: 'TTS service not properly configured. Missing API key.' },
                { status: 500 }
            );
        }

        const voiceId = VOICE_IDS[language] || VOICE_IDS['default'];
        console.log('[TTS API] Using voice ID:', voiceId, 'for language:', language);

        const payload = {
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.75,
                similarity_boost: 0.75,
                style: language === 'ta-IN' ? 0.6 : 0.5,
                use_speaker_boost: true
            }
        };

        console.log('[TTS API] Sending request to ElevenLabs:', {
            url: `${ELEVENLABS_API_URL}/${voiceId}`,
            method: 'POST',
            hasApiKey: !!ELEVENLABS_API_KEY
        });

        const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify(payload)
        });

        console.log('[TTS API] Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorDetails = `HTTP ${response.status} ${response.statusText}`;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('[TTS API] Error response (JSON):', JSON.stringify(errorData));
                    errorDetails = errorData.detail || errorData.message || JSON.stringify(errorData);
                } else {
                    const errorText = await response.text();
                    console.error('[TTS API] Error response (text):', errorText);
                    errorDetails = errorText || errorDetails;
                }
            } catch (parseError) {
                console.error('[TTS API] Could not parse error response:', parseError);
            }

            console.error(`[TTS API] ElevenLabs returned error:`, errorDetails);
            return NextResponse.json(
                { error: `ElevenLabs API error: ${errorDetails}` },
                { status: response.status >= 500 ? 502 : response.status }
            );
        }

        const audioBlob = await response.arrayBuffer();
        console.log('[TTS API] Successfully received audio, size:', audioBlob.byteLength, 'bytes');

        return new NextResponse(audioBlob, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[TTS API] Unexpected error:', err.message, err.stack);
        return NextResponse.json(
            { error: `TTS Error: ${err.message}` },
            { status: 500 }
        );
    }
}
