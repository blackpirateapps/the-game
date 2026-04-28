"use client";

import { PhaserGame } from "@/game/PhaserGame";
import { GameHud } from "@/components/ui/GameHud";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#100d12]">
      <PhaserGame />
      <GameHud />
    </main>
  );
}
