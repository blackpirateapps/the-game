import Phaser from "phaser";
import {
  getElapsedStreakMs,
  getPhoenixStage,
  useGameStore,
  type PhoenixStage
} from "@/store/useGameStore";

const TEXTURE_BY_STAGE: Record<PhoenixStage, string> = {
  egg: "phoenix-egg",
  hatchling: "phoenix-hatchling",
  majestic: "phoenix-majestic"
};

const SCALE_BY_STAGE: Record<PhoenixStage, number> = {
  egg: 1.05,
  hatchling: 1.3,
  majestic: 1.85
};

export default class PhoenixScene extends Phaser.Scene {
  private phoenixRoot?: Phaser.GameObjects.Container;
  private phoenixSprite?: Phaser.GameObjects.Image;
  private aura?: Phaser.GameObjects.Ellipse;
  private background?: Phaser.GameObjects.Graphics;
  private unsubscribeStreak?: () => void;
  private currentStage?: PhoenixStage;
  private nextStageCheckAt = 0;

  constructor() {
    super("PhoenixScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#100d12");
    this.createAtmosphere();
    this.createPhoenix();
    this.createEmbers();
    this.applyCameraEffects();
    this.syncPhoenixVisualState();

    this.unsubscribeStreak = useGameStore.subscribe(
      (state) => state.currentStreakStartTime,
      () => this.syncPhoenixVisualState()
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanUp, this);
  }

  update(time: number) {
    if (time < this.nextStageCheckAt) {
      return;
    }

    this.nextStageCheckAt = time + 1_000;
    this.syncPhoenixVisualState();
  }

  private createAtmosphere() {
    this.background = this.add.graphics().setDepth(-20);
    this.drawBackground();
  }

  private drawBackground() {
    if (!this.background) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    this.background.clear();
    this.background.fillStyle(0x100d12, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x261018, 1);
    this.background.fillRect(0, height * 0.58, width, height * 0.42);
    this.background.fillStyle(0x3b151a, 0.65);
    this.background.fillEllipse(width * 0.5, height * 0.72, width * 0.82, 96);
    this.background.fillStyle(0xff6b1a, 0.12);
    this.background.fillEllipse(width * 0.5, height * 0.56, width * 0.72, height * 0.58);

    for (let i = 0; i < 18; i += 1) {
      const x = (width / 18) * i;
      const pillarHeight = 90 + (i % 5) * 28;
      this.background.fillStyle(0x08070a, 0.42);
      this.background.fillRect(x, height - pillarHeight, 22, pillarHeight);
    }
  }

  private createPhoenix() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height * 0.56;

    this.aura = this.add
      .ellipse(centerX, centerY + 20, 170, 170, 0xff6b1a, 0.18)
      .setDepth(4);

    this.phoenixRoot = this.add.container(centerX, centerY).setDepth(10);
    this.phoenixSprite = this.add.image(0, 0, TEXTURE_BY_STAGE.egg);
    this.phoenixRoot.add(this.phoenixSprite);

    this.tweens.add({
      targets: this.phoenixRoot,
      scaleX: 1.035,
      scaleY: 0.985,
      y: centerY - 8,
      duration: 1_650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });

    this.tweens.add({
      targets: this.aura,
      alpha: 0.42,
      scaleX: 1.12,
      scaleY: 0.88,
      duration: 1_250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });
  }

  private createEmbers() {
    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      x: { min: 0, max: this.scale.width },
      y: { min: this.scale.height * 0.42, max: this.scale.height + 32 },
      lifespan: { min: 1_000, max: 2_600 },
      speedY: { min: -80, max: -25 },
      speedX: { min: -18, max: 18 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.95, end: 0 },
      quantity: 2,
      frequency: 90,
      blendMode: Phaser.BlendModes.ADD
    };

    this.add.particles(0, 0, "ember", emitterConfig).setDepth(6);
  }

  private applyCameraEffects() {
    const postFx = (this.cameras.main as unknown as {
      postFX?: {
        addBloom?: (
          color?: number,
          offsetX?: number,
          offsetY?: number,
          blurStrength?: number,
          strength?: number,
          steps?: number
        ) => unknown;
        addVignette?: (
          x?: number,
          y?: number,
          radius?: number,
          strength?: number
        ) => unknown;
      };
    }).postFX;

    postFx?.addBloom?.(0xff7a1a, 0.35, 0.35, 0.8, 0.7, 4);
    postFx?.addVignette?.(0.5, 0.52, 0.72, 0.45);
  }

  private syncPhoenixVisualState() {
    if (!this.phoenixSprite) {
      return;
    }

    const { currentStreakStartTime } = useGameStore.getState();
    const elapsedMs = getElapsedStreakMs(currentStreakStartTime);
    const nextStage = getPhoenixStage(elapsedMs);

    if (nextStage === this.currentStage) {
      return;
    }

    this.currentStage = nextStage;
    this.phoenixSprite
      .setTexture(TEXTURE_BY_STAGE[nextStage])
      .setScale(SCALE_BY_STAGE[nextStage]);

    if (this.aura) {
      const auraScale = nextStage === "majestic" ? 1.45 : nextStage === "hatchling" ? 1.12 : 0.86;
      this.aura.setScale(auraScale);
    }
  }

  private handleResize() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height * 0.56;

    this.drawBackground();
    this.phoenixRoot?.setPosition(centerX, centerY);
    this.aura?.setPosition(centerX, centerY + 20);
  }

  private cleanUp() {
    this.unsubscribeStreak?.();
    this.unsubscribeStreak = undefined;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }
}
