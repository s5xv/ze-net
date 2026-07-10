// Add this function to the existing Admin.jsx file
// Add this button in the admin dashboard UI:

const handleSendWeeklyAnalytics = async () => {
  try {
    const res = await fetch('/api/weekly-analytics', { method: 'POST' });
    const data = await res.json();
    if (data.success) alert('Weekly analytics sent to Discord!');
    else alert('Error: ' + data.error);
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// Add this button somewhere in the admin UI:
// <button onClick={handleSendWeeklyAnalytics} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
//   Send Weekly Analytics
// </button>
