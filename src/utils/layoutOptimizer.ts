import type {
  CanvasElement,
  PaperConfig,
  TextElement,
  DecorationElement,
  OptimizationResult,
  LayoutAnalysis,
} from '../types';
import { analyzeLayout, getPaperLayoutGuidelines } from './layoutAnalysis';
import { clamp } from './helpers';

function deepCloneElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((el) => ({ ...el }));
}

function optimizeBalance(
  elements: CanvasElement[],
  paper: PaperConfig,
  analysis: LayoutAnalysis,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const { leftWeight, rightWeight, topWeight, bottomWeight } = analysis;

  const totalHWeight = leftWeight + rightWeight;
  const totalVWeight = topWeight + bottomWeight;

  if (totalHWeight === 0 || totalVWeight === 0) return result;

  const hImbalance = (rightWeight - leftWeight) / totalHWeight;
  const vImbalance = (bottomWeight - topWeight) / totalVWeight;

  if (Math.abs(hImbalance) < 0.05 && Math.abs(vImbalance) < 0.05) return result;

  const centerX = paper.width / 2;
  const centerY = paper.height / 2;
  const opticalCenterY = centerY - paper.height * 0.03;

  const shiftFactorX = hImbalance * 0.3;
  const shiftFactorY = vImbalance * 0.2;

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    const elCenterX = el.x + el.width / 2;
    const elCenterY = el.y + el.height / 2;

    const distFromCenterX = elCenterX - centerX;
    const distFromCenterY = elCenterY - opticalCenterY;

    const maxShiftX = paper.width * 0.05;
    const maxShiftY = paper.height * 0.03;

    const shiftX = clamp(-distFromCenterX * shiftFactorX, -maxShiftX, maxShiftX);
    const shiftY = clamp(-distFromCenterY * shiftFactorY, -maxShiftY, maxShiftY);

    if (Math.abs(shiftX) > 1 || Math.abs(shiftY) > 1) {
      const newX = clamp(el.x + shiftX, 0, paper.width - el.width);
      const newY = clamp(el.y + shiftY, 0, paper.height - el.height);

      if (newX !== el.x || newY !== el.y) {
        result[i] = { ...el, x: Math.round(newX), y: Math.round(newY) };
        changedIds.add(el.id);
      }
    }
  }

  return result;
}

