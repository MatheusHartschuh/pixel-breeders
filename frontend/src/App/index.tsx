import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

import { HomePage } from "../pages/HomePage";
import { MoviePage } from "../pages/MoviePage";
import { RatedPage } from "../pages/RatedPage";
import { APP_BRAND, APP_NAV_ITEMS, APP_SHELL_ORB_CLASSES } from "./style";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {APP_SHELL_ORB_CLASSES.map((className) => (
          <div key={className} className={className} />
        ))}

        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand__mark">{APP_BRAND.mark}</span>
            <span className="brand__text">
              <strong>{APP_BRAND.title}</strong>
              <small>{APP_BRAND.subtitle}</small>
            </span>
          </Link>

          <nav className="site-nav">
            {APP_NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `site-nav__link ${isActive ? "is-active" : ""}`}>
                {label}
              </NavLink>
            ))}
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
