export interface AiResponse {
    message: string;
    extractedData: {
        name: string | null;
        quantityKg: string | null;
        basePrice: string | null;
    };
    suggestedPrice?: number | null;
    priceReason?: string | null;
    farmingInsight?: string | null;
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

LANGUAGE: Always respond in ${isTamil ? 'natural spoken Tamil used by farmers in Tamil Nadu. Keep it clear and polite, not theatrical.' : 'English'}.

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
<DATA>{"name":"crop_english","quantityKg":"number_or_null","basePrice":"suggested_price_number","suggestedPrice":suggested_price_number,"priceReason":"brief reason in response language","farmingInsight":"one practical crop tip in response language","isComplete":false}</DATA>

RULES:
- Keep reply SHORT (max 14 words; one question only)
- When suggesting price: say the price AND the reason briefly (weather/season factor)
- ${isTamil ? 'Use smooth colloquial Tamil. Avoid filler words and avoid repeating the same question.' : 'Use friendly tone'}
- Ask only for the NEXT missing field
- When all 3 fields filled → confirm everything, set isComplete: true
- ALWAYS include <DATA> tag

EXAMPLE (Tamil, summer month):
User: "தக்காளி 50 கிலோ"
Reply: "தக்காளி 50 கிலோ பதிவு பண்ணிட்டேன். கிலோ ₹42 வைக்கலாமா? <DATA>{"name":"tomato","quantityKg":"50","basePrice":"42","suggestedPrice":42,"priceReason":"Summer heat increases tomato prices by ~40%","farmingInsight":"மாலை நேரத்தில் தண்ணீர் விட்டா தக்காளி வெப்ப அழுத்தம் குறையும்","isComplete":false}</DATA>"`;

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
            farmingInsight?: string | null;
            isComplete: boolean;
        } = { name: null, quantityKg: null, basePrice: null, suggestedPrice: null, priceReason: null, farmingInsight: null, isComplete: false };

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

        const generatedMessage = buildAssistantMessage({
            language,
            mergedData,
            suggestedPrice: extractedData.suggestedPrice || null,
            priceReason: extractedData.priceReason || null,
            modelMessage: cleanMessage
        });

        const smartInsight = extractedData.farmingInsight || buildFarmingInsight(mergedData.name, month, season, language);

        return {
            message: generatedMessage,
            extractedData: mergedData,
            suggestedPrice: extractedData.suggestedPrice || null,
            priceReason: extractedData.priceReason || null,
            farmingInsight: smartInsight,
            isComplete: extractedData.isComplete || allComplete
        };
    } catch (error) {
        console.error('AI Assistant Error:', error);
        return {
            message: isTamil
                ? 'மன்னிக்கணும்ங்க, சரியா கேக்கல. மறுபடியும் சொல்றீங்களா?'
                : 'Sorry, please say that again.',
            extractedData: { name: null, quantityKg: null, basePrice: null },
            farmingInsight: null,
            isComplete: false
        };
    }
}

function buildAssistantMessage({
    language,
    mergedData,
    suggestedPrice,
    priceReason,
    modelMessage
}: {
    language: 'ta-IN' | 'en-IN';
    mergedData: { name: string | null; quantityKg: string | null; basePrice: string | null };
    suggestedPrice: number | null;
    priceReason: string | null;
    modelMessage: string;
}): string {
    const isTamil = language === 'ta-IN';
    const cropLabel = toTamilCropName(mergedData.name);

    if (!mergedData.name) {
        return isTamil ? 'நல்லா கேட்குது. முதல்ல பயிர் பெயர் சொல்லுங்க.' : 'Great. First, tell me the crop name.';
    }

    if (!mergedData.quantityKg) {
        return isTamil
            ? `${cropLabel} பதிவு செய்தேன். எத்தனை கிலோ இருக்குனு சொல்லுங்க.`
            : `${mergedData.name} noted. Tell me the quantity in kilograms.`;
    }

    if (!mergedData.basePrice) {
        if (isTamil && suggestedPrice) {
            const reasonText = priceReason ? ` (${normalizeReason(priceReason, true)})` : '';
            return `${cropLabel} ${mergedData.quantityKg} கிலோ noted. சந்தைபடி கிலோ ₹${suggestedPrice} நல்ல ரேட்${reasonText}. நீங்கள் வைக்கிற விலை சொல்லுங்க.`;
        }
        if (!isTamil && suggestedPrice) {
            const reasonText = priceReason ? ` (${normalizeReason(priceReason, false)})` : '';
            return `${mergedData.name} ${mergedData.quantityKg} kg noted. Market suggestion is ₹${suggestedPrice}/kg${reasonText}. Tell me your selling price.`;
        }

        return isTamil
            ? `${cropLabel} ${mergedData.quantityKg} கிலோ ok. கிலோக்கு விலை சொல்லுங்க.`
            : `${mergedData.name} ${mergedData.quantityKg} kg noted. Tell me price per kg.`;
    }

    return isTamil
        ? `சூப்பர். ${cropLabel}, ${mergedData.quantityKg} கிலோ, ₹${mergedData.basePrice}/கிலோ சரி. Upload பண்ணட்டுமா?`
        : `Perfect. ${mergedData.name}, ${mergedData.quantityKg} kg, ₹${mergedData.basePrice}/kg confirmed. Shall I upload?`;
}

function buildFarmingInsight(
    cropName: string | null,
    month: string,
    season: string,
    language: 'ta-IN' | 'en-IN'
): string | null {
    if (!cropName) {
        return language === 'ta-IN'
            ? 'நீர் அளவை ஒரே அளவில் வைத்தா பல பயிரில் நல்ல விளைச்சல் கிடைக்கும்.'
            : 'Consistent irrigation scheduling improves yield consistency across crops.';
    }

    const crop = cropName.toLowerCase();
    const tamilTips: Record<string, string> = {
        tomato: 'தக்காளியில் பூச்சி குறைய காலைவேளையில் இலை கீழ் பகுதி பார்வை அவசியம்.',
        onion: 'வெங்காயத்தில் நீர் தேங்காமல் பார்த்தால் கிழங்கு அழுகல் குறையும்.',
        potato: 'உருளைக்கிழங்கில் மண் மேடு அமைத்தால் கிழங்கு வளர்ச்சி நல்லா இருக்கும்.',
        chilli: 'மிளகாயில் ட்ரிப்ஸ் கட்டுப்பாட்டுக்கு நீலம் sticky trap வைக்கலாம்.',
        brinjal: 'கத்திரிக்காய்க்கு வாரம் ஒருமுறை காய்ச்சல் தாக்கம் உள்ள இலை நீக்கவும்.',
        banana: 'வாழையில் காற்று சேதம் தவிர்க்க புடைப்பு கம்பம் கட்டுதல் உதவும்.',
        carrot: 'கேரட்டில் மண் மென்மையா வைத்தா வேர் நேராக வளரும்.',
        cabbage: 'முட்டைகோஸில் தண்டு அழுகல் தவிர்க்க காலை பாசனம் நல்லது.',
        beans: 'பீன்ஸ்க்கு ஏறும் கம்பி அமைத்தால் காய் தரம் மேம்படும்.',
        rice: 'நெலில் நில நீர்மட்டம் கட்டுப்பாடு வைத்தா உர பயன்பாடு அதிகரிக்கும்.'
    };

    const englishTips: Record<string, string> = {
        tomato: 'Scout underside of leaves every morning for early pest control.',
        onion: 'Avoid water stagnation to reduce bulb rot in onion fields.',
        potato: 'Maintain earthing-up to improve tuber development and shape.',
        chilli: 'Use blue sticky traps to reduce thrips pressure in chilli.',
        brinjal: 'Remove infested shoots weekly to control fruit and shoot borer.',
        banana: 'Use support props to reduce wind damage in banana plants.',
        carrot: 'Keep soil loose and friable for straight, uniform roots.',
        cabbage: 'Prefer morning irrigation to limit stem and collar rot risk.',
        beans: 'Provide trellis support for better airflow and pod quality.',
        rice: 'Manage field water depth to improve fertilizer-use efficiency.'
    };

    if (language === 'ta-IN') {
        const seasonalNote = season.includes('Summer')
            ? ' வெயில் நாட்களில் மாலை பாசனம் உதவும்.'
            : season.includes('Monsoon')
                ? ' மழைக்காலத்தில் வடிகால் சீராக இருக்கணும்.'
                : '';
        return (tamilTips[crop] || 'பயிர் ஆரோக்கியத்துக்கு வாரம் ஒருமுறை தாவர நிலை ஆய்வு செய்யுங்க.') + seasonalNote;
    }

    const seasonalNote = season.includes('Summer')
        ? ' Evening irrigation helps during hot weeks.'
        : season.includes('Monsoon')
            ? ' Ensure drainage during rainy spells.'
            : '';
    return (englishTips[crop] || 'Do a weekly field walk to catch stress and pests early.') + seasonalNote;
}

function normalizeReason(reason: string, isTamil: boolean): string {
    const compact = reason.replace(/\s+/g, ' ').trim();
    if (!compact) return '';
    if (isTamil) {
        return compact.replace(/[.!?]+$/g, '');
    }
    return compact.replace(/[.!?]+$/g, '');
}

function toTamilCropName(name: string | null): string {
    if (!name) return 'பயிர்';

    const map: Record<string, string> = {
        tomato: 'தக்காளி',
        onion: 'வெங்காயம்',
        potato: 'உருளைக்கிழங்கு',
        brinjal: 'கத்திரிக்காய்',
        ridgegourd: 'பீர்க்கங்காய்',
        banana: 'வாழைப்பழம்',
        chilli: 'மிளகாய்',
        carrot: 'கேரட்',
        cabbage: 'முட்டைகோஸ்',
        beans: 'பீன்ஸ்',
        papaya: 'பப்பாளி',
        mango: 'மாம்பழம்',
        grapes: 'திராட்சை',
        rice: 'நெல்'
    };

    const key = name.toLowerCase();
    return map[key] || name;
}

// Helper: determine Indian agricultural season by month index
function getSeason(month: number): string {
    if (month >= 5 && month <= 8) return 'Monsoon (Kharif) — heavy rains, supply disruption';
    if (month >= 9 && month <= 11) return 'Post-monsoon / Rabi sowing — prices normalising';
    if (month >= 2 && month <= 4) return 'Summer — heat stress on crops, higher prices';
    return 'Winter / Rabi harvest — good supply, stable prices';
}
