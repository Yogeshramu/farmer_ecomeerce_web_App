import { NextResponse } from 'next/server';

// Free voices available on ElevenLabs free tier
// eleven_multilingual_v2 model handles Tamil natively with ANY voice
const VOICE_IDS: Record<string, string> = {
    'ta-IN': 'EXAVITQu4vr4xnSDxMaL',  // Sarah - works with Tamil via multilingual model
    'en-IN': 'CwhRBWXzGAHq8TQ4Fs17',  // Roger - natural conversational English
    'default': 'EXAVITQu4vr4xnSDxMaL'
};

export async function POST(req: Request) {
    try {
        const { text, language } = await req.json();

        console.log('[AI TTS] Request:', { text: text?.substring(0, 60), language });

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
        }

        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;

        if (elevenLabsKey) {
            // Use env override if set, otherwise pick from our known-working free voices
            const voiceId = (language === 'ta-IN'
                ? process.env.ELEVENLABS_TAMIL_VOICE_ID
                : process.env.ELEVENLABS_ENGLISH_VOICE_ID)
                || VOICE_IDS[language] || VOICE_IDS['default'];

            console.log('[AI TTS] Using ElevenLabs voice:', voiceId, 'for language:', language);

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': elevenLabsKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.72,
                        similarity_boost: 0.82,
                        style: language === 'ta-IN' ? 0.55 : 0.18,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[AI TTS] ElevenLabs HTTP ${response.status}:`, errorText);

                // If the specific voice fails, try the default voice as fallback
                if (response.status === 402 || response.status === 404) {
                    console.log('[AI TTS] Voice unavailable, trying default voice...');
                    const fallbackResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_IDS['default']}`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'audio/mpeg',
                            'xi-api-key': elevenLabsKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            text: text,
                            model_id: 'eleven_multilingual_v2',
                            voice_settings: {
                                stability: 0.72,
                                similarity_boost: 0.82,
                                style: 0.4,
                                use_speaker_boost: true
                            }
                        })
                    });

                    if (fallbackResponse.ok) {
                        const audioBuffer = await fallbackResponse.arrayBuffer();
                        console.log('[AI TTS] Fallback voice success, size:', audioBuffer.byteLength);
                        return new NextResponse(audioBuffer, {
                            headers: { 'Content-Type': 'audio/mpeg' }
                        });
                    }
                    console.error('[AI TTS] Fallback voice also failed:', fallbackResponse.status);
                }

                throw new Error(`ElevenLabs API error: HTTP ${response.status} - ${errorText}`);
            }

            const audioBuffer = await response.arrayBuffer();
            console.log('[AI TTS] Success, audio size:', audioBuffer.byteLength, 'bytes');
            return new NextResponse(audioBuffer, {
                headers: { 'Content-Type': 'audio/mpeg' }
            });
        }
        else if (openAIKey) {
            const isTamil = language === 'ta-IN';
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openAIKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: isTamil ? 'nova' : 'alloy'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AI TTS] OpenAI TTS Error:', errorText);
                throw new Error(`OpenAI TTS error: ${errorText}`);
            }

            const audioBuffer = await response.arrayBuffer();
            return new NextResponse(audioBuffer, {
                headers: { 'Content-Type': 'audio/mpeg' }
            });
        }
        else {
            return NextResponse.json(
                { error: "No AI Voice API Key configured. Add ELEVENLABS_API_KEY or OPENAI_API_KEY to .env" },
                { status: 500 }
            );
        }
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[AI TTS] Route Error:", errMsg);
        return NextResponse.json({ error: errMsg || "Failed to generate AI speech" }, { status: 500 });
    }
}
