import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text, language } = await req.json();
        const isTamil = language === 'ta-IN';

        // Check for ElevenLabs API Key (Best for Tamil Slang / Emotional Voice)
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;

        if (elevenLabsKey) {
            const tamilVoiceId = process.env.ELEVENLABS_TAMIL_VOICE_ID || 'ThT5KcBeYPX3keUQqHPh';
            const englishVoiceId = process.env.ELEVENLABS_ENGLISH_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
            const voiceId = isTamil ? tamilVoiceId : englishVoiceId;

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
                        style: 0.18,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                console.error('ElevenLabs Error:', await response.text());
                throw new Error("ElevenLabs API failed");
            }

            const audioBuffer = await response.arrayBuffer();
            return new NextResponse(audioBuffer, {
                headers: { 'Content-Type': 'audio/mpeg' }
            });
        }
        else if (openAIKey) {
            // Using OpenAI TTS
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
                console.error('OpenAI TTS Error:', await response.text());
                throw new Error("OpenAI TTS API failed");
            }

            const audioBuffer = await response.arrayBuffer();
            return new NextResponse(audioBuffer, {
                headers: { 'Content-Type': 'audio/mpeg' }
            });
        }
        else {
            return NextResponse.json(
                { error: "No High-Quality AI Voice API Key configured (Add ELEVENLABS_API_KEY or OPENAI_API_KEY to .env.local)" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("AI TTS Route Error:", error);
        return NextResponse.json({ error: "Failed to generate AI speech" }, { status: 500 });
    }
}
