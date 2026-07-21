import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { getSafeRedirectPath } from "../lib/navigation";

function getNextPath(search: string): string {
  return getSafeRedirectPath(new URLSearchParams(search).get("next"));
}

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, user, isCheckingSession } = useAuth();
  const nextPath = getNextPath(location.search);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Pixel Breeders | Criar conta";
  }, []);

  if (user && !isCheckingSession) {
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await register({
        username,
        password,
      });
      navigate(nextPath, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível criar a conta");
    } finally {
      setLoading(false);
    }
  }

  if (isCheckingSession && user) {
    return <AuthLoadingState title="Verificando sessão" description="Estamos validando seu acesso atual." />;
  }

  return (
    <div className="page">
      <section className="auth-page">
        <div className="auth-page__intro">
          <span className="eyebrow">Cadastro</span>
          <h1>Crie sua conta e mantenha sua biblioteca pessoal</h1>
          <p>
            Depois do cadastro, suas avaliações ficam isoladas por usuário e você passa a ver apenas a sua lista de
            filmes avaliados.
          </p>
          <div className="auth-page__links">
            <Link className="button button--secondary" to="/">
              Voltar para a busca
            </Link>
            <Link className="button button--ghost" to={`/login?next=${encodeURIComponent(nextPath)}`}>
              Já tenho conta
            </Link>
          </div>
        </div>

        <section className="panel auth-card">
          <div className="panel__header">
            <div>
              <h2>Criar conta</h2>
              <p>Escolha um nome de usuário e uma senha para começar.</p>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__field">
              <span>Usuário</span>
              <input
                className="auth-form__input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="ex: Nome"
                required
              />
            </label>

            <label className="auth-form__field">
              <span>Senha</span>
              <input
                className="auth-form__input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="No mínimo 6 caracteres"
                required
              />
            </label>

            <div className="auth-form__actions">
              <button className="button button--primary" type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar conta"}
              </button>
              <Link className="button button--secondary" to={`/login?next=${encodeURIComponent(nextPath)}`}>
                Já tenho conta
              </Link>
            </div>

            {error ? <p className="feedback feedback--error">{error}</p> : null}
          </form>
        </section>
      </section>
    </div>
  );
}

function AuthLoadingState({ title, description }: { title: string; description: string }) {
  return (
    <div className="page">
      <section className="empty-state empty-state--large">
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </div>
  );
}
