import type { CanvasElement, LayoutAnalysis, PaperConfig, TextElement } from '../types';

function getElementWeight(element: CanvasElement): number {
  if (element.type === 'text') {
    const textEl = element as TextElement;
    return textEl.fontSize * textEl.text.length * 0.5;
  }
  return element.width * element.height * 0.01;
}

function getElementArea(element: CanvasElement): number {
  return element.width * element.height;
}

export function analyzeLayout(
  elements: CanvasElement[],
  paper: PaperConfig
): LayoutAnalysis {
  if (elements.length === 0) {
    return {
      centerOfGravity: { x: paper.width / 2, y: paper.height / 2 },
      textDensity: 0,
      leftWeight: 0,
      rightWeight: 0,
      topWeight: 0,
      bottomWeight: 0,
      balanceScore: 100,
      marginLeft: paper.width / 2,
      marginRight: paper.width / 2,
      marginTop: paper.height / 2,
      marginBottom: paper.height / 2,
    };
  }

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let leftWeight = 0;
  let rightWeight = 0;
  let topWeight = 0;
  let bottomWeight = 0;
  let totalTextArea = 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const weight = getElementWeight(element);
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;

    totalWeight += weight;
    weightedX += centerX * weight;
    weightedY += centerY * weight;

    if (centerX < paper.width / 2) {
      leftWeight += weight;
    } else {
      rightWeight += weight;
    }

    if (centerY < paper.height / 2) {
      topWeight += weight;
    } else {
      bottomWeight += weight;
    }

    if (element.type === 'text') {
      totalTextArea += getElementArea(element);
    }

    minX = Math.min(minX, element.x);
    maxX = Math.max(maxX, element.x + element.width);
    minY = Math.min(minY, element.y);
    maxY = Math.max(maxY, element.y + element.height);
  }

  const centerX = totalWeight > 0 ? weightedX / totalWeight : paper.width / 2;
  const centerY = totalWeight > 0 ? weightedY / totalWeight : paper.height / 2;

  const horizontalBalance =
    Math.abs(leftWeight - rightWeight) / Math.max(leftWeight + rightWeight, 1);
  const verticalBalance =
    Math.abs(topWeight - bottomWeight) / Math.max(topWeight + bottomWeight, 1);
  const balanceScore = Math.max(0, 100 - (horizontalBalance + verticalBalance) * 50);

  const textDensity = totalTextArea / (paper.width * paper.height);

  return {
    centerOfGravity: { x: centerX, y: centerY },
    textDensity,
    leftWeight,
    rightWeight,
    topWeight,
    bottomWeight,
    balanceScore,
    marginLeft: minX,
    marginRight: paper.width - maxX,
    marginTop: minY,
    marginBottom: paper.height - maxY,
  };
}
