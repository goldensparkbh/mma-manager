import { useEffect, useRef } from "react";
import { getAllClubTypeImages } from "@/lib/clubTypeImages";

const CLUB_IMAGES = getAllClubTypeImages();

type Floater = {
  id: string;
  url: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
};

function createFloaters(width: number, height: number): Floater[] {
  return CLUB_IMAGES.map((img) => {
    const size = 110 + Math.random() * 50;
    const maxX = Math.max(0, width - size);
    const maxY = Math.max(0, height - size);
    const speed = 0.6 + Math.random() * 1.2;
    const angle = Math.random() * Math.PI * 2;
    return {
      id: img.id,
      url: img.url,
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
    };
  });
}

export function LoginClubShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatersRef = useRef<Floater[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || CLUB_IMAGES.length === 0) return;

    const init = () => {
      const { width, height } = container.getBoundingClientRect();
      floatersRef.current = createFloaters(width, height);
      for (const f of floatersRef.current) {
        const el = nodeRefs.current.get(f.id);
        if (el) {
          el.style.width = `${f.size}px`;
          el.style.height = `${f.size}px`;
          el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.rotation}deg)`;
        }
      }
    };

    init();

    const tick = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      for (const f of floatersRef.current) {
        f.x += f.vx;
        f.y += f.vy;
        f.rotation += f.rotationSpeed;

        if (f.x <= 0) {
          f.x = 0;
          f.vx = Math.abs(f.vx);
        }
        if (f.y <= 0) {
          f.y = 0;
          f.vy = Math.abs(f.vy);
        }
        if (f.x + f.size >= width) {
          f.x = width - f.size;
          f.vx = -Math.abs(f.vx);
        }
        if (f.y + f.size >= height) {
          f.y = height - f.size;
          f.vy = -Math.abs(f.vy);
        }

        const el = nodeRefs.current.get(f.id);
        if (el) {
          el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.rotation}deg)`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      floatersRef.current = createFloaters(width, height);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  const patternTiles = Array.from({ length: 72 }, (_, i) => CLUB_IMAGES[i % CLUB_IMAGES.length]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      aria-hidden
    >
      {/* Tiled pattern background */}
      <div className="absolute inset-0 opacity-[0.18] pointer-events-none">
        <div
          className="absolute inset-[-20%] grid gap-2 p-4"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            transform: "rotate(-8deg) scale(1.15)",
          }}
        >
          {patternTiles.map((img, i) => (
            <div
              key={`pattern-${img.id}-${i}`}
              className="aspect-square overflow-hidden rounded-lg ring-1 ring-white/10"
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

      {/* Bouncing club images */}
      <div className="absolute inset-0">
        {CLUB_IMAGES.map((img) => (
          <div
            key={img.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(img.id, el);
              else nodeRefs.current.delete(img.id);
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: 120, height: 120 }}
          >
            <img
              src={img.url}
              alt=""
              className="h-full w-full rounded-2xl object-cover shadow-2xl ring-2 ring-white/40"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
