import type {
  CanvasElement,
  PaperConfig,
  DesignTemplate,
  TemplateSimilarity,
  TemplateRecommendation,
  RecommendationReason,
  SceneCategory,
  SceneDetectionResult,
  TemplateDiff,
  TextElement,
  LeadElement,
  DecorationElement,
  TemplateStyle,
} from '../types';
import { analyzeLayout } from './layoutAnalysis';
import { applyTemplate } from './templateStorage';

const RECENT_TEMPLATES_KEY = 'typography_recent_templates';
const MAX_RECENT_TEMPLATES = 5;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 100;

  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 4.41;
}

function calcPaperSizeScore(
  currentPaper: PaperConfig,
  templatePaper: PaperConfig
): number {
  const currentArea = currentPaper.width * currentPaper.height;
  const templateArea = templatePaper.width * templatePaper.height;
  const areaRatio = Math.min(currentArea, templateArea) / Math.max(currentArea, templateArea);

  const currentAspect = currentPaper.width / currentPaper.height;
  const templateAspect = templatePaper.width / templatePaper.height;
  const aspectRatio = Math.min(currentAspect, templateAspect) / Math.max(currentAspect, templateAspect);

  return Math.round(areaRatio * 50 + aspectRatio * 50);
}

function calcElementCountScore(
  currentElements: CanvasElement[],
  template: DesignTemplate
): number {
  const currentCount = currentElements.length;
  const templateCount = template.elements?.length || template.layout
    ? (template.layout!.titlePositions.length +
       template.layout!.bodyPositions.length +
       template.layout!.leadPositions.length +
       template.layout!.decorationPositions.length)
    : 0;

  if (templateCount === 0 || currentCount === 0) return 50;

  const ratio = Math.min(currentCount, templateCount) / Math.max(currentCount, templateCount);
  return Math.round(ratio * 100);
}

function calcTitleBodyRatioScore(
  currentElements: CanvasElement[],
  template: DesignTemplate,
  currentPaper: PaperConfig
): number {
  const currentAnalysis = analyzeLayout(currentElements, currentPaper);
  const { maxFontSize, avgFontSize, count } = currentAnalysis.textElements;

  if (count < 2 || avgFontSize === 0 || !template.style) return 50;

  const currentRatio = maxFontSize / avgFontSize;
  const templateRatio = template.style.titleStyle.fontSize / template.style.bodyStyle.fontSize;

  const ratioDiff = Math.abs(currentRatio - templateRatio) / Math.max(currentRatio, templateRatio);
  return Math.round((1 - ratioDiff) * 100);
}

function calcDecorationDensityScore(
  currentElements: CanvasElement[],
  template: DesignTemplate,
  currentPaper: PaperConfig
): number {
  const currentAnalysis = analyzeLayout(currentElements, currentPaper);
  const currentDecoCount = currentAnalysis.decorationElements.count;
  const currentTotalCount = currentElements.length;

  const templateDecoCount = template.layout?.decorationPositions.length || 0;
  const templateTotalCount = template.elements?.length ||
    (template.layout
      ? template.layout.titlePositions.length +
        template.layout.bodyPositions.length +
        template.layout.leadPositions.length +
        template.layout.decorationPositions.length
      : 0);

  if (currentTotalCount === 0 || templateTotalCount === 0) {
    if (currentDecoCount === 0 && templateDecoCount === 0) return 100;
    return 30;
  }

  const currentRatio = currentDecoCount / currentTotalCount;
  const templateRatio = templateDecoCount / templateTotalCount;

  const diff = Math.abs(currentRatio - templateRatio);
  return Math.round(Math.max(0, 100 - diff * 200));
}

