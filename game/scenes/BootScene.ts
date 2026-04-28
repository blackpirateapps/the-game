import Phaser from "phaser";
import { useGameStore } from "@/store/useGameStore";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Phase 1 uses deterministic runtime textures so the prototype can run
    // before the final sprite sheets and UI icon atlas are available.
  }

  create() {
    this.createRuntimeTextures();

    const initialScene =
      useGameStore.getState().activeScene === "forest"
        ? "ForestScene"
        : "PhoenixScene";

    this.scene.start(initialScene);
  }

  private createRuntimeTextures() {
    this.createEmberTexture();
    this.createPhoenixTextures();
    this.createForestTileTexture();
    this.createForestObjectTextures();
  }

  private createEmberTexture() {
    if (this.textures.exists("ember")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffb347, 1);
    graphics.fillCircle(8, 8, 4);
    graphics.fillStyle(0xfff2a8, 0.85);
    graphics.fillCircle(7, 7, 2);
    graphics.generateTexture("ember", 16, 16);
    graphics.destroy();
  }

  private createPhoenixTextures() {
    if (!this.textures.exists("phoenix-egg")) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x34151a, 1);
      graphics.fillEllipse(64, 70, 62, 78);
      graphics.fillStyle(0xffa64d, 1);
      graphics.fillEllipse(64, 68, 48, 64);
      graphics.fillStyle(0xffefd0, 0.9);
      graphics.fillEllipse(54, 52, 16, 28);
      graphics.lineStyle(3, 0x6f2730, 0.8);
      graphics.beginPath();
      graphics.moveTo(48, 73);
      graphics.lineTo(62, 62);
      graphics.lineTo(72, 78);
      graphics.lineTo(84, 66);
      graphics.strokePath();
      graphics.generateTexture("phoenix-egg", 128, 128);
      graphics.destroy();
    }

    if (!this.textures.exists("phoenix-hatchling")) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x43171b, 1);
      graphics.fillTriangle(30, 78, 62, 50, 55, 92);
      graphics.fillTriangle(98, 78, 66, 50, 73, 92);
      graphics.fillStyle(0xff7a1a, 1);
      graphics.fillEllipse(64, 72, 42, 54);
      graphics.fillStyle(0xffc247, 1);
      graphics.fillTriangle(64, 26, 78, 64, 50, 64);
      graphics.fillStyle(0xfff3b2, 1);
      graphics.fillCircle(55, 62, 4);
      graphics.fillCircle(73, 62, 4);
      graphics.fillStyle(0xffe15c, 1);
      graphics.fillTriangle(64, 84, 78, 116, 64, 104);
      graphics.fillTriangle(64, 84, 50, 116, 64, 104);
      graphics.generateTexture("phoenix-hatchling", 128, 128);
      graphics.destroy();
    }

    if (!this.textures.exists("phoenix-majestic")) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x2b0f16, 1);
      graphics.fillTriangle(8, 74, 64, 24, 45, 96);
      graphics.fillTriangle(120, 74, 64, 24, 83, 96);
      graphics.fillStyle(0xff6b1a, 1);
      graphics.fillTriangle(16, 84, 64, 38, 44, 104);
      graphics.fillTriangle(112, 84, 64, 38, 84, 104);
      graphics.fillStyle(0xffb02e, 1);
      graphics.fillEllipse(64, 70, 38, 72);
      graphics.fillStyle(0xffe067, 1);
      graphics.fillTriangle(64, 12, 82, 60, 46, 60);
      graphics.fillStyle(0xfff7c0, 1);
      graphics.fillCircle(55, 56, 4);
      graphics.fillCircle(73, 56, 4);
      graphics.fillStyle(0xffd642, 1);
      graphics.fillTriangle(64, 94, 88, 128, 65, 112);
      graphics.fillTriangle(64, 94, 40, 128, 63, 112);
      graphics.fillStyle(0xfff1a6, 0.8);
      graphics.fillTriangle(64, 96, 72, 128, 64, 114);
      graphics.generateTexture("phoenix-majestic", 128, 128);
      graphics.destroy();
    }
  }

  private createForestTileTexture() {
    if (this.textures.exists("forest-tile")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x1f432e, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x28563a, 1);
    graphics.fillRect(0, 0, 16, 16);
    graphics.fillRect(16, 16, 16, 16);
    graphics.lineStyle(1, 0x3b6f48, 0.5);
    graphics.strokeRect(0.5, 0.5, 31, 31);
    graphics.generateTexture("forest-tile", 32, 32);
    graphics.destroy();
  }

  private createForestObjectTextures() {
    this.createTreeTexture("pine_tree-sprite", 0x184d32, 0x2f9e44);
    this.createTreeTexture("oak_tree-sprite", 0x2f4f21, 0x78a641);
    this.createFenceTexture();
    this.createLanternTexture();
    this.createFlowerTexture();
  }

  private createTreeTexture(key: string, darkColor: number, lightColor: number) {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x6b4423, 1);
    graphics.fillRect(28, 42, 8, 18);
    graphics.fillStyle(darkColor, 1);
    graphics.fillTriangle(10, 46, 32, 12, 54, 46);
    graphics.fillTriangle(14, 34, 32, 4, 50, 34);
    graphics.fillStyle(lightColor, 0.9);
    graphics.fillTriangle(20, 42, 32, 18, 44, 42);
    graphics.generateTexture(key, 64, 64);
    graphics.destroy();
  }

  private createFenceTexture() {
    if (this.textures.exists("fence-sprite")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x7a4e2a, 1);
    graphics.fillRect(12, 26, 8, 28);
    graphics.fillRect(44, 26, 8, 28);
    graphics.fillRect(6, 34, 52, 7);
    graphics.fillRect(6, 47, 52, 7);
    graphics.fillStyle(0xb9854d, 1);
    graphics.fillTriangle(12, 26, 16, 16, 20, 26);
    graphics.fillTriangle(44, 26, 48, 16, 52, 26);
    graphics.generateTexture("fence-sprite", 64, 64);
    graphics.destroy();
  }

  private createLanternTexture() {
    if (this.textures.exists("lantern-sprite")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(4, 0x3a2a21, 1);
    graphics.beginPath();
    graphics.moveTo(32, 58);
    graphics.lineTo(32, 16);
    graphics.lineTo(44, 16);
    graphics.strokePath();
    graphics.fillStyle(0xffc857, 1);
    graphics.fillCircle(46, 28, 10);
    graphics.fillStyle(0xfff0a6, 0.9);
    graphics.fillCircle(46, 28, 5);
    graphics.generateTexture("lantern-sprite", 64, 64);
    graphics.destroy();
  }

  private createFlowerTexture() {
    if (this.textures.exists("flower_patch-sprite")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x2d6a3e, 1);
    graphics.fillEllipse(32, 48, 42, 16);
    const colors = [0xff6b9e, 0xffd166, 0x9b5de5, 0xf15bb5];
    colors.forEach((color, index) => {
      const x = 20 + index * 8;
      graphics.fillStyle(color, 1);
      graphics.fillCircle(x, 38 + (index % 2) * 5, 5);
    });
    graphics.generateTexture("flower_patch-sprite", 64, 64);
    graphics.destroy();
  }
}
