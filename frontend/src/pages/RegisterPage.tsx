import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthPageLayout } from "../components/auth/AuthPageLayout";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../auth/AuthProvider";
import { getSafeRedirectPath } from "../lib/navigation";

function getNextPath(search: string): string {
  return getSafeRedirectPath(new URLSearchParams(search).get("next"));
}

export function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const nextPath = getNextPath(location.search);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Pixel Breeders | Criar conta";
  }, []);

  if (user) {
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

  return (
    <AuthPageLayout
      eyebrow="Cadastro"
      title="Crie sua conta e mantenha sua biblioteca pessoal"
      description="Depois do cadastro, suas avaliações ficam isoladas por usuário e você passa a ver apenas a sua lista de filmes avaliados."
      introActions={
        <>
          <Button variant="secondary" to="/">
            Voltar para a busca
          </Button>
          <Button variant="ghost" to={`/login?next=${encodeURIComponent(nextPath)}`}>
            Já tenho conta
          </Button>
        </>
      }
      cardTitle="Criar conta"
      cardDescription="Escolha um nome de usuário e uma senha para começar."
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
            autoComplete="new-password"
            placeholder="No mínimo 6 caracteres"
            required
          />
        </Field>

        <div className="auth-form__actions">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
          <Button variant="secondary" to={`/login?next=${encodeURIComponent(nextPath)}`}>
            Já tenho conta
          </Button>
        </div>

        {error ? <p className="feedback feedback--error">{error}</p> : null}
      </form>
    </AuthPageLayout>
  );
}
