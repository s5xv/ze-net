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
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ 
        summary: "⚠️ AI is ready, but the MISTRAL_API_KEY is missing! Go to Vercel Dashboard > Settings > Environment Variables and add it." 
      });
    }

    const resultsText = results.slice(0, 30).map((r, i) => {
      const name = r.name || r.title || 'Unknown';
      const desc = r.description || r.content || 'No description';
      const type = r.category ? 'Site' : (r.content ? 'Wiki' : 'Department');
      return `${i+1}. [${type}] **${name}**: ${desc.substring(0, 200)}`;
    }).join('\n');

    const prompt = `You are the 'Z&E Net AI Search Assistant', an expert navigation tool for the DemocracyCraft Minecraft server directory.

User Query: "${query}"

Database Results:
${resultsText}

Instructions:
1. STRICT RELEVANCE: Analyze the query. Discard results where the query word only appears as a substring in an unrelated word.
2. COMPREHENSIVE LISTING: If the user is searching for a category (like "departments", "shops", "banks"), you MUST list ALL relevant items found in the database results. Do not just pick two.
3. SYNTHESIS: Write a highly engaging summary. Start directly with the answer. Mention the specific names of the best matching sites, wiki pages, or departments.
4. FORMATTING: Use bold text (markdown) for the names of the sites/departments to make them pop.
5. ZERO HALLUCINATION: ONLY use the provided database results. Never invent information.
6. NO RESULTS: If absolutely nothing matches, reply exactly with: "I couldn't find anything specifically about '${query}' in the Z&E Net directory."

Output ONLY the final summary text. Do not include any introductory phrases.`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';
    const sources = results.slice(0, 5).map(r => r.name || r.title).filter(Boolean);
    
    res.status(200).json({ summary, sources });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(200).json({ summary: `⚠️ AI Error: ${error.message}` });
  }
}
