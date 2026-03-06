import { useEffect, useRef } from 'react';
import { Container, Application } from 'pixi.js';
import { createPixiApp } from '../pixi/pixiApp';
import { TanjiroController } from '../pixi/TanjiroController';

interface TanjiroCanvasProps {
  onReady?: (controller: TanjiroController) => void;
}

export function TanjiroCanvas({ onReady }: TanjiroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | null = null;
    let controller: TanjiroController | null = null;

    async function init() {
      if (!containerRef.current) return;

      app = await createPixiApp();
      containerRef.current.appendChild(app.canvas);

      const stage = new Container();
      app.stage.addChild(stage);

      controller = new TanjiroController(app, stage);
      await controller.loadAnimations();

      // Expose controller globally for dev testing
      (window as unknown as Record<string, unknown>).__tanjiro = controller;

      onReady?.(controller);
    }

    init().catch(console.error);

    return () => {
      controller?.destroy();
      controller = null;
      if (app) {
        app.canvas.remove();
        app.destroy();
        app = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}
