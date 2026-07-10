export default async function handler(req, res) {
  const { uuid } = req.query;
  
  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }
  
  try {
    const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, {
      headers: { 'User-Agent': 'Z&ENet/1.0' }
    });
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const data = await response.json();
    return res.status(200).json({ name: data.name, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
