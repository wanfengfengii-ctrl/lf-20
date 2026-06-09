import type {
  CanvasElement,
  LayoutAnalysis,
  PaperConfig,
  TextElement,
  DecorationElement,
  LeadElement,
  DiagnosisSuggestion,
  LayoutDiagnosis,
  PaperSizeCategory,
  PaperLayoutGuidelines,
} from '../types';

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

export function getPaperSizeCategory(paper: PaperConfig): PaperSizeCategory {
  const area = paper.width * paper.height;
  if (area <= 252 * 144 * 1.2) return 'business_card';
  if (area <= 420 * 595 * 1.1) return 'small';
  if (area <= 612 * 842 * 1.1) return 'medium';
  if (area <= 1000 * 1400) return 'large';
  return 'poster';
}

export function getPaperLayoutGuidelines(paper: PaperConfig): PaperLayoutGuidelines {
  const category = getPaperSizeCategory(paper);
  const minDimension = Math.min(paper.width, paper.height);

  switch (category) {
    case 'business_card':
      return {
        minMargin: minDimension * 0.05,
        recommendedMargin: minDimension * 0.08,
        maxTextDensity: 0.5,
        minTextDensity: 0.1,
        titleBodyRatioMax: 2.5,
        titleBodyRatioMin: 1.3,
        maxDecorationWeightRatio: 0.25,
      };
    case 'small':
      return {
        minMargin: minDimension * 0.06,
        recommendedMargin: minDimension * 0.1,
        maxTextDensity: 0.55,
        minTextDensity: 0.15,
        titleBodyRatioMax: 2.8,
        titleBodyRatioMin: 1.4,
        maxDecorationWeightRatio: 0.2,
      };
    case 'medium':
      return {
        minMargin: minDimension * 0.07,
        recommendedMargin: minDimension * 0.12,
        maxTextDensity: 0.6,
        minTextDensity: 0.15,
        titleBodyRatioMax: 3.0,
        titleBodyRatioMin: 1.5,
        maxDecorationWeightRatio: 0.18,
      };
    case 'large':
      return {
        minMargin: minDimension * 0.08,
        recommendedMargin: minDimension * 0.15,
        maxTextDensity: 0.55,
        minTextDensity: 0.1,
        titleBodyRatioMax: 3.5,
        titleBodyRatioMin: 1.6,
        maxDecorationWeightRatio: 0.2,
      };
    case 'poster':
    default:
      return {
        minMargin: minDimension * 0.08,
        recommendedMargin: minDimension * 0.15,
        maxTextDensity: 0.5,
        minTextDensity: 0.08,
        titleBodyRatioMax: 4.0,
        titleBodyRatioMin: 1.8,
        maxDecorationWeightRatio: 0.25,
      };
  }
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
      textElements: {
        count: 0,
        totalArea: 0,
        avgFontSize: 0,
        maxFontSize: 0,
        minFontSize: 0,
        titleCandidates: [],
        bodyCandidates: [],
      },
      decorationElements: {
        count: 0,
        totalWeight: 0,
        totalArea: 0,
      },
      leadElements: {
        count: 0,
        totalArea: 0,
      },
    };
  }

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let leftWeight = 0;
  let rightWeight = 0;
  let topWeight = 0;
  let bottomWeight = 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const textEls = elements.filter((e) => e.type === 'text') as TextElement[];
  const decoEls = elements.filter((e) => e.type === 'decoration') as DecorationElement[];
  const leadEls = elements.filter((e) => e.type === 'lead') as LeadElement[];

  let totalTextArea = 0;
  let totalFontSize = 0;
  let maxFontSize = 0;
  let minFontSize = Infinity;

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

    minX = Math.min(minX, element.x);
    maxX = Math.max(maxX, element.x + element.width);
    minY = Math.min(minY, element.y);
    maxY = Math.max(maxY, element.y + element.height);
  }

  for (const textEl of textEls) {
    totalTextArea += getElementArea(textEl);
    totalFontSize += textEl.fontSize;
    maxFontSize = Math.max(maxFontSize, textEl.fontSize);
    minFontSize = Math.min(minFontSize, textEl.fontSize);
  }

  const avgFontSize = textEls.length > 0 ? totalFontSize / textEls.length : 0;
  const fontSizeThreshold = avgFontSize * 1.3;

  const titleCandidates = textEls
    .filter((t) => t.fontSize >= fontSizeThreshold && t.fontSize > 0)
    .map((t) => t.id);

  const bodyCandidates = textEls
    .filter((t) => t.fontSize < fontSizeThreshold && t.fontSize > 0)
    .map((t) => t.id);

  const centerX = totalWeight > 0 ? weightedX / totalWeight : paper.width / 2;
  const centerY = totalWeight > 0 ? weightedY / totalWeight : paper.height / 2;

  const horizontalBalance =
    Math.abs(leftWeight - rightWeight) / Math.max(leftWeight + rightWeight, 1);
  const verticalBalance =
    Math.abs(topWeight - bottomWeight) / Math.max(topWeight + bottomWeight, 1);
  const balanceScore = Math.max(0, 100 - (horizontalBalance + verticalBalance) * 50);

  const textDensity = totalTextArea / (paper.width * paper.height);

  let totalDecoWeight = 0;
  let totalDecoArea = 0;
  for (const deco of decoEls) {
    totalDecoWeight += getElementWeight(deco);
    totalDecoArea += getElementArea(deco);
  }

  let totalLeadArea = 0;
  for (const lead of leadEls) {
    totalLeadArea += getElementArea(lead);
  }

  return {
    centerOfGravity: { x: centerX, y: centerY },
    textDensity,
    leftWeight,
    rightWeight,
    topWeight,
    bottomWeight,
    balanceScore,
    marginLeft: minX === Infinity ? 0 : minX,
    marginRight: maxX === -Infinity ? paper.width : paper.width - maxX,
    marginTop: minY === Infinity ? 0 : minY,
    marginBottom: maxY === -Infinity ? paper.height : paper.height - maxY,
    textElements: {
      count: textEls.length,
      totalArea: totalTextArea,
      avgFontSize,
      maxFontSize,
      minFontSize: minFontSize === Infinity ? 0 : minFontSize,
      titleCandidates,
      bodyCandidates,
    },
    decorationElements: {
      count: decoEls.length,
      totalWeight: totalDecoWeight,
      totalArea: totalDecoArea,
    },
    leadElements: {
      count: leadEls.length,
      totalArea: totalLeadArea,
    },
  };
}

