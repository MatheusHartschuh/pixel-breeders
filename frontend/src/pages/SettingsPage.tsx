import { useEffect } from "react";

import { useTheme, type ThemeMode } from "../theme/ThemeProvider";
import { Page } from "../components/layout/Page";
import { Panel } from "../components/layout/Panel";
import { SectionHeader } from "../components/layout/SectionHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ptBR } from "../i18n";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: ptBR.settings.themeOptions.dark },
  { value: "light", label: ptBR.settings.themeOptions.light },
];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    document.title = ptBR.settings.documentTitle;
  }, []);

  return (
    <Page className="settings-page">
      <section className="results-section">
        <SectionHeader
          eyebrow={ptBR.settings.section.eyebrow}
          title={ptBR.settings.section.title}
          titleAs="h1"
        />

        <Panel
          title={ptBR.settings.panel.title}
          description={ptBR.settings.panel.description}
          className="settings-panel"
        >
          <div className="settings-theme">
            <div className="settings-theme__summary">
              <span className="settings-theme__label">{ptBR.settings.panel.activeThemeLabel}</span>
              <strong>{theme === "dark" ? ptBR.settings.themeOptions.dark : ptBR.settings.themeOptions.light}</strong>
              <p>{ptBR.settings.panel.persistMessage}</p>
            </div>

            <SegmentedControl<ThemeMode>
              ariaLabel={ptBR.settings.ariaLabel}
              value={theme}
              onChange={setTheme}
              options={THEME_OPTIONS}
            />
          </div>
        </Panel>
      </section>
    </Page>
  );
}
