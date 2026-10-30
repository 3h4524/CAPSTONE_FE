"use client";

import { useEffect, useState } from "react";

const isSelectModifierHeld = (event: KeyboardEvent) => event.ctrlKey || event.metaKey;

export const useSelectModifierHeld = () => {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const sync = (event: KeyboardEvent) => setHeld(isSelectModifierHeld(event));
    const release = () => setHeld(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", release);
    };
  }, []);

  return held;
};
