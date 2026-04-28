import Phaser from "phaser";
import {
  BUILD_CATALOG,
  FOREST_GRID_HEIGHT,
  FOREST_GRID_WIDTH,
  TILE_SIZE,
  useGameStore,
  type ForestGridObject
} from "@/store/useGameStore";

const WORLD_WIDTH = FOREST_GRID_WIDTH * TILE_SIZE;
const WORLD_HEIGHT = FOREST_GRID_HEIGHT * TILE_SIZE;

export default class ForestScene extends Phaser.Scene {
  private objectLayer?: Phaser.GameObjects.Group;
  private hoverTile?: Phaser.GameObjects.Rectangle;
  private unsubscribeForest?: () => void;
  private dragStart?: {
    pointerX: number;
    pointerY: number;
    scrollX: number;
    scrollY: number;
  };
  private dragDistance = 0;

  constructor() {
    super("ForestScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#142119");
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.setZoom(1.2);

    this.createTilemap();
    this.createGridLines();

    this.objectLayer = this.add.group();
    this.hoverTile = this.add
      .rectangle(0, 0, TILE_SIZE, TILE_SIZE)
      .setStrokeStyle(2, 0xffd166, 0.9)
      .setFillStyle(0xffd166, 0.12)
      .setOrigin(0)
      .setDepth(2)
      .setVisible(false);

    this.unsubscribeForest = useGameStore.subscribe(
      (state) => state.forestGrid,
      (forestGrid) => this.renderForestObjects(forestGrid),
      { fireImmediately: true }
    );

    this.registerCameraControls();
    this.registerPlacementControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanUp, this);
  }

  private createTilemap() {
    const map = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: FOREST_GRID_WIDTH,
      height: FOREST_GRID_HEIGHT
    });
    const tileset = map.addTilesetImage(
      "forest-tile",
      "forest-tile",
      TILE_SIZE,
      TILE_SIZE
    );

    if (!tileset) {
      return;
    }

    const ground = map.createBlankLayer("Ground", tileset, 0, 0);
    ground?.fill(0, 0, 0, FOREST_GRID_WIDTH, FOREST_GRID_HEIGHT);
  }

  private createGridLines() {
    const graphics = this.add.graphics().setDepth(1);
    graphics.lineStyle(1, 0x68a366, 0.18);

    for (let x = 0; x <= FOREST_GRID_WIDTH; x += 1) {
      graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT);
    }

    for (let y = 0; y <= FOREST_GRID_HEIGHT; y += 1) {
      graphics.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH, y * TILE_SIZE);
    }
  }

  private registerCameraControls() {
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        this.dragStart = {
          pointerX: pointer.x,
          pointerY: pointer.y,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY
        };
        this.dragDistance = 0;
      }
    );

    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        this.updateHoverTile(pointer);

        if (!this.dragStart || !pointer.isDown) {
          return;
        }

        const dx = pointer.x - this.dragStart.pointerX;
        const dy = pointer.y - this.dragStart.pointerY;
        this.dragDistance = Math.max(this.dragDistance, Math.hypot(dx, dy));
        this.cameras.main.scrollX =
          this.dragStart.scrollX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY =
          this.dragStart.scrollY - dy / this.cameras.main.zoom;
      }
    );

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.dragStart = undefined;
    });

    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        const camera = this.cameras.main;
        const nextZoom = Phaser.Math.Clamp(
          camera.zoom + (deltaY > 0 ? -0.12 : 0.12),
          0.65,
          2.25
        );
        camera.setZoom(nextZoom);
      }
    );
  }

  private registerPlacementControls() {
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (this.dragDistance > 6) {
          return;
        }

        const tile = this.getTileFromPointer(pointer);

        if (!tile) {
          return;
        }

        const { selectedBuildItem, purchaseObject } = useGameStore.getState();
        const item = BUILD_CATALOG[selectedBuildItem];
        purchaseObject(tile.x, tile.y, selectedBuildItem, item.cost);
      }
    );
  }

  private updateHoverTile(pointer: Phaser.Input.Pointer) {
    if (!this.hoverTile) {
      return;
    }

    const tile = this.getTileFromPointer(pointer);

    if (!tile) {
      this.hoverTile.setVisible(false);
      return;
    }

    this.hoverTile
      .setVisible(true)
      .setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
  }

  private getTileFromPointer(pointer: Phaser.Input.Pointer) {
    const worldPoint = pointer.positionToCamera(
      this.cameras.main
    ) as Phaser.Math.Vector2;
    const x = Math.floor(worldPoint.x / TILE_SIZE);
    const y = Math.floor(worldPoint.y / TILE_SIZE);

    if (
      x < 0 ||
      y < 0 ||
      x >= FOREST_GRID_WIDTH ||
      y >= FOREST_GRID_HEIGHT
    ) {
      return null;
    }

    return { x, y };
  }

  private renderForestObjects(forestGrid: ForestGridObject[]) {
    if (!this.objectLayer) {
      return;
    }

    this.objectLayer.clear(true, true);

    forestGrid.forEach((object) => {
      const catalogItem = BUILD_CATALOG[object.type];
      const sprite = this.add
        .image(
          object.x * TILE_SIZE + TILE_SIZE / 2,
          object.y * TILE_SIZE + TILE_SIZE,
          catalogItem.textureKey
        )
        .setOrigin(0.5, 1)
        .setDepth(10 + object.y);

      this.objectLayer?.add(sprite);
    });
  }

  private cleanUp() {
    this.unsubscribeForest?.();
    this.unsubscribeForest = undefined;
    this.input.removeAllListeners();
  }
}
