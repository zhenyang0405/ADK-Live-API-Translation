import { Application } from 'pixi.js';

export async function createPixiApp(): Promise<Application> {
  const app = new Application();
  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
    roundPixels: true,
    antialias: false,
  });
  // Pixel art crisp rendering
  app.canvas.style.imageRendering = 'pixelated';
  app.canvas.style.display = 'block';
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  return app;
}
