from pathlib import Path
p = Path("src/components/quran/QuranNavigator.tsx")
t = p.read_text(encoding="utf-8")
repls = [
    ('const TOGGLE_LEFT = "left-[4.75rem] md:left-52";', 'const TOGGLE_LEFT = "left-[4.75rem] md:left-52";\nconst PANEL_LEFT = TOGGLE_LEFT;'),
    ('const panelRef = useRef<HTMLDivElement>(null);', 'const scrollRef = useRef<HTMLDivElement>(null);\n  const activeSurahRef = useRef<HTMLButtonElement>(null);'),
    ('      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">', '      <div className="shrink-0 flex items-center justify-between border-b border-neutral-200 px-4 py-3">'),
    ('      <div className="flex gap-1 border-b border-neutral-100 px-3 py-2">', '      <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-3 py-2">'),
    ('      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">', '      <div ref={scrollRef} className="quran-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">'),
    ('            <ul className="space-y-0.5">', '            <ul className="space-y-0.5 pb-8">'),
    ('                    <button\n                      type="button"\n                      onClick={() => go(s.n, active ? ayah : 1)}', '                    <button\n                      ref={active ? activeSurahRef : undefined}\n                      type="button"\n                      onClick={() => go(s.n, active ? ayah : 1)}'),
    ('          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">', '          <ul className="grid grid-cols-3 gap-2 pb-8 sm:grid-cols-4">'),
    ('          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">', '          <ul className="grid grid-cols-4 gap-2 pb-8 sm:grid-cols-5">'),
    ('      <p className="border-t border-neutral-100 px-4 py-2 text-center text-[11px] text-neutral-400">', '      <p className="shrink-0 border-t border-neutral-100 px-4 py-2.5 text-center text-[11px] text-neutral-400">'),
    ('className={cn("fixed inset-0 z-[110] bg-black/25 backdrop-blur-[2px]", TOGGLE_LEFT)}', 'className={cn("fixed inset-0 z-[110] bg-black/25 backdrop-blur-[2px]", PANEL_LEFT)}'),
]
for a,b in repls:
    if a not in t:
        raise SystemExit(f"missing: {a[:40]}")
    t = t.replace(a,b,1)
old = '''  useEffect(() => {
    if (open) setJumpAyah(String(ayah));
  }, [open, ayah, surah]);
  useEffect(() => {
    if (!open) return;'''
new = '''  useEffect(() => {
    if (open) setJumpAyah(String(ayah));
  }, [open, ayah, surah]);
  useEffect(() => {
    if (!open || tab !== "surah") return;
    const timer = window.setTimeout(() => {
      activeSurahRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, tab, surah]);
  useEffect(() => {
    if (!open) return;'''
if old not in t:
    raise SystemExit("missing effect block")
t = t.replace(old,new,1)
old_aside = '''          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quran navigator"
            data-testid="quran-nav-panel-desktop"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-[120] hidden h-[min(92dvh,720px)] w-[min(calc(100vw-5rem),320px)] flex-col",
              TOGGLE_LEFT,
              "top-1/2 -translate-y-1/2 overflow-hidden rounded-r-2xl",
              "border border-l-0 border-neutral-200 bg-white shadow-2xl md:flex"
            )}
          >'''
new_aside = '''          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Quran navigator"
            data-testid="quran-nav-panel-desktop"
            initial={{ x: "-100%", opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{ top: "0.75rem", bottom: "0.75rem" }}
            className={cn(
              "fixed z-[120] hidden w-[min(calc(100vw-5.5rem),340px)] flex-col",
              PANEL_LEFT,
              "overflow-hidden rounded-r-2xl",
              "border border-l-0 border-neutral-200 bg-white shadow-2xl md:flex",
              "md:top-3 md:bottom-3 md:w-[340px]"
            )}
          >'''
if old_aside not in t:
    raise SystemExit("missing aside block")
t = t.replace(old_aside,new_aside,1)
t = t.replace('max-h-[78dvh]', 'max-h-[min(88dvh,720px)]', 1)
p.write_text(t, encoding="utf-8", newline="\n")
print("patched", len(t.splitlines()), "lines")