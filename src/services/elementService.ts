import type {
  CanvasElement,
  TextElement,
  LeadElement,
  DecorationElement,
  PaperConfig,
} from '../types';
import { generateId, clamp } from '../utils/helpers';
import { validateTextOverlap } from '../utils/validation';

export function createTextElement(
  x: number,
  y: number,
  overrides?: Partial<TextElement>
): TextElement {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 200,
    height: 30,
    rotation: 0,
    text: '请输入文字',
    fontSize: 24,
    fontFamily: 'Georgia',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fill: '#333333',
    ...overrides,
  };
}

export function createLeadElement(
  x: number,
  y: number,
  overrides?: Partial<LeadElement>
): LeadElement {
  return {
    id: generateId(),
    type: 'lead',
    x,
    y,
    width: 200,
    height: 4,
    rotation: 0,
    fill: '#333333',
    ...overrides,
  };
}

export function createDecorationElement(
  x: number,
  y: number,
  overrides?: Partial<DecorationElement>
): DecorationElement {
  return {
    id: generateId(),
    type: 'decoration',
    shape: 'rect',
    x,
    y,
    width: 60,
    height: 60,
    rotation: 0,
    fill: 'transparent',
    strokeWidth: 2,
    strokeColor: '#333333',
    ...overrides,
  };
}

export function addElement(
  elements: CanvasElement[],
  element: CanvasElement
): CanvasElement[] {
  return [...elements, element];
}

export function addElements(
  elements: CanvasElement[],
  newElements: CanvasElement[]
): CanvasElement[] {
  return [...elements, ...newElements];
}

export function removeElement(
  elements: CanvasElement[],
  elementId: string
): CanvasElement[] {
  return elements.filter((e) => e.id !== elementId);
}

export function removeElements(
  elements: CanvasElement[],
  elementIds: string[]
): CanvasElement[] {
  const idSet = new Set(elementIds);
  return elements.filter((e) => !idSet.has(e.id));
}

export function updateElement(
  elements: CanvasElement[],
  elementId: string,
  updates: Partial<CanvasElement>
): CanvasElement[] {
  return elements.map((el) => {
    if (el.id !== elementId) return el;
    if (el.type === 'text') {
      return { ...el, ...updates } as TextElement;
    }
    if (el.type === 'lead') {
      return { ...el, ...updates } as LeadElement;
    }
    return { ...el, ...updates } as DecorationElement;
  });
}

export function getElementById(
  elements: CanvasElement[],
  elementId: string
): CanvasElement | undefined {
  return elements.find((e) => e.id === elementId);
}

export function moveElement(
  elements: CanvasElement[],
  elementId: string,
  x: number,
  y: number
): CanvasElement[] {
  return elements.map((el) =>
    el.id === elementId ? { ...el, x: Math.round(x), y: Math.round(y) } : el
  );
}

export function canUpdateElement(
  element: CanvasElement,
  updates: Partial<CanvasElement>,
  paper: PaperConfig
): boolean {
  const updated = { ...element, ...updates } as CanvasElement;

  if (updated.type === 'text') {
    if ((updated as TextElement).fontSize <= 0) return false;
  }

  if (updated.width <= 0 || updated.height <= 0) return false;

  return true;
}

export function clampElementToPaper(
  element: CanvasElement,
  paper: PaperConfig
): CanvasElement {
  return {
    ...element,
    x: clamp(element.x, 0, paper.width - element.width),
    y: clamp(element.y, 0, paper.height - element.height),
  };
}

export function validateAndUpdateElement(
  elements: CanvasElement[],
  elementId: string,
  updates: Partial<CanvasElement>,
  paper: PaperConfig
): { success: boolean; elements: CanvasElement[] } {
  const element = getElementById(elements, elementId);
  if (!element) {
    return { success: false, elements };
  }

  const updated = { ...element, ...updates } as CanvasElement;

  if (!canUpdateElement(element, updates, paper)) {
    return { success: false, elements };
  }

  const clamped = clampElementToPaper(updated, paper);

  if (clamped.type === 'text') {
    const otherElements = elements.filter((el) => el.id !== elementId);
    const testElements = [...otherElements, clamped];
    const overlapIssues = validateTextOverlap(testElements);
    if (overlapIssues.length > 0) {
      return { success: false, elements };
    }
  }

  const newElements = updateElement(elements, elementId, clamped);
  return { success: true, elements: newElements };
}

export function cloneElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((el) => ({ ...el }));
}

export function cloneElementsWithNewIds(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((el) => ({ ...el, id: generateId() }));
}

export interface TextElementStats {
  count: number;
  maxFontSize: number;
  avgFontSize: number;
  titleElements: TextElement[];
  bodyElements: TextElement[];
}

export function getTextElementStats(elements: CanvasElement[]): TextElementStats {
  const textElements = elements.filter((e) => e.type === 'text') as TextElement[];
  const count = textElements.length;

  if (count === 0) {
    return {
      count: 0,
      maxFontSize: 0,
      avgFontSize: 0,
      titleElements: [],
      bodyElements: [],
    };
  }

  const sorted = [...textElements].sort((a, b) => b.fontSize - a.fontSize);
  const maxFontSize = sorted[0].fontSize;
  const avgFontSize = sorted.reduce((sum, el) => sum + el.fontSize, 0) / count;

  const titleCount = Math.min(2, count);
  const titleElements = sorted.slice(0, titleCount);
  const bodyElements = sorted.slice(titleCount);

  return {
    count,
    maxFontSize,
    avgFontSize,
    titleElements,
    bodyElements,
  };
}
