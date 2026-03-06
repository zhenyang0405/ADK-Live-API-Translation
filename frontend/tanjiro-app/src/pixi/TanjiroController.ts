import { Container, AnimatedSprite, Texture, Rectangle, Assets, Application } from 'pixi.js';
import { ANIMATIONS } from './spriteConfig';

const CROSSFADE_FRAMES = 10;

export class TanjiroController {
  private container: Container;
  private sprites: Map<string, AnimatedSprite> = new Map();
  private currentState: string = 'blink';
  private app: Application;
  private lastWidth = 0;
  private lastHeight = 0;
  private blinkTimeout: number | null = null;
  private talkingTimeout: number | null = null;
  private thinkingTimeout: number | null = null;
  private isTalking = false;
  private isThinking = false;

  constructor(app: Application, container: Container) {
    this.app = app;
    this.container = container;
  }

  async loadAnimations(): Promise<void> {
    for (const [name, def] of Object.entries(ANIMATIONS)) {
      const texture = await Assets.load<Texture>(def.spriteSheet);
      texture.source.scaleMode = 'nearest';

      const frames: Texture[] = [];
      for (let i = 0; i < def.frameCount; i++) {
        const x = def.frameOffsets ? def.frameOffsets[i] : i * (def.frameWidth + (def.gap ?? 0));
        const frame = new Rectangle(x, 0, def.frameWidth, def.frameHeight);
        const frameTex = new Texture({
          source: texture.source,
          frame,
          label: `${name}_frame_${i}`,
        });
        frames.push(frameTex);
      }

      const sprite = new AnimatedSprite(frames);
      sprite.animationSpeed = def.animationSpeed;
      sprite.loop = def.loop;
      sprite.anchor.set(def.anchorX ?? 0.5, 1);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.sprites.set(name, sprite);
    }

    this.positionCharacter();

    this.app.ticker.add(() => {
      const { width, height } = this.app.screen;
      if (width !== this.lastWidth || height !== this.lastHeight) {
        this.positionCharacter();
      }
    });

    const idleSprite = this.sprites.get('idle');
    if (idleSprite) {
      idleSprite.visible = true;
      idleSprite.play();
    }
    const blinkSprite = this.sprites.get('blink');
    if (blinkSprite) {
      blinkSprite.visible = true;
      blinkSprite.onComplete = () => {
        this.blinkTimeout = window.setTimeout(() => {
          blinkSprite.gotoAndPlay(0);
        }, 3000);
      };
      blinkSprite.play();
    }
  }

  private positionCharacter(): void {
    const { width, height } = this.app.screen;
    this.lastWidth = width;
    this.lastHeight = height;
    this.container.x = width / 2;
    this.container.y = height;

    const targetHeight = height * 0.4;
    const def = ANIMATIONS[this.currentState] ?? ANIMATIONS.blink;
    const scale = targetHeight / def.frameHeight;
    this.container.scale.set(scale);
  }

  transitionTo(state: string): void {
    if (state === this.currentState) return;
    const oldSprite = this.sprites.get(this.currentState);
    const newSprite = this.sprites.get(state);
    if (!newSprite) return;

    this.currentState = state;
    this.positionCharacter();

    newSprite.alpha = 0;
    newSprite.visible = true;
    newSprite.play();

    let frame = 0;
    const ticker = this.app.ticker;
    const onTick = () => {
      frame++;
      const t = Math.min(frame / CROSSFADE_FRAMES, 1);
      newSprite.alpha = t;
      if (oldSprite) oldSprite.alpha = 1 - t;

      if (t >= 1) {
        ticker.remove(onTick);
        if (oldSprite) {
          oldSprite.visible = false;
          oldSprite.stop();
          oldSprite.alpha = 1;
        }
      }
    };
    ticker.add(onTick);
  }

  private stopAll(): void {
    // Stop blink
    if (this.blinkTimeout !== null) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }
    const blinkSprite = this.sprites.get('blink');
    if (blinkSprite) {
      blinkSprite.stop();
      blinkSprite.visible = false;
    }

    // Stop talking
    this.isTalking = false;
    if (this.talkingTimeout !== null) {
      clearTimeout(this.talkingTimeout);
      this.talkingTimeout = null;
    }
    const talkingSprite = this.sprites.get('talking');
    if (talkingSprite) {
      talkingSprite.stop();
      talkingSprite.visible = false;
      talkingSprite.onComplete = undefined;
    }

    // Stop thinking
    this.isThinking = false;
    if (this.thinkingTimeout !== null) {
      clearTimeout(this.thinkingTimeout);
      this.thinkingTimeout = null;
    }
    const thinkingSprite = this.sprites.get('thinking');
    if (thinkingSprite) {
      thinkingSprite.stop();
      thinkingSprite.visible = false;
      thinkingSprite.onComplete = undefined;
    }
  }

  private resumeBlink(): void {
    const blinkSprite = this.sprites.get('blink');
    if (blinkSprite) {
      blinkSprite.visible = true;
      blinkSprite.gotoAndPlay(0);
    }
  }

  setTalking(talking: boolean): void {
    if (talking === this.isTalking) return;

    this.stopAll();

    if (talking) {
      this.isTalking = true;
      const talkingSprite = this.sprites.get('talking');
      if (talkingSprite) {
        talkingSprite.visible = true;
        talkingSprite.onComplete = () => {
          this.talkingTimeout = window.setTimeout(() => {
            if (this.isTalking) talkingSprite.gotoAndPlay(0);
          }, 500);
        };
        talkingSprite.gotoAndPlay(0);
      }
    } else {
      this.resumeBlink();
    }
  }

  setThinking(thinking: boolean): void {
    if (thinking === this.isThinking) return;

    this.stopAll();

    if (thinking) {
      this.isThinking = true;
      const thinkingSprite = this.sprites.get('thinking');
      if (thinkingSprite) {
        thinkingSprite.visible = true;
        thinkingSprite.onComplete = () => {
          this.thinkingTimeout = window.setTimeout(() => {
            if (this.isThinking) thinkingSprite.gotoAndPlay(0);
          }, 1000);
        };
        thinkingSprite.gotoAndPlay(0);
      }
    } else {
      this.resumeBlink();
    }
  }

  playHappy(): void {
    this.stopAll();

    const happySprite = this.sprites.get('happy');
    if (happySprite) {
      let loops = 0;
      happySprite.visible = true;
      happySprite.onComplete = () => {
        loops++;
        if (loops < 2) {
          happySprite.gotoAndPlay(0);
        } else {
          happySprite.visible = false;
          happySprite.onComplete = undefined;
          this.resumeBlink();
        }
      };
      happySprite.gotoAndPlay(0);
    }
  }

  get current(): string {
    return this.currentState;
  }

  destroy(): void {
    if (this.blinkTimeout !== null) {
      clearTimeout(this.blinkTimeout);
    }
    if (this.talkingTimeout !== null) {
      clearTimeout(this.talkingTimeout);
    }
    if (this.thinkingTimeout !== null) {
      clearTimeout(this.thinkingTimeout);
    }
    this.sprites.forEach((sprite) => {
      sprite.stop();
      sprite.destroy();
    });
    this.sprites.clear();
  }
}
