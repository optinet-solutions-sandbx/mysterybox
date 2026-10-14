"use client";

import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, useSoundEnabled } from "@/lib/sound";
import { cn } from "@/lib/cn";

/** One switch for sound and vibration. */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!on)}
      aria-pressed={on}
      aria-label={on ? "Turn sound and vibration off" : "Turn sound and vibration on"}
      className={cn("grid size-10 place-items-center rounded-full text-muted transition-colors hover:text-fg", className)}
    >
      {on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
    </button>
  );
}
