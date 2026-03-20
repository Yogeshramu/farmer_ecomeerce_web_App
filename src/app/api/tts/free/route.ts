import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const maxDuration = 60;

const VOICE_MAP: Record<string, string> = {
    'ta-IN': 'ta-IN-ValluvarNeural',   // Natural Tamil male voice
    'en-IN': 'en-IN-NeerjaNeural',     // Indian English female voice
    'default': 'en-IN-NeerjaNeural'
};

async function getEdgeTTS(text: string, language: string): Promise<Buffer> {
    const voice = VOICE_MAP[language] || VOICE_MAP['default'];
    
    return new Promise(async (resolve, reject) => {
        try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            
            const { audioStream } = tts.toStream(text);
            const chunks: Buffer[] = [];
            
            audioStream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            audioStream.on('close', () => {
                if (chunks.length > 0) {
                    resolve(Buffer.concat(chunks));
                } else {
                    reject(new Error("Edge TTS returned no audio data."));
                }
            });
            
            audioStream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
}

export async function POST(req: Request) {
    try {
        const { text, language = 'en-IN' } = await req.json();

        console.log('[Free TTS] Request:', { text: text?.substring(0, 60), language });

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
        }

        // Try Edge TTS (High-Quality Neural Voice) first!
        try {
            console.log('[Free TTS] Attempting High-Quality Edge TTS...');
            const audioBuffer = await getEdgeTTS(text, language);
            console.log('[Free TTS] Edge TTS Success, size:', audioBuffer.byteLength, 'bytes');
            
            return new NextResponse(new Uint8Array(audioBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-store, max-age=0'
                }
            });
        } catch (edgeError) {
            console.warn('[Free TTS] Edge TTS failed or not installed. Falling back to Google TTS...', edgeError);
            
            // Fallback to Google Translate TTS
            const langCode = language.includes('-') ? language.split('-')[0] : language;
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Google TTS HTTP ${response.status}`);
            }

            const audioBuffer = await response.arrayBuffer();
            console.log('[Free TTS] Google TTS Success, size:', audioBuffer.byteLength, 'bytes');

            return new NextResponse(audioBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-store, max-age=0'
                }
            });
        }
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[Free TTS] Error:', errMsg);
        return NextResponse.json({ error: `Free TTS Error: ${errMsg}` }, { status: 500 });
    }
}
