"use client";

type Filter = "all" | "videos" | "photos";

interface FilterNavProps {
  active: Filter;
  onChange: (filter: Filter) => void;
  counts?: { all: number; videos: number; photos: number };
}

export default function FilterNav({ active, onChange, counts }: FilterNavProps) {
  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "videos", label: "Film" },
    { key: "photos", label: "Photography" },
  ];

  return (
    <nav className="flex gap-6 sm:gap-8">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          data-active={active === key}
          className={`
            filter-tab pb-1 cursor-pointer text-[11px] sm:text-xs tracking-[0.12em] uppercase transition-all duration-300
            ${active === key
              ? "text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }
          `}
        >
          {label}
          {counts && (
            <span className="ml-1.5 text-[10px] opacity-40">
              {counts[key]}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export type { Filter };