function calcWhitespaceScore(
  currentElements: CanvasElement[],
  template: DesignTemplate,
  currentPaper: PaperConfig
): number {
  const currentAnalysis = analyzeLayout(currentElements, currentPaper);
  const { marginLeft, marginRight, marginTop, marginBottom } = currentAnalysis;

  const currentMinMargin = Math.min(marginLeft, marginRight, marginTop, marginBottom);
  const currentMinDim = Math.min(currentPaper.width, currentPaper.height);
  const currentMarginRatio = currentMinMargin / currentMinDim;

  const templateMargin = template.style?.whitespace;
  if (!templateMargin) return 50;

  const templateMinMargin = Math.min(
    templateMargin.marginLeft,
    templateMargin.marginRight,
    templateMargin.marginTop,
    templateMargin.marginBottom
  );
  const templateMinDim = Math.min(template.paper.width, template.paper.height);
  const templateMarginRatio = templateMinMargin / templateMinDim;

  const diff = Math.abs(currentMarginRatio - templateMarginRatio);
  return Math.round(Math.max(0, 100 - diff * 300));
}

function calcColorSchemeScore(
  currentElements: CanvasElement[],
  template: DesignTemplate,
  currentPaper: PaperConfig
): number {
  const textEls = currentElements.filter((e) => e.type === 'text') as TextElement[];
  if (textEls.length === 0 || !template.style) return 50;

  const sortedText = [...textEls].sort((a, b) => b.fontSize - a.fontSize);
  const currentTitleColor = sortedText[0]?.fill || '#333333';
  const currentBodyColor = sortedText[sortedText.length - 1]?.fill || '#333333';

  const titleColorDiff = colorDistance(currentTitleColor, template.style.titleStyle.fill);
  const bodyColorDiff = colorDistance(currentBodyColor, template.style.bodyStyle.fill);
  const bgColorDiff = colorDistance(currentPaper.backgroundColor, template.style.backgroundColor);

  const avgDiff = (titleColorDiff + bodyColorDiff + bgColorDiff) / 3;
  return Math.round(Math.max(0, 100 - avgDiff));
}

function calcFontStyleScore(
  currentElements: CanvasElement[],
  template: DesignTemplate
): number {
  const textEls = currentElements.filter((e) => e.type === 'text') as TextElement[];
  if (textEls.length === 0 || !template.style) return 50;

  const fontFamilies = new Set(textEls.map((t) => t.fontFamily));
  const templateFontFamily = template.style.titleStyle.fontFamily;

  const fontFamilyMatch = fontFamilies.has(templateFontFamily) ? 100 : 30;

  const sortedText = [...textEls].sort((a, b) => b.fontSize - a.fontSize);
  const currentTitleWeight = sortedText[0]?.fontWeight || 'normal';
  const templateTitleWeight = template.style.titleStyle.fontWeight;
  const fontWeightMatch = currentTitleWeight === templateTitleWeight ? 100 : 50;

  return Math.round(fontFamilyMatch * 0.6 + fontWeightMatch * 0.4);
}

export function calculateTemplateSimilarity(
  template: DesignTemplate,
  elements: CanvasElement[],
  paper: PaperConfig
): TemplateSimilarity {
  const paperSizeScore = calcPaperSizeScore(paper, template.paper);
  const elementCountScore = calcElementCountScore(elements, template);
  const titleBodyRatioScore = calcTitleBodyRatioScore(elements, template, paper);
  const decorationDensityScore = calcDecorationDensityScore(elements, template, paper);
  const whitespaceScore = calcWhitespaceScore(elements, template, paper);
  const colorSchemeScore = calcColorSchemeScore(elements, template, paper);
  const fontStyleScore = calcFontStyleScore(elements, template);

  const weights = {
    paperSize: 0.2,
    elementCount: 0.15,
    titleBodyRatio: 0.15,
    decorationDensity: 0.15,
    whitespace: 0.15,
    colorScheme: 0.1,
    fontStyle: 0.1,
  };

  const overallScore = Math.round(
    paperSizeScore * weights.paperSize +
      elementCountScore * weights.elementCount +
      titleBodyRatioScore * weights.titleBodyRatio +
      decorationDensityScore * weights.decorationDensity +
      whitespaceScore * weights.whitespace +
      colorSchemeScore * weights.colorScheme +
      fontStyleScore * weights.fontStyle
  );

  return {
    templateId: template.id,
    overallScore,
    paperSizeScore,
    elementCountScore,
    titleBodyRatioScore,
    decorationDensityScore,
    whitespaceScore,
    colorSchemeScore,
    fontStyleScore,
  };
}

