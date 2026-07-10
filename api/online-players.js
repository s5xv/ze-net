export default async function handler(req, res) {
  try {
    const response = await fetch('https://map.democracycraft.net/maps/reveille/live/players.json', {
      headers: { 'User-Agent': 'Z&ENet/1.0' }
    });
    
    if (!response.ok) {
      return res.status(200).json({ players: [] });
    }
    
    const data = await response.json();
    return res.status(200).json({ players: data.players || [] });
  } catch (error) {
    return res.status(200).json({ players: [] });
  }
}