function optimizeMargins(
  elements: CanvasElement[],
  paper: PaperConfig,
  analysis: LayoutAnalysis,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const guidelines = getPaperLayoutGuidelines(paper);

  const { marginLeft, marginRight, marginTop, marginBottom } = analysis;
  const recommendedMargin = guidelines.recommendedMargin;

  if (
    marginLeft >= recommendedMargin * 0.8 &&
    marginRight >= recommendedMargin * 0.8 &&
    marginTop >= recommendedMargin * 0.8 &&
    marginBottom >= recommendedMargin * 0.8
  ) {
    return result;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const el of result) {
    minX = Math.min(minX, el.x);
    maxX = Math.max(maxX, el.x + el.width);
    minY = Math.min(minY, el.y);
    maxY = Math.max(maxY, el.y + el.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const availableWidth = paper.width - 2 * recommendedMargin;
  const availableHeight = paper.height - 2 * recommendedMargin;

  let scale = 1;
  if (contentWidth > availableWidth || contentHeight > availableHeight) {
    scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
  }

  const targetMinX = recommendedMargin;
  const targetMinY = recommendedMargin;

  const offsetX = targetMinX - minX;
  const offsetY = targetMinY - minY;

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    let newX = el.x + offsetX;
    let newY = el.y + offsetY;
    let newWidth = el.width;
    let newHeight = el.height;

    if (scale < 1) {
      const centerX = newX + newWidth / 2;
      const centerY = newY + newHeight / 2;
      newWidth = newWidth * scale;
      newHeight = newHeight * scale;
      newX = centerX - newWidth / 2;
      newY = centerY - newHeight / 2;
    }

    newX = clamp(newX, 0, paper.width - newWidth);
    newY = clamp(newY, 0, paper.height - newHeight);

    if (
      Math.abs(newX - el.x) > 1 ||
      Math.abs(newY - el.y) > 1 ||
      Math.abs(newWidth - el.width) > 1 ||
      Math.abs(newHeight - el.height) > 1
    ) {
      const updated = { ...el, x: Math.round(newX), y: Math.round(newY) };

      if (scale < 1) {
        updated.width = Math.round(newWidth);
        updated.height = Math.round(newHeight);

        if (updated.type === 'text') {
          const textEl = updated as TextElement;
          textEl.fontSize = Math.max(8, Math.round(textEl.fontSize * scale));
        }
      }

      result[i] = updated;
      changedIds.add(el.id);
    }
  }

  return result;
}

function optimizeTextHierarchy(
  elements: CanvasElement[],
  paper: PaperConfig,
  analysis: LayoutAnalysis,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const guidelines = getPaperLayoutGuidelines(paper);
  const { textElements } = analysis;

  if (textElements.count < 2) return result;

  const textEls = result.filter((e) => e.type === 'text') as TextElement[];
  if (textEls.length < 2) return result;

  const sorted = [...textEls].sort((a, b) => b.fontSize - a.fontSize);
  const largest = sorted[0];
  const smallest = sorted[sorted.length - 1];

  const currentRatio = largest.fontSize / (smallest.fontSize || 1);

  if (currentRatio >= guidelines.titleBodyRatioMin && currentRatio <= guidelines.titleBodyRatioMax) {
    return result;
  }

  const avgFontSize = textElements.avgFontSize;
  const fontSizeThreshold = avgFontSize * 1.2;

  if (currentRatio > guidelines.titleBodyRatioMax) {
    const scaleDown = guidelines.titleBodyRatioMax / currentRatio;
    for (let i = 0; i < result.length; i++) {
      const el = result[i];
      if (el.type === 'text') {
        const textEl = el as TextElement;
        if (textEl.fontSize > fontSizeThreshold) {
          const newSize = Math.max(10, Math.round(textEl.fontSize * (0.85 + scaleDown * 0.15)));
          if (newSize !== textEl.fontSize) {
            result[i] = { ...textEl, fontSize: newSize };
            changedIds.add(el.id);
          }
        }
      }
    }
  } else if (currentRatio < guidelines.titleBodyRatioMin && textEls.length >= 2) {
    const scaleUp = guidelines.titleBodyRatioMin / currentRatio;
    const biggestId = largest.id;

    for (let i = 0; i < result.length; i++) {
      const el = result[i];
      if (el.type === 'text' && el.id === biggestId) {
        const textEl = el as TextElement;
        const newSize = Math.round(textEl.fontSize * Math.min(scaleUp, 1.3));
        if (newSize !== textEl.fontSize && newSize > textEl.fontSize) {
          result[i] = { ...textEl, fontSize: newSize };
          changedIds.add(el.id);
        }
      }
    }
  }

  return result;
}

function optimizeAlignment(
  elements: CanvasElement[],
  paper: PaperConfig,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const textEls = result.filter((e) => e.type === 'text') as TextElement[];

  if (textEls.length < 3) return result;

  const alignmentCounts: Record<string, number> = {};
  for (const el of textEls) {
    alignmentCounts[el.textAlign] = (alignmentCounts[el.textAlign] || 0) + 1;
  }

  const alignments = Object.entries(alignmentCounts).sort((a, b) => b[1] - a[1]);
  if (alignments.length < 2) return result;

  const dominantAlignment = alignments[0][0] as TextElement['textAlign'];
  const dominantCount = alignments[0][1];

  if (dominantCount < textEls.length * 0.6) return result;

  const leftXValues = textEls
    .filter((t) => t.textAlign === dominantAlignment)
    .map((t) => t.x)
    .sort((a, b) => a - b);

  if (leftXValues.length === 0) return result;

  const medianX = leftXValues[Math.floor(leftXValues.length / 2)];

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    if (el.type === 'text') {
      const textEl = el as TextElement;
      let changed = false;
      const updated = { ...textEl };

      if (textEl.textAlign !== dominantAlignment) {
        updated.textAlign = dominantAlignment;
        changed = true;
      }

      if (dominantAlignment === 'left' || dominantAlignment === 'center') {
        const distance = Math.abs(textEl.x - medianX);
        if (distance > 5 && distance < paper.width * 0.1) {
          updated.x = Math.round(medianX);
          changed = true;
        }
      }

      if (changed) {
        result[i] = updated;
        changedIds.add(el.id);
      }
    }
  }

  return result;
}

