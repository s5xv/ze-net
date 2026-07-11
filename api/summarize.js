export default async function handler(req, res) {
  // Allow CORS
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
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel' });

    // Format the data for the AI
    const sitesText = results.slice(0, 5).map((s, i) => `${i+1}. ${s.name} (${s.category}): ${s.description || 'No description'}`).join('\n');
    const prompt = `Based on the search query "${query}" and these results:\n${sitesText}\n\nProvide a helpful 2-3 sentence summary of what the user can find.`;

    // Call FREE Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary.';
    res.status(200).json({ summary });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
}
