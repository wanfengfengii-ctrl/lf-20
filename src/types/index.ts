export type ElementType = 'text' | 'lead' | 'decoration';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
}

export interface LeadElement extends BaseElement {
  type: 'lead';
  fill: string;
}

export interface DecorationElement extends BaseElement {
  type: 'decoration';
  shape: 'line' | 'circle' | 'rect' | 'diamond';
  fill: string;
  strokeWidth: number;
  strokeColor: string;
}

export type CanvasElement = TextElement | LeadElement | DecorationElement;

export interface PaperConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface LayoutAnalysis {
  centerOfGravity: { x: number; y: number };
  textDensity: number;
  leftWeight: number;
  rightWeight: number;
  topWeight: number;
  bottomWeight: number;
  balanceScore: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
}

export interface ValidationIssue {
  id: string;
  type: 'overflow' | 'overlap' | 'density' | 'imbalance' | 'size';
  severity: 'warning' | 'error';
  message: string;
  elementIds?: string[];
}

export interface DesignData {
  version: string;
  paper: PaperConfig;
  elements: CanvasElement[];
  createdAt: string;
}

export const FONT_FAMILIES = [
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
];

export const DEFAULT_PAPER_PRESETS = [
  { name: 'A4', width: 595, height: 842 },
  { name: 'A5', width: 420, height: 595 },
  { name: '信纸', width: 612, height: 792 },
  { name: '名片', width: 252, height: 144 },
  { name: '自定义', width: 0, height: 0 },
];
