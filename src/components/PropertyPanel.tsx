import {
  Paper,
  Title,
  TextInput,
  NumberInput,
  Select,
  ColorInput,
  Stack,
  Group,
  Text,
  Badge,
  Divider,
} from '@mantine/core';
import type {
  CanvasElement,
  TextElement,
  LeadElement,
  DecorationElement,
} from '../types';
import { FONT_FAMILIES } from '../types';

interface PropertyPanelProps {
  element: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function PropertyPanel({ element, onUpdateElement }: PropertyPanelProps) {
  if (!element) {
    return (
      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          属性面板
        </Title>
        <Text c="dimmed" size="sm">
          请选择一个元素以编辑其属性
        </Text>
      </Paper>
    );
  }

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    onUpdateElement(element.id, updates);
  };

  const getElementTypeName = () => {
    switch (element.type) {
      case 'text':
        return '文字块';
      case 'lead':
        return '铅条';
      case 'decoration':
        return '装饰元素';
      default:
        return '元素';
    }
  };

  const getElementBadgeColor = () => {
    switch (element.type) {
      case 'text':
        return 'blue';
      case 'lead':
        return 'gray';
      case 'decoration':
        return 'violet';
      default:
        return 'blue';
    }
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>属性面板</Title>
        <Badge color={getElementBadgeColor()}>{getElementTypeName()}</Badge>
      </Group>

      <Stack gap="md">
        <Text size="sm" fw={600}>
          位置与尺寸
        </Text>
        <Group grow>
          <NumberInput
            label="X 坐标"
            value={Math.round(element.x)}
            onChange={(val) => handleUpdate({ x: Number(val) || 0 })}
            size="xs"
          />
          <NumberInput
            label="Y 坐标"
            value={Math.round(element.y)}
            onChange={(val) => handleUpdate({ y: Number(val) || 0 })}
            size="xs"
          />
        </Group>
        <Group grow>
          <NumberInput
            label="宽度"
            value={Math.round(element.width)}
            onChange={(val) =>
              handleUpdate({ width: Math.max(1, Number(val) || 1) })
            }
            min={1}
            size="xs"
          />
          <NumberInput
            label="高度"
            value={Math.round(element.height)}
            onChange={(val) =>
              handleUpdate({ height: Math.max(1, Number(val) || 1) })
            }
            min={1}
            size="xs"
          />
        </Group>
        <NumberInput
          label="旋转角度 (°)"
          value={Math.round(element.rotation)}
          onChange={(val) => handleUpdate({ rotation: Number(val) || 0 })}
          size="xs"
        />

        <Divider />

        {element.type === 'text' && (
          <TextProperties element={element as TextElement} onUpdate={handleUpdate} />
        )}

        {element.type === 'lead' && (
          <LeadProperties element={element as LeadElement} onUpdate={handleUpdate} />
        )}

        {element.type === 'decoration' && (
          <DecorationProperties
            element={element as DecorationElement}
            onUpdate={handleUpdate}
          />
        )}
      </Stack>
    </Paper>
  );
}

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  return (
    <>
      <Text size="sm" fw={600}>
        文字属性
      </Text>

      <TextInput
        label="文字内容"
        value={element.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        size="xs"
      />

      <Select
        label="字体"
        value={element.fontFamily}
        onChange={(val) => val && onUpdate({ fontFamily: val })}
        data={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
        size="xs"
      />

      <NumberInput
        label="字号"
        value={element.fontSize}
        onChange={(val) =>
          onUpdate({ fontSize: Math.max(1, Number(val) || 12) })
        }
        min={1}
        size="xs"
      />

      <Group grow>
        <Select
          label="字重"
          value={element.fontWeight}
          onChange={(val) =>
            val && onUpdate({ fontWeight: val as 'normal' | 'bold' })
          }
          data={[
            { value: 'normal', label: '正常' },
            { value: 'bold', label: '粗体' },
          ]}
          size="xs"
        />
        <Select
          label="样式"
          value={element.fontStyle}
          onChange={(val) =>
            val && onUpdate({ fontStyle: val as 'normal' | 'italic' })
          }
          data={[
            { value: 'normal', label: '正常' },
            { value: 'italic', label: '斜体' },
          ]}
          size="xs"
        />
      </Group>

      <Select
        label="对齐方式"
        value={element.textAlign}
        onChange={(val) =>
          val && onUpdate({ textAlign: val as 'left' | 'center' | 'right' })
        }
        data={[
          { value: 'left', label: '左对齐' },
          { value: 'center', label: '居中' },
          { value: 'right', label: '右对齐' },
        ]}
        size="xs"
      />

      <ColorInput
        label="文字颜色"
        value={element.fill}
        onChange={(val) => onUpdate({ fill: val })}
        size="xs"
        format="hex"
      />
    </>
  );
}

interface LeadPropertiesProps {
  element: LeadElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

function LeadProperties({ element, onUpdate }: LeadPropertiesProps) {
  return (
    <>
      <Text size="sm" fw={600}>
        铅条属性
      </Text>

      <ColorInput
        label="颜色"
        value={element.fill}
        onChange={(val) => onUpdate({ fill: val })}
        size="xs"
        format="hex"
      />
    </>
  );
}

interface DecorationPropertiesProps {
  element: DecorationElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

function DecorationProperties({ element, onUpdate }: DecorationPropertiesProps) {
  return (
    <>
      <Text size="sm" fw={600}>
        装饰属性
      </Text>

      <Select
        label="形状"
        value={element.shape}
        onChange={(val) =>
          val &&
          onUpdate({ shape: val as 'line' | 'circle' | 'rect' | 'diamond' })
        }
        data={[
          { value: 'line', label: '线条' },
          { value: 'rect', label: '矩形' },
          { value: 'circle', label: '圆形' },
          { value: 'diamond', label: '菱形' },
        ]}
        size="xs"
      />

      <ColorInput
        label="填充颜色"
        value={element.fill}
        onChange={(val) => onUpdate({ fill: val })}
        size="xs"
        format="hex"
      />

      <NumberInput
        label="描边宽度"
        value={element.strokeWidth}
        onChange={(val) =>
          onUpdate({ strokeWidth: Math.max(0, Number(val) || 0) })
        }
        min={0}
        size="xs"
      />

      <ColorInput
        label="描边颜色"
        value={element.strokeColor}
        onChange={(val) => onUpdate({ strokeColor: val })}
        size="xs"
        format="hex"
      />
    </>
  );
}
