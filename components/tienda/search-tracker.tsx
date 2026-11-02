"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Solo la longitud y el número de resultados: el texto buscado puede contener datos de salud.
export function SearchTracker({ length, results }: { length: number; results: number }) {
  useEffect(() => {
    track("search_submitted", { length, results });
  }, [length, results]);
  return null;
}
