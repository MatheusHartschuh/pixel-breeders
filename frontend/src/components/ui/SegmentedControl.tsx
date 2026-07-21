import type { ReactNode } from "react";

import { Button } from "./Button";

export interface SegmentedControlOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

interface SegmentedControlProps<TValue extends string> {
  ariaLabel: string;
  value: TValue;
  options: readonly SegmentedControlOption<TValue>[];
  onChange: (value: TValue) => void;
}

export function SegmentedControl<TValue extends string>({ ariaLabel, value, options, onChange }: SegmentedControlProps<TValue>) {
  return (
    <div className="segmented-control" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant="segmented"
          active={value === option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
