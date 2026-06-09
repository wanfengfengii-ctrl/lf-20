import type {
  CanvasElement,
  PaperConfig,
  DesignTemplate,
  TemplateType,
  TemplateStyle,
  TemplateLayoutInfo,
  TextElement,
  LeadElement,
  DecorationElement,
  StyleRule,
} from '../types';
import { generateId } from './helpers';
import { analyzeLayout } from './layoutAnalysis';

const STORAGE_KEY = 'typography_templates';
const TEMPLATE_VERSION = '1.0.0';

function getTemplatesFromStorage(): DesignTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load templates from storage:', e);
  }
  return [];
}

function saveTemplatesToStorage(templates: DesignTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to storage:', e);
  }
}

function extractStyle(elements: CanvasElement[], paper: PaperConfig): TemplateStyle {
  const textElements = elements.filter((e) => e.type === 'text') as TextElement[];
  const leadElements = elements.filter((e) => e.type === 'lead') as LeadElement[];
  const decorationElements = elements.filter((e) => e.type === 'decoration') as DecorationElement[];

  const sortedText = [...textElements].sort((a, b) => b.fontSize - a.fontSize);
  const titleElement = sortedText[0];
  const bodyElement = sortedText[sortedText.length - 1] || sortedText[0];

  const analysis = analyzeLayout(elements, paper);

  const defaultStyle: StyleRule = {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fill: '#333333',
  };

  const titleStyle: StyleRule = titleElement
    ? {
        fontFamily: titleElement.fontFamily,
        fontSize: titleElement.fontSize,
        fontWeight: titleElement.fontWeight,
        fontStyle: titleElement.fontStyle,
        textAlign: titleElement.textAlign,
        fill: titleElement.fill,
      }
    : defaultStyle;

  const bodyStyle: StyleRule = bodyElement
    ? {
        fontFamily: bodyElement.fontFamily,
        fontSize: Math.min(bodyElement.fontSize, 16),
        fontWeight: bodyElement.fontWeight,
        fontStyle: bodyElement.fontStyle,
        textAlign: bodyElement.textAlign,
        fill: bodyElement.fill,
      }
    : { ...defaultStyle, fontSize: 14 };

  const decorationElement = decorationElements[0];
  const decorationStyle = decorationElement
    ? {
        shape: decorationElement.shape,
        fill: decorationElement.fill,
        strokeWidth: decorationElement.strokeWidth,
        strokeColor: decorationElement.strokeColor,
      }
    : {
        shape: 'rect' as const,
        fill: 'transparent',
        strokeWidth: 2,
        strokeColor: '#333333',
      };

  const leadColor = leadElements[0]?.fill || '#333333';

  return {
    titleStyle,
    bodyStyle,
    decorationStyle,
    leadColor,
    whitespace: {
      marginTop: analysis.marginTop,
      marginBottom: analysis.marginBottom,
      marginLeft: analysis.marginLeft,
      marginRight: analysis.marginRight,
      lineSpacing: 8,
      paragraphSpacing: 16,
    },
    backgroundColor: paper.backgroundColor,
  };
}

function extractLayout(elements: CanvasElement[]): TemplateLayoutInfo {
  const textElements = elements.filter((e) => e.type === 'text') as TextElement[];
  const leadElements = elements.filter((e) => e.type === 'lead') as LeadElement[];
  const decorationElements = elements.filter((e) => e.type === 'decoration') as DecorationElement[];

  const sortedText = [...textElements].sort((a, b) => b.fontSize - a.fontSize);
  const titleCount = Math.min(2, sortedText.length);
  const titleElements = sortedText.slice(0, titleCount);
  const bodyElements = sortedText.slice(titleCount);

  return {
    titlePositions: titleElements.map((e) => ({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
    })),
    bodyPositions: bodyElements.map((e) => ({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
    })),
    leadPositions: leadElements.map((e) => ({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
    })),
    decorationPositions: decorationElements.map((e) => ({
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      shape: e.shape,
    })),
  };
}

export function createTemplate(
  elements: CanvasElement[],
  paper: PaperConfig,
  options: {
    name: string;
    category: string;
    tags: string[];
    description: string;
    type: TemplateType;
    thumbnail?: string | null;
  }
): DesignTemplate {
  const now = new Date().toISOString();
  const template: DesignTemplate = {
    id: generateId(),
    name: options.name,
    category: options.category,
    tags: options.tags,
    description: options.description,
    thumbnail: options.thumbnail || null,
    type: options.type,
    paper: { ...paper },
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  };

  if (options.type === 'full') {
    template.elements = elements.map((el) => ({ ...el }));
    template.style = extractStyle(elements, paper);
    template.layout = extractLayout(elements);
  } else {
    template.style = extractStyle(elements, paper);
    template.layout = extractLayout(elements);
  }

  return template;
}

