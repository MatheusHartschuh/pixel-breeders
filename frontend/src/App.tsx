import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import { MoviePage } from "./pages/MoviePage";
import { RatedPage } from "./pages/RatedPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-shell__orb app-shell__orb--one" />
        <div className="app-shell__orb app-shell__orb--two" />

        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand__mark">PB</span>
            <span className="brand__text">
              <strong>Pixel Breeders</strong>
              <small>Filmes, notas e memória</small>
            </span>
          </Link>

          <nav className="site-nav">
            <NavLink to="/" end className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`}>
              Busca
            </NavLink>
            <NavLink to="/rated" className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`}>
              Avaliados
            </NavLink>
          </nav>
        </header>

        <main className="app-shell__main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movie/:movieId" element={<MoviePage />} />
            <Route path="/rated" element={<RatedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
