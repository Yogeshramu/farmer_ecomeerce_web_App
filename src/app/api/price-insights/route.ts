import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { cropName } = await req.json();
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        const today = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = dayNames[today.getDay()];
        const currentDate = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

        // Build last 6 months labels
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
        }

        const systemPrompt = `You are an Indian agricultural market expert specializing in Tamil Nadu crop pricing. 
You have access to real market data from APMC (Agricultural Produce Market Committee) mandis, especially Chennai, Coimbatore, Madurai, and Trichy markets. 
Return ONLY valid JSON. No explanation text. No markdown. Just pure JSON.`;

        const userPrompt = `Provide realistic Indian market price data for "${cropName}" crop.
Return exactly this JSON structure (all prices in ₹ per kg, Indian market):
{
  "currentPrice": <number>,
  "minPrice": <number>,
  "maxPrice": <number>,
  "trend": "rising" | "falling" | "stable",
  "trendPercent": <number like 5.2>,
  "recommendation": "<15-25 word actionable advice for the farmer in simple English>",
  "recommendationTamil": "<same advice in Tamil>",
  "monthlyPrices": [
    { "month": "${months[0]}", "price": <number>, "marketAvg": <number> },
    { "month": "${months[1]}", "price": <number>, "marketAvg": <number> },
    { "month": "${months[2]}", "price": <number>, "marketAvg": <number> },
    { "month": "${months[3]}", "price": <number>, "marketAvg": <number> },
    { "month": "${months[4]}", "price": <number>, "marketAvg": <number> },
    { "month": "${months[5]}", "price": <number>, "marketAvg": <number> }
  ],
  "weeklyPrices": [
    { "day": "Mon", "wholesale": <number>, "retail": <number> },
    { "day": "Tue", "wholesale": <number>, "retail": <number> },
    { "day": "Wed", "wholesale": <number>, "retail": <number> },
    { "day": "Thu", "wholesale": <number>, "retail": <number> },
    { "day": "Fri", "wholesale": <number>, "retail": <number> },
    { "day": "Sat", "wholesale": <number>, "retail": <number> },
    { "day": "Sun", "wholesale": <number>, "retail": <number> }
  ],
  "marketComparison": [
    { "market": "Chennai", "price": <number> },
    { "market": "Coimbatore", "price": <number> },
    { "market": "Madurai", "price": <number> },
    { "market": "Trichy", "price": <number> },
    { "market": "Salem", "price": <number> }
  ],
  "bestMarket": "<market name>"
}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1200
            })
        });

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';

        // Extract JSON from the response
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Groq response');
        }

        const priceData = JSON.parse(jsonMatch[0]);

        // Compute bestTimeToSell from weeklyPrices — pick the day with highest wholesale price
        const dayFullNames: Record<string, string> = {
            Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
            Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
        };
        const dayTimings: Record<string, string> = {
            Mon: '7:00 AM', Tue: '6:00 AM', Wed: '7:00 AM',
            Thu: '6:00 AM', Fri: '7:00 AM', Sat: '6:00 AM', Sun: '8:00 AM'
        };
        if (priceData.weeklyPrices?.length) {
            const best = priceData.weeklyPrices.reduce((a: any, b: any) => b.wholesale > a.wholesale ? b : a);
            priceData.bestTimeToSell = `${dayFullNames[best.day] ?? best.day} ${dayTimings[best.day] ?? '7:00 AM'} (₹${best.wholesale}/kg)`;
        }

        return NextResponse.json({ success: true, data: priceData, cropName });

    } catch (error) {
        console.error('Price Insights Error:', error);
        return NextResponse.json({ error: 'Failed to fetch price insights' }, { status: 500 });
    }
}