export function saveTemplate(template: DesignTemplate): void {
  const templates = getTemplatesFromStorage();
  const existingIndex = templates.findIndex((t) => t.id === template.id);

  if (existingIndex >= 0) {
    templates[existingIndex] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    templates.push(template);
  }

  saveTemplatesToStorage(templates);
}

export function getTemplate(id: string): DesignTemplate | null {
  const templates = getTemplatesFromStorage();
  return templates.find((t) => t.id === id) || null;
}

export function getAllTemplates(): DesignTemplate[] {
  return getTemplatesFromStorage();
}

export function deleteTemplate(id: string): void {
  const templates = getTemplatesFromStorage();
  const filtered = templates.filter((t) => t.id !== id);
  saveTemplatesToStorage(filtered);
}

export function updateTemplate(id: string, updates: Partial<DesignTemplate>): DesignTemplate | null {
  const templates = getTemplatesFromStorage();
  const index = templates.findIndex((t) => t.id === id);

  if (index < 0) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveTemplatesToStorage(templates);
  return templates[index];
}

export function incrementTemplateUsage(id: string): void {
  const templates = getTemplatesFromStorage();
  const template = templates.find((t) => t.id === id);
  if (template) {
    template.usageCount += 1;
    saveTemplatesToStorage(templates);
  }
}

export function searchTemplates(
  query: string,
  options?: { category?: string; type?: TemplateType }
): DesignTemplate[] {
  const templates = getTemplatesFromStorage();
  const lowerQuery = query.toLowerCase().trim();

  return templates.filter((template) => {
    if (options?.category && options.category !== '全部' && template.category !== options.category) {
      return false;
    }

    if (options?.type && template.type !== options.type) {
      return false;
    }

    if (!lowerQuery) return true;

    const nameMatch = template.name.toLowerCase().includes(lowerQuery);
    const descMatch = template.description.toLowerCase().includes(lowerQuery);
    const tagMatch = template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

    return nameMatch || descMatch || tagMatch;
  });
}

export function getTemplateCategories(): string[] {
  const templates = getTemplatesFromStorage();
  const categories = new Set<string>();
  templates.forEach((t) => categories.add(t.category));
  return Array.from(categories);
}

function cloneElementsWithNewIds(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((el) => ({ ...el, id: generateId() }));
}

function applyStyleToElements(
  elements: CanvasElement[],
  style: TemplateStyle
): CanvasElement[] {
  let titleAssigned = false;

  return elements.map((el) => {
    if (el.type === 'text') {
      const textEl = el as TextElement;
      const isTitle = !titleAssigned;
      if (isTitle) titleAssigned = true;

      const styleRule = isTitle ? style.titleStyle : style.bodyStyle;

      return {
        ...textEl,
        fontFamily: styleRule.fontFamily,
        fontSize: styleRule.fontSize,
        fontWeight: styleRule.fontWeight,
        fontStyle: styleRule.fontStyle,
        textAlign: styleRule.textAlign,
        fill: styleRule.fill,
      };
    }
    if (el.type === 'lead') {
      return {
        ...el,
        fill: style.leadColor,
      } as LeadElement;
    }
    if (el.type === 'decoration') {
      return {
        ...el,
        fill: style.decorationStyle.fill,
        strokeWidth: style.decorationStyle.strokeWidth,
        strokeColor: style.decorationStyle.strokeColor,
      } as DecorationElement;
    }
    return el;
  });
}

export function applyTemplate(
  template: DesignTemplate,
  currentElements: CanvasElement[]
): { elements: CanvasElement[]; paper: PaperConfig } {
  incrementTemplateUsage(template.id);

  if (template.type === 'full' && template.elements) {
    return {
      elements: cloneElementsWithNewIds(template.elements),
      paper: { ...template.paper },
    };
  }

  if (template.style) {
    const styledElements = applyStyleToElements(currentElements, template.style);
    return {
      elements: styledElements,
      paper: {
        ...template.paper,
        backgroundColor: template.style.backgroundColor,
      },
    };
  }

  return {
    elements: cloneElementsWithNewIds(currentElements),
    paper: { ...template.paper },
  };
}

