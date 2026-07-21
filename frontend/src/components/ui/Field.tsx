import type { ReactNode } from "react";

type FieldVariant = "auth" | "filter";

interface FieldProps {
  label: ReactNode;
  variant: FieldVariant;
  children: ReactNode;
  className?: string;
}

const FIELD_CLASSNAMES: Record<FieldVariant, string> = {
  auth: "auth-form__field",
  filter: "search-filters__field",
};

export function Field({ label, variant, className = "", children }: FieldProps) {
  return (
    <label className={`${FIELD_CLASSNAMES[variant]} ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}
