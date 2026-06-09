import type { CanvasElement, DesignData, PaperConfig, DesignItem } from '../types';
import { generateId } from './helpers';

const EXPORT_VERSION = '1.0.0';
const DESIGNS_STORAGE_KEY = 'typography_designs';

export interface SavedDesign {
  id: string;
  name: string;
  paper: PaperConfig;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: string | null;
}

const VALID_TYPES = ['text', 'lead', 'decoration'] as const;
const VALID_DECORATION_SHAPES = ['line', 'circle', 'rect', 'diamond'] as const;
const VALID_FONT_WEIGHTS = ['normal', 'bold'] as const;
const VALID_FONT_STYLES = ['normal', 'italic'] as const;
const VALID_TEXT_ALIGNS = ['left', 'center', 'right'] as const;

export function exportDesign(elements: CanvasElement[], paper: PaperConfig): string {
  const data: DesignData = {
    version: EXPORT_VERSION,
    paper: { ...paper },
    elements: elements.map((el) => ({ ...el })),
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

function validateBaseElement(el: unknown): el is Record<string, unknown> {
  if (typeof el !== 'object' || el === null) return false;
  const obj = el as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    VALID_TYPES.includes(obj.type as typeof VALID_TYPES[number]) &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.width === 'number' &&
    typeof obj.height === 'number' &&
    typeof obj.rotation === 'number' &&
    obj.width > 0 &&
    obj.height > 0
  );
}

function validateTextElement(el: Record<string, unknown>): boolean {
  return (
    typeof el.text === 'string' &&
    typeof el.fontSize === 'number' &&
    typeof el.fontFamily === 'string' &&
    VALID_FONT_WEIGHTS.includes(el.fontWeight as typeof VALID_FONT_WEIGHTS[number]) &&
    VALID_FONT_STYLES.includes(el.fontStyle as typeof VALID_FONT_STYLES[number]) &&
    VALID_TEXT_ALIGNS.includes(el.textAlign as typeof VALID_TEXT_ALIGNS[number]) &&
    typeof el.fill === 'string' &&
    (el.fontSize as number) > 0
  );
}

function validateLeadElement(el: Record<string, unknown>): boolean {
  return typeof el.fill === 'string';
}

function validateDecorationElement(el: Record<string, unknown>): boolean {
  return (
    VALID_DECORATION_SHAPES.includes(el.shape as typeof VALID_DECORATION_SHAPES[number]) &&
    typeof el.fill === 'string' &&
    typeof el.strokeWidth === 'number' &&
    typeof el.strokeColor === 'string' &&
    (el.strokeWidth as number) >= 0
  );
}

export function importDesign(json: string): DesignData | null {
  try {
    const data = JSON.parse(json);

    if (typeof data !== 'object' || data === null) {
      console.error('Invalid design format: not an object');
      return null;
    }

    if (!data.version || typeof data.version !== 'string') {
      console.error('Invalid design format: missing or invalid version');
      return null;
    }

    if (!data.paper || typeof data.paper !== 'object') {
      console.error('Invalid design format: missing paper config');
      return null;
    }

    const paper = data.paper as Record<string, unknown>;
    if (
      typeof paper.width !== 'number' ||
      typeof paper.height !== 'number' ||
      typeof paper.backgroundColor !== 'string' ||
      paper.width <= 0 ||
      paper.height <= 0
    ) {
      console.error('Invalid design format: invalid paper dimensions');
      return null;
    }

    if (!Array.isArray(data.elements)) {
      console.error('Invalid design format: elements is not an array');
      return null;
    }

    const seenIds = new Set<string>();
    for (const element of data.elements) {
      if (!validateBaseElement(element)) {
        console.error('Invalid element: base fields missing or invalid');
        return null;
      }

      if (seenIds.has(element.id as string)) {
        console.error('Invalid element: duplicate id', element.id);
        return null;
      }
      seenIds.add(element.id as string);

      switch (element.type) {
        case 'text':
          if (!validateTextElement(element as Record<string, unknown>)) {
            console.error('Invalid text element: missing or invalid fields');
            return null;
          }
          break;
        case 'lead':
          if (!validateLeadElement(element as Record<string, unknown>)) {
            console.error('Invalid lead element: missing or invalid fields');
            return null;
          }
          break;
        case 'decoration':
          if (!validateDecorationElement(element as Record<string, unknown>)) {
            console.error('Invalid decoration element: missing or invalid fields');
            return null;
          }
          break;
        default:
          console.error('Unknown element type:', element.type);
          return null;
      }
    }

    if (data.createdAt && typeof data.createdAt !== 'string') {
      console.error('Invalid design format: createdAt is not a string');
      return null;
    }

    return data as DesignData;
  } catch (e) {
    console.error('Failed to parse design JSON:', e);
    return null;
  }
}

export function downloadDesignFile(
  elements: CanvasElement[],
  paper: PaperConfig,
  filename: string = 'typography-design.json'
) {
  const json = exportDesign(elements, paper);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDesignsFromStorage(): SavedDesign[] {
  try {
    const stored = localStorage.getItem(DESIGNS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load designs from storage:', e);
  }
  return [];
}

function saveDesignsToStorage(designs: SavedDesign[]): void {
  try {
    localStorage.setItem(DESIGNS_STORAGE_KEY, JSON.stringify(designs));
  } catch (e) {
    console.error('Failed to save designs to storage:', e);
  }
}

export function saveDesignToLibrary(
  elements: CanvasElement[],
  paper: PaperConfig,
  options: { name: string; thumbnail?: string | null }
): SavedDesign {
  const designs = getDesignsFromStorage();
  const now = new Date().toISOString();

  const design: SavedDesign = {
    id: generateId(),
    name: options.name,
    paper: { ...paper },
    elements: elements.map((el) => ({ ...el })),
    createdAt: now,
    updatedAt: now,
    thumbnail: options.thumbnail || null,
  };

  designs.push(design);
  saveDesignsToStorage(designs);
  return design;
}

export function getAllDesigns(): SavedDesign[] {
  return getDesignsFromStorage();
}

export function getDesignById(id: string): SavedDesign | null {
  const designs = getDesignsFromStorage();
  return designs.find((d) => d.id === id) || null;
}

export function updateDesignInLibrary(
  id: string,
  updates: Partial<SavedDesign>
): SavedDesign | null {
  const designs = getDesignsFromStorage();
  const index = designs.findIndex((d) => d.id === id);

  if (index < 0) return null;

  designs[index] = {
    ...designs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveDesignsToStorage(designs);
  return designs[index];
}

export function deleteDesignFromLibrary(id: string): void {
  const designs = getDesignsFromStorage();
  const filtered = designs.filter((d) => d.id !== id);
  saveDesignsToStorage(filtered);
}

export function getDesignItems(): DesignItem[] {
  const designs = getDesignsFromStorage();
  return designs.map((d) => ({
    id: d.id,
    name: d.name,
    paper: d.paper,
    elements: d.elements,
    thumbnail: d.thumbnail,
    updatedAt: d.updatedAt,
  }));
}
