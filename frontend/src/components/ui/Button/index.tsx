import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { getButtonClassName, type ButtonVariant } from "./style";

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  active?: boolean;
};

type NativeButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    to?: never;
  };

type LinkButtonProps = CommonProps & Omit<LinkProps, "className" | "children"> & {
  to: LinkProps["to"];
};

type ButtonProps = NativeButtonProps | LinkButtonProps;

export function Button(props: ButtonProps) {
  const { children, className = "", variant = "primary", active = false } = props;
  const buttonClassName = getButtonClassName(variant, active, className);

  if ("to" in props && props.to !== undefined) {
    const linkProps = props as LinkButtonProps;
    const { to, replace, state, preventScrollReset, relative, reloadDocument, target, ...rest } = linkProps;

    return (
      <Link
        className={buttonClassName}
        to={to}
        replace={replace}
        state={state}
        preventScrollReset={preventScrollReset}
        relative={relative}
        reloadDocument={reloadDocument}
        target={target}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  const buttonProps = props as NativeButtonProps;
  const { type = "button", ...rest } = buttonProps;

  return (
    <button className={buttonClassName} type={type} {...rest}>
      {children}
    </button>
  );
}