function generateRecommendationReasons(
  similarity: TemplateSimilarity,
  template: DesignTemplate
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];

  if (similarity.paperSizeScore >= 80) {
    reasons.push({
      id: 'paper-size-match',
      title: '纸张尺寸高度匹配',
      description: `模板尺寸比例与当前设计高度一致 (${similarity.paperSizeScore}%)，元素布局适配性好。`,
      type: 'match',
    });
  }

  if (similarity.titleBodyRatioScore >= 80) {
    reasons.push({
      id: 'hierarchy-match',
      title: '文字层级相似',
      description: `标题正文比例接近 (${similarity.titleBodyRatioScore}%)，视觉节奏一致。`,
      type: 'match',
    });
  }

  if (similarity.whitespaceScore >= 80) {
    reasons.push({
      id: 'whitespace-match',
      title: '留白风格接近',
      description: `边距留白比例相似 (${similarity.whitespaceScore}%)，整体呼吸感一致。`,
      type: 'match',
    });
  }

  if (similarity.colorSchemeScore >= 70) {
    reasons.push({
      id: 'color-match',
      title: '配色方案协调',
      description: `色彩调性相近 (${similarity.colorSchemeScore}%)，视觉风格统一。`,
      type: 'match',
    });
  }

  if (similarity.decorationDensityScore >= 75) {
    reasons.push({
      id: 'decoration-match',
      title: '装饰密度适配',
      description: `装饰元素比例相当 (${similarity.decorationDensityScore}%)，繁简程度一致。`,
      type: 'match',
    });
  }

  if (similarity.fontStyleScore >= 80) {
    reasons.push({
      id: 'font-match',
      title: '字体风格匹配',
      description: `字体选择和字重风格相似 (${similarity.fontStyleScore}%)。`,
      type: 'match',
    });
  }

  if (similarity.titleBodyRatioScore < 50 && template.type === 'style') {
    reasons.push({
      id: 'improve-hierarchy',
      title: '可优化文字层级',
      description: '套用后可改善标题与正文的层级关系，提升可读性。',
      type: 'improvement',
    });
  }

  if (similarity.whitespaceScore < 50 && template.type === 'style') {
    reasons.push({
      id: 'improve-whitespace',
      title: '可改善留白布局',
      description: '模板的留白比例更合理，能提升版面品质感。',
      type: 'improvement',
    });
  }

  if (similarity.colorSchemeScore < 50) {
    reasons.push({
      id: 'style-different',
      title: '风格差异较大',
      description: '配色方案与当前设计不同，可带来全新视觉感受。',
      type: 'style',
    });
  }

  return reasons.slice(0, 4);
}

