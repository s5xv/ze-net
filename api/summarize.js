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

    // Format results for AI
    const resultsText = results.slice(0, 10).map((r, i) => {
      const name = r.name || r.title || 'Unknown';
      const desc = r.description || r.content || 'No description';
      const type = r.category ? 'Site' : (r.content ? 'Wiki' : 'Department');
      return `${i+1}. [${type}] ${name}: ${desc.substring(0, 200)}`;
    }).join('\n');

    // Smarter prompt: Filter THEN summarize
    const prompt = `You are a search result filter and summarizer. Given the search query "${query}" and these search results:

${resultsText}

TASK:
1. First, identify which results are ACTUALLY relevant to the query "${query}". Ignore results that only contain the search term as a substring in unrelated words (e.g., if searching "ai", ignore results about "aiming", "details", "certain", etc.).
2. If NO results are truly relevant, say: "No relevant results found for '${query}'. The results shown contain the term but are not directly related."
3. If some results ARE relevant, provide a 2-3 sentence summary of what the user can find, focusing only on the relevant results.

Be strict about relevance. Only include results that are genuinely about the search topic.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.3 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary.';
    res.status(200).json({ summary });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(200).json({ summary: `⚠️ AI Error: ${error.message}` });
  }
}
