// Test script to check BlueMap API
fetch('https://map.democracycraft.net/maps/reveille/live/players.json')
  .then(r => r.json())
  .then(d => console.log('Players:', d.players?.length || 0))
  .catch(e => console.error('Error:', e));
