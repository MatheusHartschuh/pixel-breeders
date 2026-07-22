import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { ThemeProvider, applyThemePreference, readThemePreference } from "./theme/ThemeProvider";
import "./styles/colors.css";
import "./styles/base.css";
import "./styles/search.css";
import "./styles/movie.css";
import "./styles/ui.css";
import "./styles/responsive.css";

applyThemePreference(readThemePreference());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
