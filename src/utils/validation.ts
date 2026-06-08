import type {
  CanvasElement,
  PaperConfig,
  ValidationIssue,
  TextElement,
  LeadElement,
} from '../types';
import { analyzeLayout } from './layoutAnalysis';

export function validateElementBounds(
  element: CanvasElement,
  paper: PaperConfig
): ValidationIssue | null {
  const { x, y, width, height, rotation } = element;

  if (rotation === 0 || rotation === 180) {
    if (x < 0 || x + width > paper.width || y < 0 || y + height > paper.height) {
      return {
        id: `overflow-${element.id}`,
        type: 'overflow',
        severity: 'error',
        message: `元素「${getElementName(element)}」超出纸张边界`,
        elementIds: [element.id],
      };
    }
  } else {
    const radians = (rotation * Math.PI) / 180;
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];

    const rotatedCorners = corners.map((corner) => {
      const cx = width / 2;
      const cy = height / 2;
      const dx = corner.x - cx;
      const dy = corner.y - cy;
      return {
        x: x + cx + dx * Math.cos(radians) - dy * Math.sin(radians),
        y: y + cy + dx * Math.sin(radians) + dy * Math.cos(radians),
      };
    });

    const minX = Math.min(...rotatedCorners.map((c) => c.x));
    const maxX = Math.max(...rotatedCorners.map((c) => c.x));
    const minY = Math.min(...rotatedCorners.map((c) => c.y));
    const maxY = Math.max(...rotatedCorners.map((c) => c.y));

    if (minX < 0 || maxX > paper.width || minY < 0 || maxY > paper.height) {
      return {
        id: `overflow-${element.id}`,
        type: 'overflow',
        severity: 'error',
        message: `元素「${getElementName(element)}」旋转后超出纸张边界`,
        elementIds: [element.id],
      };
    }
  }

  return null;
}

export function validateElementSize(element: CanvasElement): ValidationIssue | null {
  if (element.type === 'text') {
    const textEl = element as TextElement;
    if (textEl.fontSize <= 0) {
      return {
        id: `size-${element.id}-font`,
        type: 'size',
        severity: 'error',
        message: `文字「${textEl.text.slice(0, 10)}」的字号必须大于 0`,
        elementIds: [element.id],
      };
    }
  }

  if (element.type === 'lead') {
    const leadEl = element as LeadElement;
    if (leadEl.width <= 0 || leadEl.height <= 0) {
      return {
        id: `size-${element.id}-lead`,
        type: 'size',
        severity: 'error',
        message: `铅条尺寸必须大于 0`,
        elementIds: [element.id],
      };
    }
  }

  if (element.width <= 0 || element.height <= 0) {
    return {
      id: `size-${element.id}`,
      type: 'size',
      severity: 'error',
      message: `元素尺寸必须大于 0`,
      elementIds: [element.id],
    };
  }

  return null;
}

export function validateTextOverlap(elements: CanvasElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const textElements = elements.filter((e) => e.type === 'text') as TextElement[];

  for (let i = 0; i < textElements.length; i++) {
    for (let j = i + 1; j < textElements.length; j++) {
      const a = textElements[i];
      const b = textElements[j];

      const aRect = {
        left: a.x,
        right: a.x + a.width,
        top: a.y,
        bottom: a.y + a.height,
      };
      const bRect = {
        left: b.x,
        right: b.x + b.width,
        top: b.y,
        bottom: b.y + b.height,
      };

      const overlapX = Math.min(aRect.right, bRect.right) - Math.max(aRect.left, bRect.left);
      const overlapY = Math.min(aRect.bottom, bRect.bottom) - Math.max(aRect.top, bRect.top);

      if (overlapX > 0 && overlapY > 0) {
        const overlapArea = overlapX * overlapY;
        const aArea = a.width * a.height;
        const bArea = b.width * b.height;
        const minArea = Math.min(aArea, bArea);

        if (overlapArea >= minArea * 0.95) {
          issues.push({
            id: `overlap-${a.id}-${b.id}`,
            type: 'overlap',
            severity: 'error',
            message: `文字块「${a.text.slice(0, 10)}」与「${b.text.slice(0, 10)}」完全重叠`,
            elementIds: [a.id, b.id],
          });
        }
      }
    }
  }

  return issues;
}

export function validateDensity(
  elements: CanvasElement[],
  paper: PaperConfig
): ValidationIssue | null {
  const analysis = analyzeLayout(elements, paper);

  if (analysis.textDensity > 0.6) {
    return {
      id: 'density-high',
      type: 'density',
      severity: 'warning',
      message: `文字密度过高 (${(analysis.textDensity * 100).toFixed(1)}%)，版面过于拥挤`,
    };
  }

  if (analysis.textDensity > 0 && analysis.textDensity < 0.05) {
    return {
      id: 'density-low',
      type: 'density',
      severity: 'warning',
      message: `文字密度过低 (${(analysis.textDensity * 100).toFixed(1)}%)，版面过于空旷`,
    };
  }

  return null;
}

export function validateBalance(
  elements: CanvasElement[],
  paper: PaperConfig
): ValidationIssue | null {
  const analysis = analyzeLayout(elements, paper);

  if (elements.length === 0) return null;

  if (analysis.balanceScore < 30) {
    return {
      id: 'imbalance-severe',
      type: 'imbalance',
      severity: 'error',
      message: `版面严重失衡（平衡度 ${analysis.balanceScore.toFixed(1)} 分），请调整元素位置`,
    };
  }

  if (analysis.balanceScore < 60) {
    return {
      id: 'imbalance-moderate',
      type: 'imbalance',
      severity: 'warning',
      message: `版面略显失衡（平衡度 ${analysis.balanceScore.toFixed(1)} 分），建议调整左右重量分布`,
    };
  }

  return null;
}

export function runAllValidations(
  elements: CanvasElement[],
  paper: PaperConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const element of elements) {
    const boundIssue = validateElementBounds(element, paper);
    if (boundIssue) issues.push(boundIssue);

    const sizeIssue = validateElementSize(element);
    if (sizeIssue) issues.push(sizeIssue);
  }

  issues.push(...validateTextOverlap(elements));

  const densityIssue = validateDensity(elements, paper);
  if (densityIssue) issues.push(densityIssue);

  const balanceIssue = validateBalance(elements, paper);
  if (balanceIssue) issues.push(balanceIssue);

  return issues;
}

function getElementName(element: CanvasElement): string {
  switch (element.type) {
    case 'text':
      return (element as TextElement).text.slice(0, 15);
    case 'lead':
      return '铅条';
    case 'decoration':
      return '装饰元素';
    default:
      return '元素';
  }
}
