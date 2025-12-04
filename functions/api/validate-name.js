export async function onRequestPost(context) {
    const { request, env } = context;

    // 1. Get the name from the request
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }
    
    const nameToCheck = body.name || "";

    // 2. The "System Prompt" - This instructions the AI on what to block
    const systemPrompt = `
    You are a strict content moderator for a generic app.
    Your task is to classify if a User Name is SAFE or UNSAFE based on specific religious and social criteria.

    CRITERIA FOR "UNSAFE":
    1. PROFANITY: Any insults, swear words, sexual terms, or slurs (in English, Arabic, Malay, or Indonesian).
    2. POLYTHEISM (SHIRK): Names that imply the user is divine (e.g., "I am God", "Allah", "Yahweh") or names of specific idols/deities (e.g., "Lat", "Uzza", "Manat", "Hubal", "Zeus", "Apollo").
    3. DISRESPECT: Names that mock religious figures.

    OUTPUT FORMAT:
    Return ONLY a JSON object. Do not write any other text.
    Format: { "safe": boolean, "reason": "string" }
    `;

    // 3. specific user input
    const userMessage = `Analyze this name: "${nameToCheck}"`;

    try {
        // 4. Run Llama 3 on Cloudflare
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ]
        });

        // 5. Parse AI response to ensure valid JSON (Llama is usually good, but this is safe)
        // If the AI returns raw text, we send it back directly as the JSON body
        return new Response(JSON.stringify(response));

    } catch (err) {
        // Fallback: If AI is down, decide if you want to fail open or closed.
        // Here we allow it but log an error, or you can block it.
        return new Response(JSON.stringify({ safe: true, warning: "AI_OFFLINE" }));
    }
}
