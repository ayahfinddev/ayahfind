"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type ResetFn = () => void;

type SearchHomeContextValue = {
  registerReset: (fn: ResetFn | null) => void;
  goToSearchHome: () => void;
};

const SearchHomeContext = createContext<SearchHomeContextValue | null>(null);

export function SearchHomeProvider({ children }: { children: ReactNode }) {
  const resetRef = useRef<ResetFn | null>(null);

  const registerReset = useCallback((fn: ResetFn | null) => {
    resetRef.current = fn;
  }, []);

  const goToSearchHome = useCallback(() => {
    resetRef.current?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <SearchHomeContext.Provider value={{ registerReset, goToSearchHome }}>
      {children}
    </SearchHomeContext.Provider>
  );
}

export function useSearchHome() {
  const ctx = useContext(SearchHomeContext);
  if (!ctx) {
    throw new Error("useSearchHome must be used within SearchHomeProvider");
  }
  return ctx;
}

export function useSearchNavClick() {
  const pathname = usePathname();
  const ctx = useContext(SearchHomeContext);

  return (href: string, e: MouseEvent<HTMLAnchorElement>) => {
    if (href !== "/" || pathname !== "/" || !ctx) return;
    e.preventDefault();
    ctx.goToSearchHome();
  };
}