function diagnoseTitleHeavy(
  analysis: LayoutAnalysis,
  _elements: CanvasElement[],
  guidelines: PaperLayoutGuidelines
): DiagnosisSuggestion | null {
  const { titleCandidates, bodyCandidates, maxFontSize, avgFontSize } = analysis.textElements;

  if (titleCandidates.length === 0 || bodyCandidates.length === 0) return null;
  if (avgFontSize === 0) return null;

  const ratio = maxFontSize / avgFontSize;

  if (ratio > guidelines.titleBodyRatioMax) {
    return {
      id: 'diag-title-heavy',
      type: 'title_heavy',
      severity: ratio > guidelines.titleBodyRatioMax * 1.3 ? 'warning' : 'info',
      title: '标题视觉权重过高',
      description: `最大字号 (${maxFontSize.toFixed(0)}px) 与平均字号 (${avgFontSize.toFixed(0)}px) 的比例为 ${ratio.toFixed(2)}:1，超出建议范围 (${guidelines.titleBodyRatioMax}:1 以内)。`,
      suggestion: '适当缩小标题字号，或增大正文字号，以建立更和谐的层级关系。建议标题与正文比例控制在 1.5–2.5 倍之间。',
      elementIds: titleCandidates,
      impact: 'medium',
    };
  }

  return null;
}

function diagnoseHierarchyUnclear(
  analysis: LayoutAnalysis,
  guidelines: PaperLayoutGuidelines
): DiagnosisSuggestion | null {
  const { count, maxFontSize, minFontSize, titleCandidates, bodyCandidates } = analysis.textElements;

  if (count < 2) return null;

  if (titleCandidates.length === 0 || bodyCandidates.length === 0) {
    const ratio = maxFontSize / (minFontSize || 1);
    if (ratio < guidelines.titleBodyRatioMin && count > 1) {
      return {
        id: 'diag-hierarchy-unclear',
        type: 'hierarchy_unclear',
        severity: 'warning',
        title: '文字层级不够清晰',
        description: `所有文字的字号差异较小 (最大 ${maxFontSize.toFixed(0)}px / 最小 ${minFontSize.toFixed(0)}px)，缺乏明确的视觉层级。`,
        suggestion: '增大标题与正文的字号差异，建立清晰的信息层级。主标题应明显大于正文。',
        impact: 'medium',
      };
    }
  }

  return null;
}

