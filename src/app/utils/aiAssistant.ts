
export interface AiResponse {
    message: string;
    extractedData: {
        name: string | null;
        quantityKg: string | null;
        basePrice: string | null;
    };
    isComplete: boolean;
}

export async function processAiConversation(
    text: string,
    currentAnswers: any,
    language: 'ta-IN' | 'en-IN'
): Promise<AiResponse> {
    const systemPrompt = `
    You are a helpful farming assistant named FarmDirect AI.
    Your goal is to help farmers list their crops for sale.
    You need to collect: 1) Crop Name, 2) Quantity in KG, 3) Price per KG.

    Guidelines:
    - If the user provides some details but not all, acknowledge what you got and ask for the missing ones.
    - If the user doesn't mention a price, check the market price and suggest one.
    - Market Prices (Approx): Tomato: 30/kg, Onion: 25/kg, Potato: 20/kg.
    - Speak in the user's language: ${language === 'ta-IN' ? 'Tamil' : 'English'}.
    - Keep responses brief and friendly.
    - IMPORTANT: Always return a JSON object at the END of your response inside <DATA> tags.
    - Example: "Great, I've got tomatoes. How many kilograms? <DATA>{"name": "tomato", "quantityKg": null, "basePrice": null, "isComplete": false}</DATA>"

    Current State: ${JSON.stringify(currentAnswers)}
    `;

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

        const content = data.choices[0].message.content;

        // Parse extracted data from <DATA> tags
        const dataMatch = content.match(/<DATA>([\s\S]*?)<\/DATA>/);
        let extractedData = { name: null, quantityKg: null, basePrice: null, isComplete: false };
        let cleanMessage = content.replace(/<DATA>[\s\S]*?<\/DATA>/, '').trim();

        if (dataMatch) {
            try {
                const parsed = JSON.parse(dataMatch[1]);
                extractedData = { ...extractedData, ...parsed };
            } catch (e) {
                console.error("JSON Parse Error in AI response:", e);
            }
        }

        return {
            message: cleanMessage,
            extractedData: {
                name: extractedData.name,
                quantityKg: extractedData.quantityKg,
                basePrice: extractedData.basePrice
            },
            isComplete: extractedData.isComplete || false
        };
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return {
            message: language === 'ta-IN' ? "மன்னிக்கவும், என்னால் இப்போது பதிலளிக்க முடியவில்லை." : "Sorry, I'm having trouble connecting right now.",
            extractedData: { name: null, quantityKg: null, basePrice: null },
            isComplete: false
        };
    }
}
