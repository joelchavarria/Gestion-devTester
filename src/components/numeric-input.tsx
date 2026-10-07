"use client";

import { useState, type InputHTMLAttributes } from "react";

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};

function normalizeDraft(value: string) {
  if (value.length > 1 && value.startsWith("0") && !value.startsWith("0.")) {
    return value.replace(/^0+(?=\d)/, "");
  }
  return value;
}

export function NumericInput({ value, min = 0, onValueChange, onFocus, onBlur, ...props }: NumericInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const minimum = typeof min === "number" ? min : Number(min ?? 0);

  return (
    <input
      {...props}
      type="number"
      min={min}
      value={focused ? draft : String(value)}
      onFocus={(event) => {
        setDraft(String(value));
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const rawValue = event.target.value;
        setDraft(rawValue === "" ? "" : normalizeDraft(rawValue));

        if (rawValue === "") {
          onValueChange(minimum);
          return;
        }

        const parsed = Number(rawValue);
        if (Number.isFinite(parsed) && parsed >= 0) onValueChange(Math.max(minimum, parsed));
      }}
      onBlur={(event) => {
        setFocused(false);
        const parsed = Number(draft);
        const nextValue = draft === "" || !Number.isFinite(parsed) || parsed < 0 ? minimum : Math.max(minimum, parsed);
        setDraft(String(nextValue));
        onValueChange(nextValue);
        onBlur?.(event);
      }}
    />
  );
}
