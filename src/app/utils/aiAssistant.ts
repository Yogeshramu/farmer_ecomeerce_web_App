export interface AiResponse {
    message: string;
    extractedData: {
        name: string | null;
        quantityKg: string | null;
        basePrice: string | null;
    };
    suggestedPrice?: number | null;
    priceReason?: string | null;
    isComplete: boolean;
}

export async function processAiConversation(
    text: string,
    currentAnswers: { name: string; quantityKg: string; basePrice: string },
    language: 'ta-IN' | 'en-IN'
): Promise<AiResponse> {
    const isTamil = language === 'ta-IN';

    // Get current month to factor in seasonality
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const season = getSeason(now.getMonth());

    const systemPrompt = `You are FarmerDirect AI, a smart farming assistant helping Indian farmers in Tamil Nadu list crops for sale.
Your job is to: 1) Extract crop info from what the farmer says, 2) Suggest a SMART market price considering real-world factors.

LANGUAGE: Always respond in ${isTamil ? 'authentic Madurai regional slang Tamil (மதுரை வட்டார வழக்கு - very casual spoken Tamil)' : 'English'}.

TODAY'S CONTEXT:
- Month: ${month}, Season: ${season}
- Location: Tamil Nadu, India

TAMIL CROP NAMES (map to English for JSON):
- தக்காளி = tomato, வெங்காயம் = onion, உருளைக்கிழங்கு = potato
- கத்திரிக்காய் = brinjal, பீர்க்கங்காய் = ridgegourd, வாழைப்பழம் = banana
- மிளகாய் = chilli, கேரட் = carrot, முட்டைகோஸ் = cabbage, பீன்ஸ் = beans
- பப்பாளி = papaya, மாம்பழம் = mango, திராட்சை = grapes, நெல் = rice

SMART PRICE SUGGESTION RULES:
- Base prices (₹/kg): tomato=30, onion=25, potato=20, chilli=80, brinjal=15, banana=15, carrot=25, cabbage=18
- Adjust price based on SEASON (${season}):
  * Monsoon/rainy season → supply decreases → add 20-40% to base price (crops damaged by rain)
  * Summer → tomato/onion prices rise 30-50% (heat stress on crops)
  * Winter → good harvest → reduce 10-20% (surplus supply)
- Adjust for the current month (${month}):
  * March-May = Summer (higher demand for cooling veggies)
  * June-Sept = Monsoon (supply disruption, higher prices)
  * Oct-Nov = Post-monsoon (prices normalizing)
  * Dec-Feb = Winter harvest (lower prices, good supply)
- Always give a realistic market price and briefly explain why

EXTRACTION RULES (CRITICAL):
- Farmer says crop name → extract as English lowercase in "name"
- Farmer says number + கிலோ/kg → extract ONLY the number in "quantityKg"
- Farmer says price number → extract ONLY the number in "basePrice"
- NEVER return null if the value was clearly stated
- Preserve already-collected values from Current State

Current State (already collected): ${JSON.stringify(currentAnswers)}
Missing: ${['name', 'quantityKg', 'basePrice'].filter(k => !currentAnswers[k as keyof typeof currentAnswers]).join(', ') || 'all collected'}

RESPONSE FORMAT — MANDATORY <DATA> tag at end of every reply:
<DATA>{"name":"crop_english","quantityKg":"number_or_null","basePrice":"suggested_price_number","suggestedPrice":suggested_price_number,"priceReason":"brief reason in response language","isComplete":false}</DATA>

RULES:
- Keep reply SHORT (1-2 sentences)
- When suggesting price: say the price AND the reason briefly (weather/season factor)
- ${isTamil ? 'CRITICAL: Speak exactly like a Madurai local (use "ஏங்க", "சரிங்க", "விக்காலாங்க", "அருமைங்க"). DO NOT use formal textbook Tamil!' : 'Use friendly tone'}
- Ask only for the NEXT missing field
- When all 3 fields filled → confirm everything, set isComplete: true
- ALWAYS include <DATA> tag

EXAMPLE (Tamil, summer month):
User: "தக்காளி 50 கிலோ"
Reply: "அருமைங்க! 50 கிலோ தக்காளிங்களா. வெயில் காலங்குறதால கிலோ ₹42 வரைக்கும் விக்கலாங்க - இந்த வெலை உங்களுக்கு ஓகேவா? <DATA>{"name":"tomato","quantityKg":"50","basePrice":"42","suggestedPrice":42,"priceReason":"Summer heat increases tomato prices by ~40%","isComplete":false}</DATA>"`;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from AI');

        // Parse extracted data from <DATA> tags
        const dataMatch = content.match(/<DATA>([\s\S]*?)<\/DATA>/);
        let extractedData: {
            name: string | null;
            quantityKg: string | null;
            basePrice: string | null;
            suggestedPrice?: number | null;
            priceReason?: string | null;
            isComplete: boolean;
        } = { name: null, quantityKg: null, basePrice: null, suggestedPrice: null, priceReason: null, isComplete: false };

        const cleanMessage = content.replace(/<DATA>[\s\S]*?<\/DATA>/, '').trim();

        if (dataMatch) {
            try {
                const parsed = JSON.parse(dataMatch[1]);
                extractedData = { ...extractedData, ...parsed };
            } catch (e) {
                console.error('JSON Parse Error in AI response:', e);
            }
        } else {
            console.warn('No <DATA> tag in AI response');
        }

        // Merge with existing answers — never lose collected data
        const mergedData = {
            name: extractedData.name || currentAnswers.name || null,
            quantityKg: extractedData.quantityKg || currentAnswers.quantityKg || null,
            basePrice: extractedData.basePrice || currentAnswers.basePrice || null,
        };

        const allComplete = !!mergedData.name && !!mergedData.quantityKg && !!mergedData.basePrice;

        return {
            message: cleanMessage || (isTamil ? 'சரிங்க, தொடரலாமா!' : "OK, let's continue!"),
            extractedData: mergedData,
            suggestedPrice: extractedData.suggestedPrice || null,
            priceReason: extractedData.priceReason || null,
            isComplete: extractedData.isComplete || allComplete
        };
    } catch (error) {
        console.error('AI Assistant Error:', error);
        return {
            message: isTamil
                ? 'மன்னிக்கணும்ங்க, சரியா கேக்கல. மறுபடியும் சொல்றீங்களா?'
                : 'Sorry, please say that again.',
            extractedData: { name: null, quantityKg: null, basePrice: null },
            isComplete: false
        };
    }
}

// Helper: determine Indian agricultural season by month index
function getSeason(month: number): string {
    if (month >= 5 && month <= 8) return 'Monsoon (Kharif) — heavy rains, supply disruption';
    if (month >= 9 && month <= 11) return 'Post-monsoon / Rabi sowing — prices normalising';
    if (month >= 2 && month <= 4) return 'Summer — heat stress on crops, higher prices';
    return 'Winter / Rabi harvest — good supply, stable prices';
}
