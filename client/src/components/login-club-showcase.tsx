import { getAllClubTypeImages } from "@/lib/clubTypeImages";

const CLUB_IMAGES = getAllClubTypeImages();

function ScrollingGrid({ suffix }: { suffix: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 pb-3">
      {CLUB_IMAGES.map((img) => (
        <div
          key={`${suffix}-${img.id}`}
          className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20"
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
  );
}

function ScrollHalf({ id }: { id: string }) {
  return (
    <div className="flex flex-col pt-3">
      <ScrollingGrid suffix={`${id}-a`} />
      <ScrollingGrid suffix={`${id}-b`} />
      <ScrollingGrid suffix={`${id}-c`} />
    </div>
  );
}

export function LoginClubShowcase() {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      aria-hidden
    >
      <div className="login-club-scroll-track absolute left-0 right-0 top-0">
        <ScrollHalf id="half-1" />
        <ScrollHalf id="half-2" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50" />
    </div>
  );
}
