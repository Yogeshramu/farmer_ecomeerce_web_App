const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const fs = require('fs');

async function run() {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-IN-NeerjaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const result = tts.toStream("Hi, how are you?");
    // Result might be a promise
    const streamInfo = await Promise.resolve(result);
    console.log(Object.keys(streamInfo));
    
    const chunks = [];
    streamInfo.audioStream.on('data', d => chunks.push(d));
    streamInfo.audioStream.on('close', () => {
        console.log("Audio size:", Buffer.concat(chunks).length);
    });
}
run().catch(console.error);
