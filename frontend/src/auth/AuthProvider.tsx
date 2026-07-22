import { createContext, useEffect, useContext, useState, type ReactNode } from "react";

import { getMe, login as loginRequest, register as registerRequest } from "../api";
import type { AuthCredentials, AuthUser } from "../types";
import { clearAuthSession, readAuthSession, writeAuthSession, type AuthSession } from "./storage";

type AuthContextValue = {
  user: AuthUser | null;
  isCheckingSession: boolean;
  isAuthenticated: boolean;
  login: (payload: AuthCredentials) => Promise<AuthUser>;
  register: (payload: AuthCredentials) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setSession(session: AuthSession | null, setSessionState: (value: AuthSession | null) => void): void {
  if (session === null) {
    clearAuthSession();
    setSessionState(null);
    return;
  }

  writeAuthSession(session);
  setSessionState(session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => readAuthSession());
  const [isCheckingSession, setIsCheckingSession] = useState(() => session !== null);
  const user = session?.user ?? null;
  const bootToken = session?.token ?? null;

  useEffect(() => {
    let isActive = true;

    async function validateSession() {
      if (session === null) {
        setIsCheckingSession(false);
        return;
      }

      setIsCheckingSession(true);

      try {
        const currentUser = await getMe();
        if (!isActive) {
          return;
        }

        setSessionState((currentSession) => {
          if (currentSession === null || currentSession.token !== bootToken) {
            return currentSession;
          }

          return { token: currentSession.token, user: currentUser };
        });
      } catch {
        if (!isActive) {
          return;
        }

        setSessionState((currentSession) => {
          if (currentSession === null || currentSession.token !== bootToken) {
            return currentSession;
          }

          clearAuthSession();
          return null;
        });
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    void validateSession();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogin(payload: AuthCredentials): Promise<AuthUser> {
    const response = await loginRequest(payload);
    setSession(
      {
        token: response.access_token,
        user: response.user,
      },
      setSessionState,
    );
    return response.user;
  }

  async function handleRegister(payload: AuthCredentials): Promise<AuthUser> {
    const response = await registerRequest(payload);
    setSession(
      {
        token: response.access_token,
        user: response.user,
      },
      setSessionState,
    );
    return response.user;
  }

  function handleLogout() {
    setSession(null, setSessionState);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isCheckingSession,
        isAuthenticated: user !== null,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  }

  return context;
}
