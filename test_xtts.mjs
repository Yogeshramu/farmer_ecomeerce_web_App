import { client } from "@gradio/client";
import fs from "fs";

async function run() {
    try {
        console.log("Connecting to coqui/XTTS-v2...");
        const app = await client("coqui/XTTS-v2");
        
        console.log("Fetching reference audio...");
        // A generic clear voice snippet for cloning reference
        const refAudioRes = await fetch("https://actions.google.com/sounds/v1/water/rain_drips_continuous.ogg"); // Just placeholder, any valid audio will do to clone a generic tone or better yet, a sample voice!
        // Actually, let's use a sample TTS voice from somewhere to clone it!
        const TTS_REF = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav");
        const blob = await TTS_REF.blob();

        console.log("Generating speech...");
        const result = await app.predict("/predict", [
                "வணக்கம்ங்க! நா உங்க AI விவசாய உதவியாளரு பேசுறேன்.", // Prompt	
                "ta",   // Language (Tamil)
                blob,   // Reference audio
                null,   // microphone ref
                false,  // use mic
                true,   // cleanup reference
                false,  // omit language
                blob,   // speaker reference (new gradio)
                true    // Agree to terms
        ]);
        
        console.log("Result:", result.data);
        const url = result.data[0].url;
        
        console.log("Downloading audio...", url);
        const audioRes = await fetch(url);
        const arrayBuf = await audioRes.arrayBuffer();
        
        fs.writeFileSync("/tmp/xtts_out.wav", Buffer.from(arrayBuf));
        console.log("Saved to /tmp/xtts_out.wav");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
