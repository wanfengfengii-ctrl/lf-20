import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas,
  FabricObject,
  Textbox,
  Rect,
  Circle,
  Line,
  Polygon,
} from 'fabric';
import type {
  CanvasElement,
  PaperConfig,
  TextElement,
  LeadElement,
  DecorationElement,
} from '../types';

interface FabricCanvasProps {
  paper: PaperConfig;
  elements: CanvasElement[];
  selectedId: string | null;
  onElementSelect: (id: string | null) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementModify: (id: string, updates: Partial<CanvasElement>) => void;
  scale: number;
}

export function FabricCanvas({
  paper,
  elements,
  selectedId,
  onElementSelect,
  onElementMove,
  onElementModify,
  scale,
}: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fabricObjectsRef = useRef<Map<string, FabricObject>>(new Map());
  const isProgrammaticChangeRef = useRef(false);

  const createFabricObject = useCallback((element: CanvasElement): FabricObject => {
    let obj: FabricObject;

    if (element.type === 'text') {
      const textEl = element as TextElement;
      obj = new Textbox(textEl.text, {
        left: element.x,
        top: element.y,
        width: element.width,
        fontSize: textEl.fontSize,
        fontFamily: textEl.fontFamily,
        fontWeight: textEl.fontWeight,
        fontStyle: textEl.fontStyle,
        textAlign: textEl.textAlign,
        fill: textEl.fill,
        angle: element.rotation,
        lockUniScaling: false,
        splitByGrapheme: true,
      });
    } else if (element.type === 'lead') {
      const leadEl = element as LeadElement;
      obj = new Rect({
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fill: leadEl.fill,
        angle: element.rotation,
      });
    } else {
      const decoEl = element as DecorationElement;
      switch (decoEl.shape) {
        case 'circle':
          obj = new Circle({
            left: element.x,
            top: element.y,
            radius: Math.min(element.width, element.height) / 2,
            fill: decoEl.fill,
            stroke: decoEl.strokeColor,
            strokeWidth: decoEl.strokeWidth,
            angle: element.rotation,
          });
          break;
        case 'rect':
          obj = new Rect({
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            fill: decoEl.fill,
            stroke: decoEl.strokeColor,
            strokeWidth: decoEl.strokeWidth,
            angle: element.rotation,
          });
          break;
        case 'diamond':
          obj = new Polygon(
            [
              { x: element.width / 2, y: 0 },
              { x: element.width, y: element.height / 2 },
              { x: element.width / 2, y: element.height },
              { x: 0, y: element.height / 2 },
            ],
            {
              left: element.x,
              top: element.y,
              fill: decoEl.fill,
              stroke: decoEl.strokeColor,
              strokeWidth: decoEl.strokeWidth,
              angle: element.rotation,
            }
          );
          break;
        case 'line':
        default:
          obj = new Line([0, 0, element.width, 0], {
            left: element.x,
            top: element.y,
            stroke: decoEl.strokeColor,
            strokeWidth: element.height > 0 ? element.height : 2,
            angle: element.rotation,
          });
          break;
      }
    }

    (obj as unknown as { data: { id: string; elementType: string } }).data = {
      id: element.id,
      elementType: element.type,
    };
    obj.set('hasControls', true);
    obj.set('transparentCorners', false);
    obj.set('cornerColor', '#228be6');
    obj.set('cornerSize', 8);

    return obj;
  }, []);

  const updateFabricObject = useCallback(
    (obj: FabricObject, element: CanvasElement) => {
      isProgrammaticChangeRef.current = true;

      if (element.type === 'text') {
        const textEl = element as TextElement;
        const textObj = obj as Textbox;
        textObj.set('text', textEl.text);
        textObj.set('fontSize', textEl.fontSize);
        textObj.set('fontFamily', textEl.fontFamily);
        textObj.set('fontWeight', textEl.fontWeight);
        textObj.set('fontStyle', textEl.fontStyle);
        textObj.set('textAlign', textEl.textAlign);
        textObj.set('fill', textEl.fill);
        textObj.set('width', element.width);
      } else if (element.type === 'lead') {
        const leadEl = element as LeadElement;
        const rect = obj as Rect;
        rect.set('width', element.width);
        rect.set('height', element.height);
        rect.set('fill', leadEl.fill);
      } else {
        const decoEl = element as DecorationElement;
        obj.set('fill', decoEl.fill);
        if (obj.type === 'circle') {
          (obj as Circle).set('radius', Math.min(element.width, element.height) / 2);
        } else {
          obj.set('width', element.width);
          obj.set('height', element.height);
        }
        (obj as FabricObject & { stroke: string }).set('stroke', decoEl.strokeColor);
        (obj as FabricObject & { strokeWidth: number }).set(
          'strokeWidth',
          decoEl.strokeWidth
        );
      }

      obj.set('left', element.x);
      obj.set('top', element.y);
      obj.set('angle', element.rotation);
      obj.setCoords();

      isProgrammaticChangeRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: paper.width * scale,
      height: paper.height * scale,
      backgroundColor: paper.backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.on('selection:created', (e) => {
      const selected = e.selected as FabricObject[] | undefined;
      if (selected && selected.length === 1) {
        const obj = selected[0];
        const data = (obj as unknown as { data?: { id: string } }).data;
        if (data?.id) {
          onElementSelect(data.id);
        }
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected as FabricObject[] | undefined;
      if (selected && selected.length === 1) {
        const obj = selected[0];
        const data = (obj as unknown as { data?: { id: string } }).data;
        if (data?.id) {
          onElementSelect(data.id);
        }
      }
    });

    canvas.on('selection:cleared', () => {
      onElementSelect(null);
    });

    canvas.on('object:modified', (e) => {
      if (isProgrammaticChangeRef.current) return;
      const obj = e.target as FabricObject;
      if (!obj) return;

      const data = (obj as unknown as { data?: { id: string } }).data;
      if (!data?.id) return;

      const left = (obj.get('left') as number) || 0;
      const top = (obj.get('top') as number) || 0;
      const angle = (obj.get('angle') as number) || 0;

      const scaleX = (obj.get('scaleX') as number) || 1;
      const scaleYVal = (obj.get('scaleY') as number) || 1;
      const currentWidth = ((obj.get('width') as number) || 0) * scaleX;
      const currentHeight = ((obj.get('height') as number) || 0) * scaleYVal;

      onElementModify(data.id, {
        x: left,
        y: top,
        rotation: angle,
        width: currentWidth,
        height: currentHeight,
      });

      obj.set('scaleX', 1);
      obj.set('scaleY', 1);
      obj.set('width', currentWidth);
      obj.set('height', currentHeight);
      obj.setCoords();
    });

    canvas.on('object:moving', (e) => {
      if (isProgrammaticChangeRef.current) return;
      const obj = e.target as FabricObject;
      if (!obj) return;

      const data = (obj as unknown as { data?: { id: string } }).data;
      if (!data?.id) return;

      onElementMove(data.id, (obj.get('left') as number) || 0, (obj.get('top') as number) || 0);
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      fabricObjectsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setDimensions({
      width: paper.width * scale,
      height: paper.height * scale,
    });
    canvas.backgroundColor = paper.backgroundColor;
    canvas.setZoom(scale);
    canvas.requestRenderAll();
  }, [paper.width, paper.height, paper.backgroundColor, scale]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const currentIds = new Set(elements.map((e) => e.id));
    const existingIds = new Set(fabricObjectsRef.current.keys());

    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const obj = fabricObjectsRef.current.get(id);
        if (obj) {
          canvas.remove(obj);
          fabricObjectsRef.current.delete(id);
        }
      }
    }

    for (const element of elements) {
      const existingObj = fabricObjectsRef.current.get(element.id);
      if (existingObj) {
        updateFabricObject(existingObj, element);
      } else {
        const newObj = createFabricObject(element);
        fabricObjectsRef.current.set(element.id, newObj);
        canvas.add(newObj);
      }
    }

    if (selectedId) {
      const selectedObj = fabricObjectsRef.current.get(selectedId);
      if (selectedObj && !canvas.getActiveObject()) {
        canvas.setActiveObject(selectedObj);
      }
    } else {
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();
  }, [elements, selectedId, createFabricObject, updateFabricObject]);

  return <canvas ref={canvasRef} />;
}
