'use client';

export function SoundWave({ color = '#00D1FF', bars = 3 }: { color?: string; bars?: number }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="yaad-wave-bar rounded-full"
          style={{
            width: 4,
            background: color,
            animation: `yaad-wave 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
