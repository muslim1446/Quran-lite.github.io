export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1. Get User Analytics from the Frontend
    const userData = await request.json();
    
    // If not enough data, return empty to hide the section
    if (!userData.reads || userData.reads.length < 2) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Construct the AI Prompt
    // We summarize the last 10 reads and last 5 searches to keep the prompt efficient
    const recentReads = userData.reads.slice(-10).join(", ");
    const recentSearches = userData.searches ? userData.searches.slice(-5).join(", ") : "none";

    const prompt = `
      You are an Islamic Quran recommendation algorithm. 
      Analyze this user's activity:
      - Recently read Surah IDs: [${recentReads}]
      - Recent Search topics: [${recentSearches}]

      Based on the themes, emotions, and topics of these Surahs/searches, recommend 6 Surah IDs that this user would benefit from reading next.
      
      Rules:
      1. Do not recommend Surahs they just read (try to find related but new ones).
      2. If they search for "law", suggest legal Surahs (e.g., 2, 4). If "stories", suggest 12, 18, etc.
      3. RETURN ONLY A RAW JSON ARRAY of integers. No text, no explanation.
      Example format: [1, 55, 67, 18, 93, 94]
    `;

    // 3. Run AI Model (Using Llama-3-8b-instruct or similar available in your CF account)
    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    // 4. Parse AI Response (Clean up any potential text noise)
    let aiText = response.response.trim();
    // specific cleanup to ensure we just get the array
    const arrayMatch = aiText.match(/\[.*?\]/);
    if (arrayMatch) {
      aiText = arrayMatch[0];
    }

    return new Response(aiText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify([]), { status: 500 });
  }
}
