import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { buildAuthNextPath } from "../lib/navigation";
import { Button } from "../components/ui/Button";
import { LoginPage } from "../pages/LoginPage";
import { HomePage } from "../pages/HomePage";
import { MoviePage } from "../pages/MoviePage";
import { RatedPage } from "../pages/RatedPage";
import { RegisterPage } from "../pages/RegisterPage";
import { APP_BRAND, APP_NAV_ITEMS } from "./style";

function AppShell() {
  const location = useLocation();
  const { user, isCheckingSession, logout } = useAuth();
  const nextPath = encodeURIComponent(buildAuthNextPath(location.pathname, location.search));

  return (
    <div className="app-shell">
      <div className="app-shell__frame">
        <aside className="app-rail" aria-label="Navegação principal">
          <Link to="/" className="brand">
            <span className="brand__mark">{APP_BRAND.mark}</span>
            <span className="brand__text">
              <strong>{APP_BRAND.title}</strong>
              <small>{APP_BRAND.subtitle}</small>
            </span>
          </Link>

          <p className="app-rail__kicker">Descoberta editorial</p>

          <nav className="app-rail__nav">
            {APP_NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `app-rail__link ${isActive ? "is-active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="app-rail__footer">
            {user ? (
              <div className="app-rail__session">
                <span className="app-rail__session-label">Sessão</span>
                <strong>{user.username}</strong>
                <small>{isCheckingSession ? "Validando acesso" : "Acesso ativo"}</small>
                <Button variant="danger" type="button" onClick={logout}>
                  Sair
                </Button>
              </div>
            ) : (
              <div className="app-rail__auth">
                <span className="app-rail__session-label">Acesso</span>
                <p>Entre para salvar sua coleção pessoal e manter suas notas sincronizadas.</p>
                <div className="app-rail__auth-actions">
                  <Button variant="primary" to={`/login?next=${nextPath}`}>
                    Entrar
                  </Button>
                  <Button variant="secondary" to={`/register?next=${nextPath}`}>
                    Criar conta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>

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
