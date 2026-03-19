import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text, language } = await req.json();

        // Check for ElevenLabs API Key (Best for Tamil Slang / Emotional Voice)
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;

        if (elevenLabsKey) {
            // You can easily change the tone by swapping the 'voiceId' string below!
            //  - '2EiwWnXFnvU5JabPnv8n' = Clyde (Deep, warm, authentic older male farmer vibe)
            //  - 'EXAVITQu4vr4xnSDxMaL' = Bella (Soft, sweet young female voice)
            //  - 'pNInz6obpgDQGcFmaJgB' = Adam (Clear, professional middle-aged male)
            //  - 'ThT5KcBeYPX3keUQqHPh' = Dorothy (Pleasant, motherly Indian female tone)
            const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // <-- Change this ID to change the voice!

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
                        stability: 0.5,
                        similarity_boost: 0.75
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
                    voice: 'alloy' // You can change to 'echo', 'fable', 'onyx', 'nova', or 'shimmer'
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
