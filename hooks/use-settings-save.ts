"use client";

import { useState, useTransition } from "react";

export function useSettingsSave(onSave: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await onSave();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return { error, pending, save, setError };
}
