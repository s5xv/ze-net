import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import RedirectHandler from './pages/RedirectHandler';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The clean Google-style Search Homepage */}
        <Route path="/" element={<Home />} />
        
        {/* The Search Results page */}
        <Route path="/search" element={<SearchResults />} />
        
        {/* The Dynamic Redirect Handler (Must be last to avoid catching other routes) */}
        <Route path="/:slug" element={<RedirectHandler />} />
        
        {/* Catch-all 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