function optimizeTextSpacing(
  elements: CanvasElement[],
  paper: PaperConfig,
  analysis: LayoutAnalysis,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const textEls = result.filter((e) => e.type === 'text') as TextElement[];

  if (textEls.length < 3) return result;

  const sortedByY = [...textEls].sort((a, b) => a.y - b.y);

  const gaps: number[] = [];
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const gap = sortedByY[i + 1].y - (sortedByY[i].y + sortedByY[i].height);
    if (gap > 0) gaps.push(gap);
  }

  if (gaps.length === 0) return result;

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const targetGap = Math.max(analysis.textElements.avgFontSize * 0.8, avgGap * 1.1);

  if (avgGap >= targetGap * 0.9) return result;

  const totalContentHeight =
    sortedByY[sortedByY.length - 1].y +
    sortedByY[sortedByY.length - 1].height -
    sortedByY[0].y;

  const newTotalGap = targetGap * (sortedByY.length - 1);
  const newHeight = totalContentHeight - (avgGap * (sortedByY.length - 1)) + newTotalGap;

  const startY = sortedByY[0].y;
  const endY = startY + newHeight;

  if (endY > paper.height - 20) return result;

  let currentY = startY;
  for (let i = 0; i < sortedByY.length; i++) {
    const el = sortedByY[i];
    const idx = result.findIndex((e) => e.id === el.id);
    if (idx !== -1) {
      if (Math.abs(result[idx].y - currentY) > 1) {
        result[idx] = { ...result[idx], y: Math.round(currentY) };
        changedIds.add(el.id);
      }
      currentY += result[idx].height + targetGap;
    }
  }

  return result;
}

function optimizeDecorationSize(
  elements: CanvasElement[],
  analysis: LayoutAnalysis,
  guidelines: ReturnType<typeof getPaperLayoutGuidelines>,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);
  const { decorationElements, textElements } = analysis;

  if (decorationElements.count === 0 || textElements.count === 0) return result;

  const totalTextWeight = textElements.totalArea * 0.01;
  const decoWeightRatio =
    decorationElements.totalWeight / (totalTextWeight + decorationElements.totalWeight);

  if (decoWeightRatio <= guidelines.maxDecorationWeightRatio) return result;

  const scaleFactor =
    (guidelines.maxDecorationWeightRatio * 0.8 * (totalTextWeight + decorationElements.totalWeight)) /
    decorationElements.totalWeight;

  const scale = Math.sqrt(scaleFactor);

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    if (el.type === 'decoration') {
      const deco = el as DecorationElement;
      const centerX = deco.x + deco.width / 2;
      const centerY = deco.y + deco.height / 2;

      const newWidth = Math.max(10, deco.width * scale);
      const newHeight = Math.max(10, deco.height * scale);
      const newX = centerX - newWidth / 2;
      const newY = centerY - newHeight / 2;

      result[i] = {
        ...deco,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      };
      changedIds.add(el.id);
    }
  }

  return result;
}

function ensureNoOverflow(
  elements: CanvasElement[],
  paper: PaperConfig,
  changedIds: Set<string>
): CanvasElement[] {
  const result = deepCloneElements(elements);

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    const newX = clamp(el.x, 0, paper.width - el.width);
    const newY = clamp(el.y, 0, paper.height - el.height);

    if (newX !== el.x || newY !== el.y) {
      result[i] = { ...el, x: Math.round(newX), y: Math.round(newY) };
      changedIds.add(el.id);
    }
  }

  return result;
}

function checkTextOverlap(elements: CanvasElement[]): boolean {
  const textEls = elements.filter((e) => e.type === 'text') as TextElement[];

  for (let i = 0; i < textEls.length; i++) {
    for (let j = i + 1; j < textEls.length; j++) {
      const a = textEls[i];
      const b = textEls[j];

      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

      if (overlapX > 0 && overlapY > 0) {
        const overlapArea = overlapX * overlapY;
        const minArea = Math.min(a.width * a.height, b.width * b.height);
        if (overlapArea >= minArea * 0.5) {
          return true;
        }
      }
    }
  }

  return false;
}