function getMatchLevel(score: number): 'perfect' | 'high' | 'medium' | 'low' {
  if (score >= 85) return 'perfect';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function recommendTemplates(
  templates: DesignTemplate[],
  elements: CanvasElement[],
  paper: PaperConfig,
  options?: { limit?: number; type?: 'all' | 'full' | 'style' }
): TemplateRecommendation[] {
  const limit = options?.limit || 10;

  const filteredTemplates = options?.type && options.type !== 'all'
    ? templates.filter((t) => t.type === options.type)
    : templates;

  const recommendations: TemplateRecommendation[] = filteredTemplates.map((template) => {
    const similarity = calculateTemplateSimilarity(template, elements, paper);
    const reasons = generateRecommendationReasons(similarity, template);
    const matchLevel = getMatchLevel(similarity.overallScore);

    return {
      template,
      similarity,
      reasons,
      matchLevel,
    };
  });

  recommendations.sort((a, b) => b.similarity.overallScore - a.similarity.overallScore);

  return recommendations.slice(0, limit);
}

export function detectScene(
  elements: CanvasElement[],
  paper: PaperConfig
): SceneDetectionResult {
  const analysis = analyzeLayout(elements, paper);
  const paperArea = paper.width * paper.height;
  const aspectRatio = paper.width / paper.height;

  const scores: Record<SceneCategory, number> = {
    business_card: 0,
    poster: 0,
    flyer: 0,
    invitation: 0,
    letterhead: 0,
    book_cover: 0,
    social_media: 0,
    other: 30,
  };

  const indicators: string[] = [];

  if (paperArea <= 252 * 144 * 1.5) {
    scores.business_card += 40;
    indicators.push('尺寸较小，符合名片规格');
  }

  if (paperArea > 252 * 144 * 1.5 && paperArea <= 420 * 595 * 1.2) {
    scores.flyer += 25;
    scores.invitation += 20;
    indicators.push('尺寸适中，适合传单或邀请函');
  }

  if (paperArea > 612 * 842) {
    scores.poster += 35;
    indicators.push('尺寸较大，符合海报规格');
  }

  if (aspectRatio > 0.9 && aspectRatio < 1.1) {
    scores.social_media += 25;
    indicators.push('接近正方形，适合社交媒体');
  }

  if (aspectRatio > 1.7 || aspectRatio < 0.55) {
    scores.letterhead += 15;
    indicators.push('长宽比较大，接近信纸比例');
  }

  const textCount = analysis.textElements.count;
  const decoCount = analysis.decorationElements.count;

  if (textCount <= 5 && decoCount >= 2) {
    scores.business_card += 20;
    scores.invitation += 15;
    indicators.push('文字较少，装饰较多');
  }

  if (textCount > 5 && textCount <= 15) {
    scores.flyer += 20;
    scores.poster += 15;
    indicators.push('文字数量适中');
  }

  if (textCount > 15) {
    scores.letterhead += 25;
    scores.book_cover += 15;
    indicators.push('文字内容较多');
  }

  if (analysis.textElements.maxFontSize / Math.max(analysis.textElements.avgFontSize, 1) > 2.5) {
    scores.poster += 20;
    indicators.push('标题字号较大，视觉冲击力强');
  }

  const leadCount = analysis.leadElements.count;
  if (leadCount >= 2) {
    scores.letterhead += 20;
    indicators.push('铅条元素较多，符合信纸特征');
  }

  let maxScore = 0;
  let detectedScene: SceneCategory = 'other';

  (Object.keys(scores) as SceneCategory[]).forEach((scene) => {
    if (scores[scene] > maxScore) {
      maxScore = scores[scene];
      detectedScene = scene;
    }
  });

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) : 0;

  return {
    scene: detectedScene,
    confidence: Math.min(95, Math.max(20, confidence + 20)),
    indicators: indicators.slice(0, 3),
  };
}

export function getRecentTemplates(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load recent templates:', e);
  }
  return [];
}