function diagnoseBodyDense(
  analysis: LayoutAnalysis,
  elements: CanvasElement[],
  paper: PaperConfig,
  guidelines: PaperLayoutGuidelines
): DiagnosisSuggestion | null {
  const textEls = elements.filter((e) => e.type === 'text') as TextElement[];
  if (textEls.length < 2) return null;

  let totalGap = 0;
  let gapCount = 0;

  const sortedByY = [...textEls].sort((a, b) => a.y - b.y);

  for (let i = 0; i < sortedByY.length - 1; i++) {
    const a = sortedByY[i];
    const b = sortedByY[i + 1];

    const aBottom = a.y + a.height;
    const gap = b.y - aBottom;

    if (gap >= 0) {
      totalGap += gap;
      gapCount++;
    }
  }

  if (gapCount === 0) return null;

  const avgGap = totalGap / gapCount;
  const avgLineHeight = analysis.textElements.avgFontSize * 1.2;
  const gapRatio = avgGap / (avgLineHeight || 1);

  const totalTextArea = analysis.textElements.totalArea;
  const paperArea = paper.width * paper.height;
  const textCoverage = totalTextArea / paperArea;

  if (textCoverage > guidelines.maxTextDensity || gapRatio < 0.5) {
    return {
      id: 'diag-body-dense',
      type: 'body_dense',
      severity: textCoverage > guidelines.maxTextDensity * 1.1 ? 'warning' : 'info',
      title: '正文区域过于密集',
      description: `文字密度约为 ${(textCoverage * 100).toFixed(1)}%，文字块平均间距约 ${avgGap.toFixed(0)}px，阅读舒适度可能受影响。`,
      suggestion: '适当增加文字块之间的间距，或减少文字内容，提升版面呼吸感。',
      elementIds: analysis.textElements.bodyCandidates,
      impact: 'medium',
    };
  }

  return null;
}

function diagnoseWhitespaceInsufficient(
  analysis: LayoutAnalysis,
  _paper: PaperConfig,
  guidelines: PaperLayoutGuidelines
): DiagnosisSuggestion | null {
  const { marginLeft, marginRight, marginTop, marginBottom } = analysis;
  const minMargin = Math.min(marginLeft, marginRight, marginTop, marginBottom);

  if (minMargin < guidelines.minMargin && analysis.textElements.count > 0) {
    const minSide = [
      { side: '左', value: marginLeft },
      { side: '右', value: marginRight },
      { side: '上', value: marginTop },
      { side: '下', value: marginBottom },
    ].sort((a, b) => a.value - b.value)[0];

    return {
      id: 'diag-whitespace-insufficient',
      type: 'whitespace_insufficient',
      severity: minMargin < guidelines.minMargin * 0.5 ? 'warning' : 'info',
      title: '边距留白不足',
      description: `${minSide.side}边距仅 ${minSide.value.toFixed(0)}px，小于建议的最小值 ${guidelines.minMargin.toFixed(0)}px (推荐 ${guidelines.recommendedMargin.toFixed(0)}px)。`,
      suggestion: '将内容向中心收拢，确保四周留有足够的留白。充足的边距能提升版面品质感和阅读舒适度。',
      impact: 'high',
    };
  }

  return null;
}

function diagnoseDecorationOverpower(
  analysis: LayoutAnalysis,
  guidelines: PaperLayoutGuidelines
): DiagnosisSuggestion | null {
  const { decorationElements, textElements } = analysis;

  if (decorationElements.count === 0 || textElements.count === 0) return null;

  const totalTextWeight = textElements.totalArea * 0.01;
  const decoWeightRatio = decorationElements.totalWeight / (totalTextWeight + decorationElements.totalWeight);

  if (decoWeightRatio > guidelines.maxDecorationWeightRatio) {
    return {
      id: 'diag-decoration-overpower',
      type: 'decoration_overpower',
      severity: decoWeightRatio > guidelines.maxDecorationWeightRatio * 1.3 ? 'warning' : 'info',
      title: '装饰元素喧宾夺主',
      description: `装饰元素的视觉权重占比约为 ${(decoWeightRatio * 100).toFixed(1)}%，可能分散读者对文字内容的注意力。`,
      suggestion: '适当缩小装饰元素的尺寸或减少数量，确保文字内容是视觉焦点。装饰应服务于内容而非抢夺注意力。',
      impact: 'medium',
    };
  }

  return null;
}

function diagnoseBalanceLeftRight(
  analysis: LayoutAnalysis
): DiagnosisSuggestion | null {
  const { leftWeight, rightWeight, balanceScore } = analysis;
  const totalWeight = leftWeight + rightWeight;

  if (totalWeight === 0) return null;

  const imbalanceRatio = Math.abs(leftWeight - rightWeight) / totalWeight;

  if (imbalanceRatio > 0.25) {
    const heavierSide = leftWeight > rightWeight ? '左侧' : '右侧';
    return {
      id: 'diag-balance-left-right',
      type: 'balance_left_right',
      severity: imbalanceRatio > 0.4 ? 'warning' : 'info',
      title: '左右视觉失衡',
      description: `${heavierSide}视觉重量明显偏重 (左: ${leftWeight.toFixed(1)} / 右: ${rightWeight.toFixed(1)})，平衡度仅 ${balanceScore.toFixed(1)} 分。`,
      suggestion: `将部分元素向${heavierSide === '左侧' ? '右' : '左'}移动，或在较轻的一侧增加视觉元素，以恢复左右平衡。`,
      impact: 'high',
    };
  }

  return null;
}

