export async function onRequest(context) {
    const { request, env } = context;

    // 1. DEFINE CORS HEADERS
    // This tells the browser: "It is okay to accept data from any website (*)"
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. HANDLE PREFLIGHT REQUESTS (Browser Security Check)
    // Browsers send an "OPTIONS" request first to check if it's safe.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    // Return empty array if query is too short
    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), { 
          headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
          } 
      });
    }

    const systemPrompt = `
      You are a Quranic Search Engine API.
      Your goal is to accept a User Query (which might be a topic, a story, a specific name with typos, or a concept) and return the most relevant Surah numbers.
      
      Rules:
      1. You must return ONLY a raw JSON array of integers (Surah numbers 1-114).
      2. No markdown, no explanation, no conversational text.
      3. Handle typos (e.g. "Alfatih" -> 1).
      4. Handle topics (e.g. "Alcohol" -> [5, 2, 4]).
      5. Handle stories (e.g. "Moses sea" -> [26, 20, 10]).
      6. Limit results to the top 5 most relevant.
    `;

    const userPrompt = `User Query: "${query}"`;

    try {
      // 3. RUN AI MODEL
      const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      let rawText = response.response;
      
      // Clean up AI output if it adds markdown code blocks
      const match = rawText.match(/\[[\s\d,]*\]/);
      if (match) {
         rawText = match[0];
      }

      // 4. RETURN RESPONSE WITH HEADERS
      return new Response(rawText, {
        headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
        }
      });

    } catch (e) {
      // Return error with headers so the frontend can see it
      return new Response(JSON.stringify([]), { 
          status: 500,
          headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
          } 
      });
    }
}
