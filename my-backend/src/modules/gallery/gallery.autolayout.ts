// Turns an ordered list of photos into gallery blocks, so a host only has to choose photos and
// their order. Pure functions (no database), so the rhythm is easy to test and tune.

export type LayoutPhoto = { id: string; width: number | null; height: number | null };
export type BlockTypeLimits = { min: number; max: number };
export type PlannedBlock = { code: string; photoIds: string[] };

// Photos per block, repeated: a calm single, a pair, a trio, a single, a pair, a strip of four...
const RHYTHM = [1, 2, 3, 1, 2, 4];

const isPortrait = (photo: LayoutPhoto) => photo.width !== null && photo.height !== null && photo.height > photo.width * 1.1;

function chooseCode(chunk: LayoutPhoto[], index: number, types: Map<string, BlockTypeLimits>): string {
  const n = chunk.length;
  const fits = (code: string) => {
    const limits = types.get(code);
    return limits !== undefined && n >= limits.min && n <= limits.max;
  };
  const prefer = (...codes: string[]) => codes.find(fits);
  const allPortrait = chunk.every(isPortrait);

  let code: string | undefined;
  switch (n) {
    case 1:
      code = isPortrait(chunk[0]!)
        ? prefer("single-portrait", "full-bleed", "landscape")
        : index % 3 === 0
          ? prefer("full-bleed", "landscape", "single-portrait")
          : prefer("landscape", "full-bleed", "single-portrait");
      break;
    case 2:
      code = allPortrait
        ? prefer("portrait-pair", "film-strip", "offset-duo")
        : index % 2 === 0
          ? prefer("offset-duo", "film-strip", "portrait-pair")
          : prefer("film-strip", "portrait-pair", "offset-duo");
      break;
    case 3:
      code = prefer("trio", "film-strip");
      break;
    default:
      code = prefer("film-strip", "quad-grid");
  }

  if (!code) throw new Error(`No block type is configured for ${n} photo(s)`);
  return code;
}

export function planBlocks(photos: LayoutPhoto[], types: Map<string, BlockTypeLimits>): PlannedBlock[] {
  const blocks: PlannedBlock[] = [];
  let position = 0;
  let rhythmStep = 0;

  while (position < photos.length) {
    const size = Math.min(RHYTHM[rhythmStep % RHYTHM.length]!, photos.length - position);
    rhythmStep++;

    const chunk = photos.slice(position, position + size);
    position += size;

    blocks.push({ code: chooseCode(chunk, blocks.length, types), photoIds: chunk.map((photo) => photo.id) });
  }

  return blocks;
}
