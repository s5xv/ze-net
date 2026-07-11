export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, results } = req.body;

  if (!query || !results || results.length === 0) {
    return res.status(400).json({ error: 'Missing query or results' });
  }

  try {
    // Format the results for the AI
    const sitesText = results.slice(0, 5).map((site, i) => {
      return `${i + 1}. ${site.name} (${site.category})\n   ${site.description || 'No description'}`;
    }).join('\n\n');

    const prompt = `Based on the search query "${query}" and these search results from a Minecraft server directory:\n\n${sitesText}\n\nProvide a brief 2-3 sentence summary of what the user can find. Be helpful and concise.`;

    // Use Google Gemini (FREE)
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary';

    res.status(200).json({ summary });
  } catch (error) {
    console.error('AI Summary Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}
