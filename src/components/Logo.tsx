interface LogoProps { className?: string; textClassName?: string; showText?: boolean }

export default function Logo({ className = "w-8 h-8", textClassName = "text-xl", showText = true }: LogoProps) {
  return (
    <div className="flex items-center space-x-3">
      {/* Emblem with subtle gradient glow matching site palette */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 blur opacity-60" aria-hidden="true" />
        <div className="relative rounded-xl bg-white shadow-sm p-0.5">
          <img
            src="/logo.png"
            alt="Digital Soul logo"
            className={`${className} rounded-[10px] object-contain drop-shadow-[0_8px_16px_rgba(147,51,234,0.35)] saturate-125`}
          />
        </div>
      </div>
      {showText ? (
        <span className={`${textClassName} font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent`}>
          Digital Soul
        </span>
      ) : null}
    </div>
  );
}