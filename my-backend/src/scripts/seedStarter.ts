import { toJson } from "../lib/json";
import { prisma } from "../lib/prisma";

// Block types and templates that mirror the Figma design ("The Minimal Edit" modules M03-M09, and the
// two other styles). Safe to re-run: everything is upserted by code/version and refreshed in place.

const breakpoints = { mobile: 390, tablet: 768, desktop: 1440 };

const blockTypes = [
  { code: "full-bleed", name: "Full-bleed image", minPhotos: 1, maxPhotos: 1 }, // M03
  { code: "landscape", name: "Landscape image", minPhotos: 1, maxPhotos: 1 }, // M06
  { code: "single-portrait", name: "Single portrait", minPhotos: 1, maxPhotos: 1 }, // M07
  { code: "portrait-pair", name: "Portrait pair", minPhotos: 2, maxPhotos: 2 }, // M04
  { code: "offset-duo", name: "Offset duo", minPhotos: 2, maxPhotos: 2 }, // M05
  { code: "trio", name: "Editorial trio", minPhotos: 3, maxPhotos: 3 }, // M09
  { code: "film-strip", name: "Film strip", minPhotos: 2, maxPhotos: 4 }, // M08 (2, 3 or 4 images)
  { code: "quad-grid", name: "Quad grid", minPhotos: 4, maxPhotos: 4 }, // legacy
];

const templates = [
  {
    code: "minimal-edit",
    name: "The Minimal Edit",
    theme: {
      mode: "light",
      background: "#FAF6F0",
      text: "#2A2825",
      muted: "#7E7973",
      border: "#EADECE",
      accent: "#8B6F56",
      viewer: "#1A1816",
      headingFont: "Instrument Serif",
      bodyFont: "Inter",
    },
  },
  {
    code: "wedding-premiere",
    name: "The Wedding Premiere",
    theme: {
      mode: "dark",
      background: "#0B0A09",
      surface: "#141211",
      border: "#262321",
      text: "#FAF9F6",
      muted: "#A39E98",
      accent: "#E0B66A",
      champagne: "#D4C5B9",
      viewer: "#0B0A09",
      headingFont: "Instrument Serif",
      bodyFont: "Outfit",
    },
  },
  {
    code: "the-keepsake",
    name: "The Keepsake",
    theme: {
      mode: "light",
      background: "#FBF7EF",
      surface: "#FFFFFF",
      border: "#E6D9C3",
      text: "#3B2A24",
      muted: "#8A7466",
      accent: "#9B2D30",
      gold: "#B8893C",
      viewer: "#2A1B17",
      headingFont: "Playfair Display",
      bodyFont: "Lora",
    },
  },
];

const editions = [20, 40, 50];

// Builds a default layout holding exactly `edition` photo slots, three or four blocks per chapter.
function buildLayout(edition: number) {
  const cycle = [
    { blockType: "full-bleed", photos: 1 },
    { blockType: "portrait-pair", photos: 2 },
    { blockType: "landscape", photos: 1 },
    { blockType: "trio", photos: 3 },
    { blockType: "single-portrait", photos: 1 },
    { blockType: "offset-duo", photos: 2 },
    { blockType: "film-strip", photos: 4 },
  ];
  const byCount: Record<number, string> = { 1: "full-bleed", 2: "portrait-pair", 3: "trio", 4: "film-strip" };

  const blocks: { blockType: string; photos: number }[] = [];
  let remaining = edition;

  for (let i = 0; remaining > 0; i++) {
    const wanted = cycle[i % cycle.length]!;
    const photos = Math.min(wanted.photos, remaining);
    blocks.push({ blockType: photos === wanted.photos ? wanted.blockType : byCount[photos]!, photos });
    remaining -= photos;
  }

  const sections: { title: string; blocks: typeof blocks }[] = [];
  for (let i = 0; i < blocks.length; i += 4) {
    sections.push({ title: `Chapter ${sections.length + 1}`, blocks: blocks.slice(i, i + 4) });
  }

  return { sections };
}

async function main() {
  for (const blockType of blockTypes) {
    const data = { name: blockType.name, minPhotos: blockType.minPhotos, maxPhotos: blockType.maxPhotos, responsiveConfig: toJson({ breakpoints }) };
    await prisma.blockType.upsert({ where: { code: blockType.code }, update: data, create: { code: blockType.code, ...data } });
  }

  for (const definition of templates) {
    const template = await prisma.template.upsert({
      where: { code: definition.code },
      update: { name: definition.name },
      create: { code: definition.code, name: definition.name, isActive: true },
    });

    for (const edition of editions) {
      const data = { layoutDefinition: toJson(buildLayout(edition)), themeDefaults: toJson({ breakpoints, ...definition.theme }) };
      await prisma.templateVersion.upsert({
        where: { templateId_version_edition: { templateId: template.id, version: "1.0.0", edition } },
        update: data,
        create: { templateId: template.id, version: "1.0.0", edition, ...data },
      });
    }
  }

  console.log(`Starter data ready: ${blockTypes.length} block types, ${templates.length} templates x ${editions.length} editions.`);
}

main()
  .catch((error) => {
    console.error("Seeding starter data failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
