import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Designer from './pages/Designer';
import Industry from './pages/Industry';
import Success from './pages/Success';
import Cancel from './pages/Cancel';
import './styles.css';

/**
 * Catch-all: maps old static-site URLs (/design.html, /cafes.html) onto the
 * clean routes so links printed before the re-platform keep working, then
 * hands industry slugs to <Industry> (which redirects unknowns home).
 */
function SlugOrLegacy() {
  const loc = useLocation();
  if (/\.html$/.test(loc.pathname)) {
    const target = loc.pathname.replace(/\.html$/, '');
    return <Navigate to={{ pathname: target === '/index' ? '/' : target, search: loc.search }} replace />;
  }
  return <Industry />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/design" element={<Designer />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/:slug" element={<SlugOrLegacy />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
