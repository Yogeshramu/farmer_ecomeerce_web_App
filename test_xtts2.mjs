import { client } from "@gradio/client";

async function run() {
    try {
        console.log("Connecting to coqui/vits-tts...");
        const app = await client("coqui/vits-tts", { hf_token: undefined });
        console.log("Success! Attempting prediction...");
        const result = await app.predict(0, [
            "Hello world",
        ]);
        console.log("Result:", result.data);
    } catch(e) {
        console.error("Coqui VITS Offline:", e.message);
    }
}
run();