function diagnoseBalanceTopBottom(
  analysis: LayoutAnalysis
): DiagnosisSuggestion | null {
  const { topWeight, bottomWeight } = analysis;
  const totalWeight = topWeight + bottomWeight;

  if (totalWeight === 0) return null;

  const imbalanceRatio = Math.abs(topWeight - bottomWeight) / totalWeight;

  if (imbalanceRatio > 0.3) {
    const heavierSide = topWeight > bottomWeight ? '上部' : '下部';
    return {
      id: 'diag-balance-top-bottom',
      type: 'balance_top_bottom',
      severity: imbalanceRatio > 0.45 ? 'warning' : 'info',
      title: '上下视觉失衡',
      description: `${heavierSide}视觉重量明显偏重 (上: ${topWeight.toFixed(1)} / 下: ${bottomWeight.toFixed(1)})。`,
      suggestion: '垂直方向上调整元素位置，利用视觉重心的"光学中心"概念（略高于几何中心）来安排内容。',
      impact: 'medium',
    };
  }

  return null;
}

function diagnoseAlignmentInconsistent(
  elements: CanvasElement[]
): DiagnosisSuggestion | null {
  const textEls = elements.filter((e) => e.type === 'text') as TextElement[];
  if (textEls.length < 3) return null;

  const alignments = new Set(textEls.map((t) => t.textAlign));

  const leftEdges = textEls.map((t) => Math.round(t.x));

  const edgeCounts: Record<number, number> = {};
  for (const edge of leftEdges) {
    edgeCounts[edge] = (edgeCounts[edge] || 0) + 1;
  }
  const maxSameEdge = Math.max(...Object.values(edgeCounts));

  if (alignments.size > 2 && maxSameEdge < textEls.length * 0.5) {
    return {
      id: 'diag-alignment-inconsistent',
      type: 'alignment_inconsistent',
      severity: 'info',
      title: '对齐方式不够统一',
      description: `检测到 ${alignments.size} 种不同的文字对齐方式，且元素左边缘对齐不够一致。`,
      suggestion: '尽量统一文字对齐方式，建立清晰的对齐参考线。左对齐通常最适合阅读，标题可居中。',
      impact: 'low',
    };
  }

  return null;
}

export function diagnoseLayout(
  elements: CanvasElement[],
  paper: PaperConfig
): LayoutDiagnosis {
  const analysis = analyzeLayout(elements, paper);
  const guidelines = getPaperLayoutGuidelines(paper);
  const suggestions: DiagnosisSuggestion[] = [];

  const titleHeavy = diagnoseTitleHeavy(analysis, elements, guidelines);
  if (titleHeavy) suggestions.push(titleHeavy);

  const hierarchy = diagnoseHierarchyUnclear(analysis, guidelines);
  if (hierarchy) suggestions.push(hierarchy);

  const bodyDense = diagnoseBodyDense(analysis, elements, paper, guidelines);
  if (bodyDense) suggestions.push(bodyDense);

  const whitespace = diagnoseWhitespaceInsufficient(analysis, paper, guidelines);
  if (whitespace) suggestions.push(whitespace);

  const decoOverpower = diagnoseDecorationOverpower(analysis, guidelines);
  if (decoOverpower) suggestions.push(decoOverpower);

  const balanceLR = diagnoseBalanceLeftRight(analysis);
  if (balanceLR) suggestions.push(balanceLR);

  const balanceTB = diagnoseBalanceTopBottom(analysis);
  if (balanceTB) suggestions.push(balanceTB);

  const alignment = diagnoseAlignmentInconsistent(elements);
  if (alignment) suggestions.push(alignment);

  const severityScores: Record<string, number> = {
    error: 30,
    warning: 15,
    info: 5,
  };

  let penalty = 0;
  for (const s of suggestions) {
    penalty += severityScores[s.severity] || 0;
  }

  const balanceContribution = analysis.balanceScore * 0.4;
  const densityScore = analysis.textDensity > 0 
    ? Math.max(0, 100 - Math.abs(analysis.textDensity - 0.3) * 200)
    : 0;
  const densityContribution = densityScore * 0.2;
  const diagnosisContribution = Math.max(0, 100 - penalty) * 0.4;

  const overallScore = Math.round(balanceContribution + densityContribution + diagnosisContribution);

  let grade: LayoutDiagnosis['grade'] = 'poor';
  if (overallScore >= 85) grade = 'excellent';
  else if (overallScore >= 70) grade = 'good';
  else if (overallScore >= 50) grade = 'fair';

  suggestions.sort((a, b) => {
    const sevOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  return {
    suggestions,
    overallScore,
    grade,
  };
}