export function optimizeLayout(
  elements: CanvasElement[],
  paper: PaperConfig
): OptimizationResult {
  if (elements.length === 0) {
    return {
      elements: [],
      changedElementIds: [],
      description: '没有元素可优化',
    };
  }

  const changedIds = new Set<string>();
  let optimized = deepCloneElements(elements);

  const guidelines = getPaperLayoutGuidelines(paper);
  let analysis = analyzeLayout(optimized, paper);

  optimized = optimizeMargins(optimized, paper, analysis, changedIds);
  analysis = analyzeLayout(optimized, paper);

  optimized = optimizeBalance(optimized, paper, analysis, changedIds);
  analysis = analyzeLayout(optimized, paper);

  optimized = optimizeTextHierarchy(optimized, paper, analysis, changedIds);
  analysis = analyzeLayout(optimized, paper);

  optimized = optimizeTextSpacing(optimized, paper, analysis, changedIds);
  analysis = analyzeLayout(optimized, paper);

  optimized = optimizeDecorationSize(optimized, analysis, guidelines, changedIds);

  optimized = optimizeAlignment(optimized, paper, changedIds);

  optimized = ensureNoOverflow(optimized, paper, changedIds);

  if (checkTextOverlap(optimized)) {
    return {
      elements: deepCloneElements(elements),
      changedElementIds: [],
      description: '优化后可能导致文字重叠，已保持原样',
    };
  }

  const changedElementIds = Array.from(changedIds);

  let description: string;
  if (changedElementIds.length === 0) {
    description = '版面已处于良好状态，无需调整';
  } else {
    const changeTypes: string[] = [];

    const beforeAnalysis = analyzeLayout(elements, paper);
    const afterAnalysis = analyzeLayout(optimized, paper);

    if (afterAnalysis.balanceScore > beforeAnalysis.balanceScore + 2) {
      changeTypes.push('平衡视觉重量');
    }
    if (
      Math.min(afterAnalysis.marginLeft, afterAnalysis.marginRight, afterAnalysis.marginTop, afterAnalysis.marginBottom) >
      Math.min(beforeAnalysis.marginLeft, beforeAnalysis.marginRight, beforeAnalysis.marginTop, beforeAnalysis.marginBottom)
    ) {
      changeTypes.push('改善边距留白');
    }
    if (afterAnalysis.textElements.avgFontSize !== beforeAnalysis.textElements.avgFontSize) {
      changeTypes.push('优化文字层级');
    }
    if (afterAnalysis.decorationElements.totalWeight < beforeAnalysis.decorationElements.totalWeight * 0.95) {
      changeTypes.push('调整装饰元素');
    }

    description = changeTypes.length > 0
      ? `已优化 ${changedElementIds.length} 个元素：${changeTypes.join('、')}`
      : `已微调 ${changedElementIds.length} 个元素的位置和尺寸`;
  }

  return {
    elements: optimized,
    changedElementIds,
    description,
  };
}

export function optimizeForPaperSize(
  elements: CanvasElement[],
  oldPaper: PaperConfig,
  newPaper: PaperConfig
): OptimizationResult {
  if (elements.length === 0) {
    return { elements: [], changedElementIds: [], description: '没有元素' };
  }

  const changedIds = new Set<string>();
  const result = deepCloneElements(elements);

  const scaleX = newPaper.width / oldPaper.width;
  const scaleY = newPaper.height / oldPaper.height;
  const scale = Math.min(scaleX, scaleY) * 0.9;

  const oldCenterX = oldPaper.width / 2;
  const oldCenterY = oldPaper.height / 2;
  const newCenterX = newPaper.width / 2;
  const newCenterY = newPaper.height / 2;

  for (let i = 0; i < result.length; i++) {
    const el = result[i];

    const relX = (el.x + el.width / 2 - oldCenterX) / oldPaper.width;
    const relY = (el.y + el.height / 2 - oldCenterY) / oldPaper.height;

    const newWidth = Math.max(10, el.width * scale);
    const newHeight = Math.max(10, el.height * scale);

    let newX = newCenterX + relX * newPaper.width - newWidth / 2;
    let newY = newCenterY + relY * newPaper.height - newHeight / 2;

    newX = clamp(newX, 0, newPaper.width - newWidth);
    newY = clamp(newY, 0, newPaper.height - newHeight);

    const updated = {
      ...el,
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    } as CanvasElement;

    if (updated.type === 'text') {
      const textEl = updated as TextElement;
      textEl.fontSize = Math.max(8, Math.round(textEl.fontSize * scale));
    }

    result[i] = updated;
    changedIds.add(el.id);
  }

  const analysis = analyzeLayout(result, newPaper);
  const optimized = optimizeBalance(result, newPaper, analysis, changedIds);

  if (checkTextOverlap(optimized)) {
    return {
      elements: result,
      changedElementIds: Array.from(changedIds),
      description: '已按新纸张尺寸缩放元素',
    };
  }

  return {
    elements: optimized,
    changedElementIds: Array.from(changedIds),
    description: '已根据新纸张尺寸智能调整布局',
  };
}
