const { EdgeTTS } = require('node-edge-tts');
const tts = new EdgeTTS();
console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tts)));
