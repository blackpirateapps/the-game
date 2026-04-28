"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { useGameStore, type ActiveScene } from "@/store/useGameStore";

const SCENE_KEY_BY_VIEW: Record<ActiveScene, string> = {
  shrine: "PhoenixScene",
  forest: "ForestScene"
};

const OTHER_SCENE_BY_VIEW: Record<ActiveScene, string> = {
  shrine: "ForestScene",
  forest: "PhoenixScene"
};

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bootTokenRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const bootToken = bootTokenRef.current + 1;
    bootTokenRef.current = bootToken;

    async function bootGame() {
      const [
        phaserModule,
        bootSceneModule,
        phoenixSceneModule,
        forestSceneModule
      ] = await Promise.all([
        import("phaser"),
        import("@/game/scenes/BootScene"),
        import("@/game/scenes/PhoenixScene"),
        import("@/game/scenes/ForestScene")
      ]);

      if (
        disposed ||
        bootTokenRef.current !== bootToken ||
        !containerRef.current ||
        gameRef.current
      ) {
        return;
      }

      const PhaserRuntime = phaserModule.default;
      const config: Phaser.Types.Core.GameConfig = {
        type: PhaserRuntime.WEBGL,
        parent: containerRef.current,
        backgroundColor: "#100d12",
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          width: "100%",
          height: "100%"
        },
        render: {
          antialias: false,
          pixelArt: true,
          roundPixels: true,
          powerPreference: "high-performance"
        },
        scene: [
          bootSceneModule.default,
          phoenixSceneModule.default,
          forestSceneModule.default
        ]
      };

      gameRef.current = new PhaserRuntime.Game(config);
    }

    void bootGame();

    return () => {
      disposed = true;
      bootTokenRef.current += 1;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      containerRef.current?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    return useGameStore.subscribe(
      (state) => state.activeScene,
      (activeScene) => {
        if (!gameRef.current) {
          return;
        }

        syncActiveScene(gameRef.current, activeScene);
      }
    );
  }, []);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}

function syncActiveScene(game: Phaser.Game, activeScene: ActiveScene) {
  const targetScene = SCENE_KEY_BY_VIEW[activeScene];
  const inactiveScene = OTHER_SCENE_BY_VIEW[activeScene];
  const sceneManager = game.scene;
  const registeredScenes = (sceneManager as unknown as { keys: object }).keys;

  if (!Object.prototype.hasOwnProperty.call(registeredScenes, targetScene)) {
    return;
  }

  if (sceneManager.isActive(inactiveScene)) {
    sceneManager.stop(inactiveScene);
  }

  if (!sceneManager.isActive(targetScene)) {
    sceneManager.start(targetScene);
  }
}
