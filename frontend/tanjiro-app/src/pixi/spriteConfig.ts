export interface AnimationDef {
  spriteSheet: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  animationSpeed: number;
  loop: boolean;
  gap?: number;
  frameOffsets?: number[];
  anchorX?: number;
}

export const ANIMATIONS: Record<string, AnimationDef> = {
  // idle: {
  //   spriteSheet: '/sprites/hori_Tanjiro_Idle_212x384.png',
  //   frameWidth: 214,
  //   frameHeight: 384,
  //   frameCount: 4,
  //   animationSpeed: 0.04,
  //   loop: true,
  // },
  blink: {
    spriteSheet: '/sprites/hori_Tanjiro_Blinking.png',
    frameWidth: 206,
    frameHeight: 384,
    frameCount: 4,
    animationSpeed: 0.08,
    loop: false,
  },
  talking: {
    spriteSheet: '/sprites/hori_Tanjiro_Talking.png',
    frameWidth: 203,
    frameHeight: 384,
    frameCount: 4,
    animationSpeed: 0.08,
    loop: false,
  },
  thinking: {
    spriteSheet: '/sprites/hori_Tanjiro_thinking.png',
    frameWidth: 244,
    frameHeight: 412,
    frameCount: 4,
    animationSpeed: 0.08,
    loop: false,
    frameOffsets: [0, 255, 505, 768],
    anchorX: 0.471,
  },
  happy: {
    spriteSheet: '/sprites/hori_Tanjiro_Happy.png',
    frameWidth: 243,
    frameHeight: 412,
    frameCount: 4,
    animationSpeed: 0.08,
    loop: false,
    frameOffsets: [0, 243, 496, 773],
    anchorX: 0.469,
  },
};

export type AnimationState = keyof typeof ANIMATIONS;
