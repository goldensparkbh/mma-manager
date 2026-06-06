import { getAllClubTypeImages } from "@/lib/clubTypeImages";

const CLUB_IMAGES = getAllClubTypeImages();
const COLS = 5;
const COL_REPEAT = 3;
const ROWS_PER_BLOCK = 8;
const TOTAL_COLS = COLS * COL_REPEAT;

function buildTileRows(rowCount: number) {
  return Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: TOTAL_COLS }, (_, col) => {
      const img = CLUB_IMAGES[(row * COLS + (col % COLS)) % CLUB_IMAGES.length];
      return { key: `r${row}-c${col}`, ...img };
    }),
  );
}

function TileWall({ suffix }: { suffix: string }) {
  const rows = buildTileRows(ROWS_PER_BLOCK);

  return (
    <div className="flex flex-col">
      {rows.map((row, rowIdx) => (
        <div
          key={`${suffix}-row-${rowIdx}`}
          className="grid"
          style={{ gridTemplateColumns: `repeat(${TOTAL_COLS}, minmax(0, 1fr))` }}
        >
          {row.map((tile) => (
            <div key={`${suffix}-${tile.key}-${tile.id}`} className="login-club-tile aspect-square overflow-hidden">
              <img
                src={tile.url}
                alt=""
                className="block h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ScrollHalf({ id }: { id: string }) {
  return (
    <div className="flex flex-col">
      <TileWall suffix={`${id}-1`} />
      <TileWall suffix={`${id}-2`} />
      <TileWall suffix={`${id}-3`} />
      <TileWall suffix={`${id}-4`} />
    </div>
  );
}

export function LoginClubShowcase() {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-slate-950"
      aria-hidden
    >
      <div className="login-club-parallax-scene absolute inset-0">
        <div className="login-club-parallax-plane">
          <div className="login-club-scroll-track">
            <ScrollHalf id="a" />
            <ScrollHalf id="b" />
          </div>
        </div>
      </div>

      <div className="login-club-highlight-layer pointer-events-none absolute inset-0" />
    </div>
  );
}