export function addRecentTemplate(templateId: string): void {
  try {
    const recent = getRecentTemplates();
    const filtered = recent.filter((id) => id !== templateId);
    filtered.unshift(templateId);
    const trimmed = filtered.slice(0, MAX_RECENT_TEMPLATES);
    localStorage.setItem(RECENT_TEMPLATES_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save recent templates:', e);
  }
}

export function clearRecentTemplates(): void {
  localStorage.removeItem(RECENT_TEMPLATES_KEY);
}

export function calculateTemplateDiff(
  beforeElements: CanvasElement[],
  afterElements: CanvasElement[],
  beforePaper: PaperConfig,
  afterPaper: PaperConfig,
  _style?: TemplateStyle
): TemplateDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: TemplateDiff['elementChanges']['modified'] = [];

  const beforeIds = new Set(beforeElements.map((e) => e.id));
  const afterIds = new Set(afterElements.map((e) => e.id));

  afterElements.forEach((el) => {
    if (!beforeIds.has(el.id)) {
      added.push(el.id);
    }
  });

  beforeElements.forEach((el) => {
    if (!afterIds.has(el.id)) {
      removed.push(el.id);
    }
  });

  const beforeMap = new Map(beforeElements.map((e) => [e.id, e]));

  afterElements.forEach((afterEl) => {
    const beforeEl = beforeMap.get(afterEl.id);
    if (!beforeEl) return;

    if (afterEl.type === 'text' && beforeEl.type === 'text') {
      const beforeText = beforeEl as TextElement;
      const afterText = afterEl as TextElement;

      if (beforeText.fontFamily !== afterText.fontFamily) {
        modified.push({
          elementId: afterEl.id,
          property: 'fontFamily',
          oldValue: beforeText.fontFamily,
          newValue: afterText.fontFamily,
        });
      }
      if (beforeText.fontSize !== afterText.fontSize) {
        modified.push({
          elementId: afterEl.id,
          property: 'fontSize',
          oldValue: beforeText.fontSize,
          newValue: afterText.fontSize,
        });
      }
      if (beforeText.fill !== afterText.fill) {
        modified.push({
          elementId: afterEl.id,
          property: 'fill',
          oldValue: beforeText.fill,
          newValue: afterText.fill,
        });
      }
      if (beforeText.fontWeight !== afterText.fontWeight) {
        modified.push({
          elementId: afterEl.id,
          property: 'fontWeight',
          oldValue: beforeText.fontWeight,
          newValue: afterText.fontWeight,
        });
      }
      if (beforeText.textAlign !== afterText.textAlign) {
        modified.push({
          elementId: afterEl.id,
          property: 'textAlign',
          oldValue: beforeText.textAlign,
          newValue: afterText.textAlign,
        });
      }
    }

    if (afterEl.type === 'lead' && beforeEl.type === 'lead') {
      const beforeLead = beforeEl as LeadElement;
      const afterLead = afterEl as LeadElement;

      if (beforeLead.fill !== afterLead.fill) {
        modified.push({
          elementId: afterEl.id,
          property: 'fill',
          oldValue: beforeLead.fill,
          newValue: afterLead.fill,
        });
      }
    }

    if (afterEl.type === 'decoration' && beforeEl.type === 'decoration') {
      const beforeDec = beforeEl as DecorationElement;
      const afterDec = afterEl as DecorationElement;

      if (beforeDec.fill !== afterDec.fill) {
        modified.push({
          elementId: afterEl.id,
          property: 'fill',
          oldValue: beforeDec.fill,
          newValue: afterDec.fill,
        });
      }
      if (beforeDec.strokeColor !== afterDec.strokeColor) {
        modified.push({
          elementId: afterEl.id,
          property: 'strokeColor',
          oldValue: beforeDec.strokeColor,
          newValue: afterDec.strokeColor,
        });
      }
      if (beforeDec.strokeWidth !== afterDec.strokeWidth) {
        modified.push({
          elementId: afterEl.id,
          property: 'strokeWidth',
          oldValue: beforeDec.strokeWidth,
          newValue: afterDec.strokeWidth,
        });
      }
    }
  });

  const styleChanges: TemplateDiff['styleChanges'] = {};
  const beforeTextEls = beforeElements.filter((e) => e.type === 'text') as TextElement[];
  const afterTextEls = afterElements.filter((e) => e.type === 'text') as TextElement[];

  if (beforeTextEls.length > 0 && afterTextEls.length > 0) {
    const sortedBefore = [...beforeTextEls].sort((a, b) => b.fontSize - a.fontSize);
    const sortedAfter = [...afterTextEls].sort((a, b) => b.fontSize - a.fontSize);

    if (sortedBefore[0].fontFamily !== sortedAfter[0].fontFamily) {
      styleChanges.fontFamily = { old: sortedBefore[0].fontFamily, new: sortedAfter[0].fontFamily };
    }
    if (sortedBefore[0].fontSize !== sortedAfter[0].fontSize) {
      styleChanges.titleFontSize = { old: sortedBefore[0].fontSize, new: sortedAfter[0].fontSize };
    }
    if (sortedBefore[0].fill !== sortedAfter[0].fill) {
      styleChanges.titleColor = { old: sortedBefore[0].fill, new: sortedAfter[0].fill };
    }

    const beforeBody = sortedBefore[sortedBefore.length - 1];
    const afterBody = sortedAfter[sortedAfter.length - 1];
    if (beforeBody && afterBody && beforeBody.fontSize !== afterBody.fontSize) {
      styleChanges.bodyFontSize = { old: beforeBody.fontSize, new: afterBody.fontSize };
    }
    if (beforeBody && afterBody && beforeBody.fill !== afterBody.fill) {
      styleChanges.bodyColor = { old: beforeBody.fill, new: afterBody.fill };
    }
  }

  if (beforePaper.backgroundColor !== afterPaper.backgroundColor) {
    styleChanges.backgroundColor = { old: beforePaper.backgroundColor, new: afterPaper.backgroundColor };
  }

  const paperChanges: TemplateDiff['paperChanges'] = {};
  if (beforePaper.width !== afterPaper.width) {
    paperChanges.width = { old: beforePaper.width, new: afterPaper.width };
  }
  if (beforePaper.height !== afterPaper.height) {
    paperChanges.height = { old: beforePaper.height, new: afterPaper.height };
  }
  if (beforePaper.backgroundColor !== afterPaper.backgroundColor) {
    paperChanges.backgroundColor = { old: beforePaper.backgroundColor, new: afterPaper.backgroundColor };
  }

  const styleChangeCount = Object.keys(styleChanges).length;
  const paperChangeCount = Object.keys(paperChanges).length;
  const elementChangeCount = added.length + removed.length + modified.length;

  return {
    elementChanges: { added, removed, modified },
    styleChanges,
    paperChanges: paperChangeCount > 0 ? paperChanges : undefined,
    summary: {
      totalChanges: elementChangeCount + styleChangeCount + paperChangeCount,
      elementChanges: elementChangeCount,
      styleChanges: styleChangeCount,
      paperChanges: paperChangeCount,
    },
  };
}

