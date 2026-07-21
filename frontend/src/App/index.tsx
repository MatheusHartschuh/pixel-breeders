import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { buildAuthNextPath } from "../lib/navigation";
import { LoginPage } from "../pages/LoginPage";
import { HomePage } from "../pages/HomePage";
import { MoviePage } from "../pages/MoviePage";
import { RatedPage } from "../pages/RatedPage";
import { RegisterPage } from "../pages/RegisterPage";
import { APP_BRAND, APP_NAV_ITEMS, APP_SHELL_ORB_CLASSES } from "./style";

function AppShell() {
  const location = useLocation();
  const { user, isCheckingSession, logout } = useAuth();
  const nextPath = encodeURIComponent(buildAuthNextPath(location.pathname, location.search));

  const authActions = user ? (
    <div className="site-header__actions">
      <div className="site-header__user">
        <span className="site-header__user-label">Sessão</span>
        <strong>{user.username}</strong>
        <small>{isCheckingSession ? "Validando..." : "Ativa"}</small>
      </div>
      <button className="button button--secondary" type="button" onClick={logout}>
        Sair
      </button>
    </div>
  ) : (
    <div className="site-header__actions">
      <Link className="button button--secondary" to={`/login?next=${nextPath}`}>
        Entrar
      </Link>
      <Link className="button button--primary" to={`/register?next=${nextPath}`}>
        Criar conta
      </Link>
    </div>
  );

  return (
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

        {authActions}
      </header>

      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movie/:movieId" element={<MoviePage />} />
          <Route path="/rated" element={<RatedPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
