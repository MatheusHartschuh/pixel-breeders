import { useEffect, useState, type FormEvent } from "react";

import { ptBR } from "../../../i18n";
import { Button } from "../Button";
import { Field } from "../Field";
import { PAGINATION_CONTROLS_CLASSNAMES, PAGINATION_JUMP_MAX_LENGTH } from "./style";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToPage: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  isLoading,
  onPrevious,
  onNext,
  onJumpToPage,
}: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const canNavigate = totalPages > 1;
  const currentPageLabel = ptBR.home.pagination.pageOf(currentPage, totalPages);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage, totalPages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(pageInput);
    if (!Number.isInteger(parsed)) {
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    if (nextPage !== currentPage) {
      onJumpToPage(nextPage);
    }
  }

  function handleChange(value: string) {
    setPageInput(value.replace(/\D/g, "").slice(0, PAGINATION_JUMP_MAX_LENGTH));
  }

  return (
    <div className={PAGINATION_CONTROLS_CLASSNAMES.root}>
      <Button variant="secondary" type="button" disabled={currentPage <= 1 || isLoading} onClick={onPrevious}>
        {ptBR.common.buttons.previous}
      </Button>

      <span className={PAGINATION_CONTROLS_CLASSNAMES.meta}>{currentPageLabel}</span>

      <form className={PAGINATION_CONTROLS_CLASSNAMES.jumpForm} onSubmit={handleSubmit}>
        <Field variant="filter" label={ptBR.home.pagination.jumpLabel} className={PAGINATION_CONTROLS_CLASSNAMES.jumpField}>
          <input
            className={`${PAGINATION_CONTROLS_CLASSNAMES.jumpInput} search-filters__input`}
            type="text"
            inputMode="numeric"
            maxLength={PAGINATION_JUMP_MAX_LENGTH}
            placeholder={ptBR.home.pagination.jumpPlaceholder}
            value={pageInput}
            onChange={(event) => handleChange(event.target.value)}
            disabled={!canNavigate || isLoading}
          />
        </Field>

        <Button variant="secondary" type="submit" disabled={!canNavigate || isLoading || pageInput.trim().length === 0}>
          {ptBR.home.pagination.jumpButton}
        </Button>
      </form>

      <Button variant="secondary" type="button" disabled={currentPage >= totalPages || isLoading} onClick={onNext}>
        {ptBR.common.buttons.next}
      </Button>
    </div>
  );
}