export function previewTemplateApply(
  template: DesignTemplate,
  elements: CanvasElement[],
  paper: PaperConfig
): { elements: CanvasElement[]; paper: PaperConfig; diff: TemplateDiff } {
  const result = applyTemplate(template, elements);
  const diff = calculateTemplateDiff(
    elements,
    result.elements,
    paper,
    result.paper,
    template.style
  );
  return {
    elements: result.elements,
    paper: result.paper,
    diff,
  };
}

export function sortTemplatesBySimilarity(
  templates: DesignTemplate[],
  elements: CanvasElement[],
  paper: PaperConfig
): DesignTemplate[] {
  const withScores = templates.map((t) => ({
    template: t,
    score: calculateTemplateSimilarity(t, elements, paper).overallScore,
  }));

  withScores.sort((a, b) => b.score - a.score);

  return withScores.map((item) => item.template);
}

export function batchApplyTemplate(
  template: DesignTemplate,
  designs: { id: string; name: string; elements: CanvasElement[]; paper: PaperConfig }[]
): {
  results: {
    designId: string;
    designName: string;
    success: boolean;
    error?: string;
    elementsBefore: CanvasElement[];
    elementsAfter: CanvasElement[];
    paperBefore: PaperConfig;
    paperAfter: PaperConfig;
    diff: TemplateDiff;
  }[];
  successCount: number;
  failCount: number;
} {
  const results = designs.map((design) => {
    try {
      const result = applyTemplate(template, design.elements);
      const diff = calculateTemplateDiff(
        design.elements,
        result.elements,
        design.paper,
        result.paper,
        template.style
      );

      return {
        designId: design.id,
        designName: design.name,
        success: true,
        elementsBefore: design.elements,
        elementsAfter: result.elements,
        paperBefore: design.paper,
        paperAfter: result.paper,
        diff,
      };
    } catch (e) {
      return {
        designId: design.id,
        designName: design.name,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
        elementsBefore: design.elements,
        elementsAfter: design.elements,
        paperBefore: design.paper,
        paperAfter: design.paper,
        diff: {
          elementChanges: { added: [], removed: [], modified: [] },
          styleChanges: {},
          summary: {
            totalChanges: 0,
            elementChanges: 0,
            styleChanges: 0,
            paperChanges: 0,
          },
        },
      };
    }
  });

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return { results, successCount, failCount };
}
