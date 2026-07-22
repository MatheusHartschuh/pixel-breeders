import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthPageLayout } from "../components/auth/AuthPageLayout";
import { AuthLoadingState } from "../components/auth/AuthLoadingState";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../auth/AuthProvider";
import { getSafeRedirectPath } from "../lib/navigation";
import { ptBR } from "../i18n";

const REGISTER = ptBR.auth.register;

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
    document.title = REGISTER.documentTitle;
  }, []);

  if (isCheckingSession) {
    return <AuthLoadingState title={ptBR.common.labels.loadingSession} description={ptBR.app.rail.validating} />;
  }

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
      setError(requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericRegisterError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout
      eyebrow={REGISTER.eyebrow}
      title={REGISTER.title}
      description={REGISTER.description}
      introActions={
        <>
          <Button variant="secondary" to="/">
            {REGISTER.introBackToSearch}
          </Button>
          <Button variant="ghost" to={`/login?next=${encodeURIComponent(nextPath)}`}>
            {REGISTER.introHaveAccount}
          </Button>
        </>
      }
      cardTitle={REGISTER.cardTitle}
      cardDescription={REGISTER.cardDescription}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field variant="auth" label={REGISTER.usernameLabel}>
          <input
            className="auth-form__input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder={REGISTER.usernamePlaceholder}
            required
          />
        </Field>

        <Field variant="auth" label={REGISTER.passwordLabel}>
          <input
            className="auth-form__input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={REGISTER.passwordPlaceholder}
            required
          />
        </Field>

        <div className="auth-form__actions">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? REGISTER.submitLoading : REGISTER.submitIdle}
          </Button>
          <Button variant="secondary" to={`/login?next=${encodeURIComponent(nextPath)}`}>
            {REGISTER.introHaveAccount}
          </Button>
        </div>

        {error ? <p className="feedback feedback--error">{error}</p> : null}
      </form>
    </AuthPageLayout>
  );
}
