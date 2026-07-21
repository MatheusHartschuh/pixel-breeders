import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

function setSession(session: AuthSession | null, setUser: (value: AuthUser | null) => void): void {
  if (session === null) {
    clearAuthSession();
    setUser(null);
    return;
  }

  writeAuthSession(session);
  setUser(session.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedSession = readAuthSession();
  const [user, setUser] = useState<AuthUser | null>(storedSession?.user ?? null);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(storedSession));

  useEffect(() => {
    if (!storedSession) {
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;
    const verificationToken = storedSession.token;
    const finishIfCurrentSession = () => {
      const activeSession = readAuthSession();
      if (isMounted && activeSession?.token === verificationToken) {
        setIsCheckingSession(false);
      }
    };

    getMe()
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }

        const activeSession = readAuthSession();
        if (activeSession?.token !== verificationToken) {
          return;
        }

        setSession(
          {
            token: storedSession.token,
            user: currentUser,
          },
          setUser,
        );
      })
      .catch((requestError) => {
        if (!isMounted) {
          return;
        }

        const activeSession = readAuthSession();
        if (activeSession?.token !== verificationToken) {
          return;
        }

        const message = requestError instanceof Error ? requestError.message : "";
        if (message.includes("Autenticação obrigatória") || message.includes("Token inválido ou expirado")) {
          clearAuthSession();
          setUser(null);
          setIsCheckingSession(false);
        }
      })
      .finally(finishIfCurrentSession);

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogin(payload: AuthCredentials): Promise<AuthUser> {
    const response = await loginRequest(payload);
    setIsCheckingSession(false);
    setSession(
      {
        token: response.access_token,
        user: response.user,
      },
      setUser,
    );
    return response.user;
  }

  async function handleRegister(payload: AuthCredentials): Promise<AuthUser> {
    const response = await registerRequest(payload);
    setIsCheckingSession(false);
    setSession(
      {
        token: response.access_token,
        user: response.user,
      },
      setUser,
    );
    return response.user;
  }

  function handleLogout() {
    setIsCheckingSession(false);
    setSession(null, setUser);
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
