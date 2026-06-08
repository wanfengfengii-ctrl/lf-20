import type { CanvasElement, DesignData, PaperConfig } from '../types';

const EXPORT_VERSION = '1.0.0';

export function exportDesign(elements: CanvasElement[], paper: PaperConfig): string {
  const data: DesignData = {
    version: EXPORT_VERSION,
    paper: { ...paper },
    elements: elements.map((el) => ({ ...el })),
    createdAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDesign(json: string): DesignData | null {
  try {
    const data = JSON.parse(json) as DesignData;

    if (!data.version || !data.paper || !Array.isArray(data.elements)) {
      console.error('Invalid design format: missing required fields');
      return null;
    }

    if (typeof data.paper.width !== 'number' || typeof data.paper.height !== 'number') {
      console.error('Invalid paper dimensions');
      return null;
    }

    for (const element of data.elements) {
      if (!element.id || !element.type) {
        console.error('Invalid element: missing id or type');
        return null;
      }
    }

    return data;
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
