interface PlaceholderFrameProps {
  index?: number;
  label?: string;
  sublabel?: string;
  hueSeed?: number;
  className?: string;
}

export default function PlaceholderFrame({
  index,
  label,
  sublabel,
  hueSeed = 0,
  className = "",
}: PlaceholderFrameProps) {
  const hue = ((hueSeed * 47) % 360 + 200) % 360;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(165deg, hsl(${hue} 14% 13%) 0%, hsl(${(hue + 30) % 360} 10% 6%) 60%, hsl(${hue} 12% 9%) 100%)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 70% 8%, hsl(${hue} 42% 62% / 0.12), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 border border-white/10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        {typeof index === "number" && (
          <span className="text-[clamp(2.5rem,6vh,4.5rem)] font-light leading-none text-white/25">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {label && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/25">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
