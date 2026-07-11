export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, results } = req.body;
  if (!query || !results || results.length === 0) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ 
        summary: "⚠️ AI is ready, but the GEMINI_API_KEY is missing! Go to Vercel Dashboard > Settings > Environment Variables and add it to see real summaries." 
      });
    }

    // Format results for AI - be very explicit about what data is available
    const resultsText = results.slice(0, 10).map((r, i) => {
      const name = r.name || r.title || 'Unknown';
      const desc = r.description || r.content || 'No description';
      const type = r.category ? 'Site' : (r.content ? 'Wiki' : 'Department');
      return `${i+1}. [${type}] ${name}: ${desc.substring(0, 200)}`;
    }).join('\n');

    // STRICT prompt: Only use provided data, filter irrelevant results
    const prompt = `You are a search result assistant for a Minecraft server directory called "Z&E Net" for the DemocracyCraft server.

Search query: "${query}"

Available results from the database:
${resultsText}

IMPORTANT RULES:
1. ONLY use the results provided above. Do not make up information or use external knowledge.
2. Identify which results are TRULY relevant to "${query}". Ignore results where the search term only appears as a substring in unrelated words (e.g., if searching "ai", ignore "aiming", "details", "certain", etc.).
3. If NO results are truly relevant, respond with: "No relevant results found for '${query}' in the Z&E Net directory."
4. If some results ARE relevant, provide a concise 2-3 sentence summary of what the user can find, mentioning the specific relevant results by name.
5. Keep the summary focused and helpful. Do not mention irrelevant results.

Respond ONLY with the summary text, no extra formatting.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.2 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary.';
    
    // Also return source names for the UI
    const sources = results.slice(0, 5).map(r => r.name || r.title).filter(Boolean);
    
    res.status(200).json({ summary, sources });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(200).json({ summary: `⚠️ AI Error: ${error.message}` });
  }
}
