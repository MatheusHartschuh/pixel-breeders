import { useEffect, useId, useRef, useState } from "react";

export interface GenreSelectOption {
  id: number;
  label: string;
}

interface GenreSelectProps {
  value: string;
  allLabel: string;
  ariaLabel: string;
  options: readonly GenreSelectOption[];
  onChange: (value: string) => void;
}

export function GenreSelect({ value, allLabel, ariaLabel, options, onChange }: GenreSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const selectedLabel = options.find((option) => String(option.id) === value)?.label ?? allLabel;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="genre-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`button button--secondary genre-select__trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="genre-select__trigger-label">{selectedLabel}</span>
        <span className="genre-select__caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="genre-select__menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            className={`genre-select__option ${value === "" ? "is-selected" : ""}`}
            onClick={() => handleSelect("")}
          >
            {allLabel}
          </button>
          {options.map((option) => {
            const optionValue = String(option.id);
            const selected = value === optionValue;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`genre-select__option ${selected ? "is-selected" : ""}`}
                onClick={() => handleSelect(optionValue)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
