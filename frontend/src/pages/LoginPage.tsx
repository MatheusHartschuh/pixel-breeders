import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthLoadingState } from "../components/auth/AuthLoadingState";
import { AuthPageLayout } from "../components/auth/AuthPageLayout";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../auth/AuthProvider";
import { getSafeRedirectPath } from "../lib/navigation";

function getNextPath(search: string): string {
  return getSafeRedirectPath(new URLSearchParams(search).get("next"));
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user, isCheckingSession } = useAuth();
  const nextPath = getNextPath(location.search);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Pixel Breeders | Entrar";
  }, []);

  if (user && !isCheckingSession) {
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({
        username,
        password,
      });
      navigate(nextPath, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  if (isCheckingSession && user) {
    return <AuthLoadingState title="Verificando sessão" description="Estamos validando seu acesso atual." />;
  }

  return (
    <AuthPageLayout
      eyebrow="Acesso"
      title="Entre para salvar suas avaliações"
      description="O login libera as rotas protegidas do projeto e mantém suas notas vinculadas à sua conta em todos os dispositivos."
      introActions={
        <>
          <Button variant="secondary" to="/">
            Voltar para a busca
          </Button>
          <Button variant="ghost" to={`/register?next=${encodeURIComponent(nextPath)}`}>
            Criar conta
          </Button>
        </>
      }
      cardTitle="Entrar"
      cardDescription="Use seu nome de usuário e senha para continuar."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field variant="auth" label="Usuário">
          <input
            className="auth-form__input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="ex: Nome"
            required
          />
        </Field>

        <Field variant="auth" label="Senha">
          <input
            className="auth-form__input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Sua senha"
            required
          />
        </Field>

        <div className="auth-form__actions">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <Button variant="secondary" to={`/register?next=${encodeURIComponent(nextPath)}`}>
            Criar conta
          </Button>
        </div>

        {error ? <p className="feedback feedback--error">{error}</p> : null}
      </form>
    </AuthPageLayout>
  );
}
