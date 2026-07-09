export default async function handler(req, res) {
  const BLUEMAP_URL = 'https://map.democracycraft.net/maps/reveille/live/players.json';

  try {
    const response = await fetch(BLUEMAP_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZENet/1.0)'
      }
    });

    if (!response.ok) {
      return res.status(200).json({ online: false, players: 0 });
    }

    const data = await response.json();
    const players = data.players || [];

    return res.status(200).json({
      online: true,
      players: players.length
    });
  } catch (error) {
    console.error('Server status error:', error);
    return res.status(200).json({ online: false, players: 0 });
  }
}