export function applyTemplateToNewDesign(template: DesignTemplate): {
  elements: CanvasElement[];
  paper: PaperConfig;
} {
  incrementTemplateUsage(template.id);

  if (template.type === 'full' && template.elements) {
    return {
      elements: cloneElementsWithNewIds(template.elements),
      paper: { ...template.paper },
    };
  }

  const elements: CanvasElement[] = [];

  if (template.layout?.titlePositions.length && template.style) {
    template.layout.titlePositions.forEach((pos, index) => {
      elements.push({
        id: generateId(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        text: index === 0 ? '标题文字' : '副标题',
        ...template.style.titleStyle,
      } as TextElement);
    });
  }

  if (template.layout?.bodyPositions.length && template.style) {
    template.layout.bodyPositions.forEach((pos, index) => {
      elements.push({
        id: generateId(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        text: `正文内容 ${index + 1}`,
        ...template.style.bodyStyle,
      } as TextElement);
    });
  }

  if (template.layout?.leadPositions.length && template.style) {
    template.layout.leadPositions.forEach((pos) => {
      elements.push({
        id: generateId(),
        type: 'lead',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        fill: template.style.leadColor,
      } as LeadElement);
    });
  }

  if (template.layout?.decorationPositions.length && template.style) {
    template.layout.decorationPositions.forEach((pos) => {
      elements.push({
        id: generateId(),
        type: 'decoration',
        shape: pos.shape as 'line' | 'circle' | 'rect' | 'diamond',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        fill: template.style.decorationStyle.fill,
        strokeWidth: template.style.decorationStyle.strokeWidth,
        strokeColor: template.style.decorationStyle.strokeColor,
      } as DecorationElement);
    });
  }

  if (elements.length === 0 && template.style) {
    elements.push({
      id: generateId(),
      type: 'text',
      x: 50,
      y: 50,
      width: 300,
      height: 40,
      rotation: 0,
      text: '标题文字',
      ...template.style.titleStyle,
    } as TextElement);

    elements.push({
      id: generateId(),
      type: 'text',
      x: 50,
      y: 110,
      width: 400,
      height: 80,
      rotation: 0,
      text: '这里是正文内容，用于展示风格模板的效果。您可以根据需要修改文字内容。',
      ...template.style.bodyStyle,
    } as TextElement);
  }

  return {
    elements,
    paper: {
      ...template.paper,
      backgroundColor: template.style?.backgroundColor || template.paper.backgroundColor,
    },
  };
}

export function exportTemplate(template: DesignTemplate): string {
  const exportData = {
    version: TEMPLATE_VERSION,
    ...template,
  };
  return JSON.stringify(exportData, null, 2);
}

export function importTemplate(json: string): DesignTemplate | null {
  try {
    const data = JSON.parse(json);
    if (!data.id || !data.name || !data.paper) {
      return null;
    }
    return data as DesignTemplate;
  } catch (e) {
    console.error('Failed to import template:', e);
    return null;
  }
}

export function downloadTemplateFile(template: DesignTemplate): void {
  const json = exportTemplate(template);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `template-${template.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateTemplateThumbnail(
  elements: CanvasElement[],
  paper: PaperConfig
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      const scale = Math.min(maxSize / paper.width, maxSize / paper.height, 1);

      canvas.width = paper.width * scale;
      canvas.height = paper.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.fillStyle = paper.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      elements.forEach((el) => {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-el.width / 2, -el.height / 2);

        if (el.type === 'text') {
          const textEl = el as TextElement;
          ctx.fillStyle = textEl.fill;
          ctx.font = `${textEl.fontWeight} ${textEl.fontSize}px ${textEl.fontFamily}`;
          ctx.textAlign = textEl.textAlign;
          ctx.textBaseline = 'top';

          const textX =
            textEl.textAlign === 'left'
              ? 0
              : textEl.textAlign === 'center'
              ? el.width / 2
              : el.width;

          ctx.fillText(textEl.text.substring(0, 20), textX, 0);
        } else if (el.type === 'lead') {
          const leadEl = el as LeadElement;
          ctx.fillStyle = leadEl.fill;
          ctx.fillRect(0, 0, el.width, el.height);
        } else if (el.type === 'decoration') {
          const decEl = el as DecorationElement;
          ctx.strokeStyle = decEl.strokeColor;
          ctx.lineWidth = decEl.strokeWidth;
          ctx.fillStyle = decEl.fill;

          if (decEl.shape === 'rect') {
            ctx.strokeRect(0, 0, el.width, el.height);
          } else if (decEl.shape === 'circle') {
            ctx.beginPath();
            ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      });

      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Failed to generate thumbnail:', e);
      resolve(null);
    }
  });
}
