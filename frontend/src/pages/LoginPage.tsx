import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthPageLayout } from "../components/auth/AuthPageLayout";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../auth/AuthProvider";
import { getSafeRedirectPath } from "../lib/navigation";
import { ptBR } from "../i18n";

const LOGIN = ptBR.auth.login;

function getNextPath(search: string): string {
  return getSafeRedirectPath(new URLSearchParams(search).get("next"));
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const nextPath = getNextPath(location.search);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = LOGIN.documentTitle;
  }, []);

  if (user) {
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
      setError(requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericLoginError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout
      eyebrow={LOGIN.eyebrow}
      title={LOGIN.title}
      description={LOGIN.description}
      introActions={
        <>
          <Button variant="secondary" to="/">
            {LOGIN.introBackToSearch}
          </Button>
          <Button variant="ghost" to={`/register?next=${encodeURIComponent(nextPath)}`}>
            {LOGIN.introCreateAccount}
          </Button>
        </>
      }
      cardTitle={LOGIN.cardTitle}
      cardDescription={LOGIN.cardDescription}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field variant="auth" label={LOGIN.usernameLabel}>
          <input
            className="auth-form__input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder={LOGIN.usernamePlaceholder}
            required
          />
        </Field>

        <Field variant="auth" label={LOGIN.passwordLabel}>
          <input
            className="auth-form__input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder={LOGIN.passwordPlaceholder}
            required
          />
        </Field>

        <div className="auth-form__actions">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? LOGIN.submitLoading : LOGIN.submitIdle}
          </Button>
          <Button variant="secondary" to={`/register?next=${encodeURIComponent(nextPath)}`}>
            {LOGIN.introCreateAccount}
          </Button>
        </div>

        {error ? <p className="feedback feedback--error">{error}</p> : null}
      </form>
    </AuthPageLayout>
  );
}
