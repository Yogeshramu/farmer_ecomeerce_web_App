import { EdgeTTS } from 'node-edge-tts';

async function main() {
    const tts = new EdgeTTS();
    await tts.voice('en-IN-NeerjaNeural');
    let buffers = [];
    const readable = tts.play({ text: 'Hello from node edge tts!', voice: 'en-IN-NeerjaNeural' });
    // actually what is the API? Let's check the npm module. Let me print it
}
main();
