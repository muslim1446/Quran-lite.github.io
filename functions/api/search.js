export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    // specific system prompt to force JSON output and map concepts to Surah numbers
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
      const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      // The AI might occasionally wrap code in backticks, clean it
      let rawText = response.response;
      // Extract array using regex if AI chats too much
      const match = rawText.match(/\[[\s\d,]*\]/);
      if (match) {
         rawText = match[0];
      }

      return new Response(rawText, {
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      return new Response(JSON.stringify([]), { status: 500 });
    }
  }
