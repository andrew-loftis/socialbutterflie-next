export type CompanyTilePreset = {
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  featured?: boolean;
  clipPath?: string;
};

export type CompanySelectorPreset = {
  columns: number;
  rowHeight: number;
  items: CompanyTilePreset[];
};

const PRESETS: Record<number, CompanySelectorPreset> = {
  1: {
    columns: 12,
    rowHeight: 360,
    items: [{ colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 1, featured: true }],
  },
  2: {
    columns: 12,
    rowHeight: 300,
    items: [
      { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 1, featured: true },
      { colStart: 7, colSpan: 6, rowStart: 1, rowSpan: 1 },
    ],
  },
  3: {
    columns: 12,
    rowHeight: 210,
    items: [
      { colStart: 1, colSpan: 8, rowStart: 1, rowSpan: 2, featured: true },
      { colStart: 9, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 2, rowSpan: 1 },
    ],
  },
  4: {
    columns: 12,
    rowHeight: 250,
    items: [
      { colStart: 1, colSpan: 3, rowStart: 1, rowSpan: 1, clipPath: 'polygon(10% 0%, 100% 0%, 88% 100%, 0% 100%)' },
      { colStart: 4, colSpan: 3, rowStart: 1, rowSpan: 1, featured: true, clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)' },
      { colStart: 7, colSpan: 3, rowStart: 1, rowSpan: 1, clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)' },
      { colStart: 10, colSpan: 3, rowStart: 1, rowSpan: 1, clipPath: 'polygon(12% 0%, 92% 0%, 80% 100%, 0% 100%)' },
    ],
  },
  5: {
    columns: 12,
    rowHeight: 190,
    items: [
      { colStart: 1, colSpan: 8, rowStart: 1, rowSpan: 2, featured: true },
      { colStart: 9, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 1, colSpan: 4, rowStart: 3, rowSpan: 1 },
      { colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 1 },
    ],
  },
  6: {
    columns: 12,
    rowHeight: 180,
    items: [
      { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 1, featured: true },
      { colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 1, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 5, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 2, rowSpan: 1 },
    ],
  },
  7: {
    columns: 12,
    rowHeight: 170,
    items: [
      { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 2, featured: true },
      { colStart: 7, colSpan: 3, rowStart: 1, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 1, rowSpan: 1 },
      { colStart: 7, colSpan: 3, rowStart: 2, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 2, rowSpan: 1 },
      { colStart: 1, colSpan: 4, rowStart: 3, rowSpan: 1 },
      { colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 1 },
    ],
  },
  8: {
    columns: 12,
    rowHeight: 170,
    items: [
      { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 2, featured: true },
      { colStart: 7, colSpan: 6, rowStart: 1, rowSpan: 2 },
      { colStart: 1, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 4, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 7, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 1, colSpan: 6, rowStart: 4, rowSpan: 1 },
      { colStart: 7, colSpan: 6, rowStart: 4, rowSpan: 1 },
    ],
  },
  9: {
    columns: 12,
    rowHeight: 160,
    items: [
      { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 1, featured: true },
      { colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 1, rowSpan: 1 },
      { colStart: 1, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 5, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 2, rowSpan: 1 },
      { colStart: 1, colSpan: 4, rowStart: 3, rowSpan: 1 },
      { colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 1 },
      { colStart: 9, colSpan: 4, rowStart: 3, rowSpan: 1 },
    ],
  },
  10: {
    columns: 12,
    rowHeight: 150,
    items: [
      { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 2, featured: true },
      { colStart: 7, colSpan: 3, rowStart: 1, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 1, rowSpan: 1 },
      { colStart: 7, colSpan: 3, rowStart: 2, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 2, rowSpan: 1 },
      { colStart: 1, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 4, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 7, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 10, colSpan: 3, rowStart: 3, rowSpan: 1 },
      { colStart: 1, colSpan: 12, rowStart: 4, rowSpan: 1 },
    ],
  },
};

export function getSelectorPreset(companyCount: number) {
  if (companyCount <= 0) return PRESETS[1];
  if (companyCount > 10) return PRESETS[10];
  return PRESETS[companyCount];
}

