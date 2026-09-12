"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppButton({
  className = "",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      data-variant={props.variant ?? "default"}
      className={`mvp-button ${className}`}
      {...props}
    />
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string; hint?: string }) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className="mvp-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
      />
      {hint && <p id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mvp-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mvp-section-heading">
      <div>
        {eyebrow && <p className="mvp-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mvp-empty">
      <span className="mvp-empty-route" aria-hidden="true">
        ↗
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
