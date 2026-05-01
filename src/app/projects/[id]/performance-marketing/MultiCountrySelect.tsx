"use client";

import { useEffect, useRef, useState } from "react";
import { COMMON_COUNTRIES } from "./types";

interface Props {
  value: string[];
  onChange: (countries: string[]) => void;
  className?: string;
}

export default function MultiCountrySelect({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(country: string) {
    if (value.includes(country)) {
      onChange(value.filter((c) => c !== country));
    } else {
      onChange([...value, country]);
    }
  }

  const label =
    value.length === 0
      ? "Select countries..."
      : value.length === 1
      ? value[0]
      : `${value[0]} +${value.length - 1} more`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-900 hover:border-slate-300 focus:outline-none"
      >
        <span className={value.length === 0 ? "text-slate-400" : ""}>{label}</span>
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-52 overflow-y-auto p-1">
            {COMMON_COUNTRIES.map((country) => {
              const checked = value.includes(country);
              return (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggle(country)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-violet-500 bg-violet-500"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && (
                      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={checked ? "font-medium text-slate-900" : "text-slate-700"}>
                    {country}
                  </span>
                </button>
              );
            })}
          </div>
          {value.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-slate-400 hover:text-red-500"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
