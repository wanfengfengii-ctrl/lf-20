import { Group, Button, Tooltip } from '@mantine/core';
import {
  IconTextCaption,
  IconMinus,
  IconShape,
  IconTrash,
  IconDownload,
  IconUpload,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';

interface ToolbarProps {
  onAddText: () => void;
  onAddLead: () => void;
  onAddDecoration: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onImport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom: number;
  hasSelection: boolean;
}

export function Toolbar({
  onAddText,
  onAddLead,
  onAddDecoration,
  onDeleteSelected,
  onExport,
  onImport,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoom,
  hasSelection,
}: ToolbarProps) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip label="添加文字块">
        <Button leftSection={<IconTextCaption size={16} />} variant="light" onClick={onAddText} size="sm">
          文字
        </Button>
      </Tooltip>

      <Tooltip label="添加铅条">
        <Button leftSection={<IconMinus size={16} />} variant="light" onClick={onAddLead} size="sm">
          铅条
        </Button>
      </Tooltip>

      <Tooltip label="添加装饰元素">
        <Button leftSection={<IconShape size={16} />} variant="light" onClick={onAddDecoration} size="sm">
          装饰
        </Button>
      </Tooltip>

      <Tooltip label="删除选中元素">
        <Button
          leftSection={<IconTrash size={16} />}
          variant="light"
          color="red"
          onClick={onDeleteSelected}
          size="sm"
          disabled={!hasSelection}
        >
          删除
        </Button>
      </Tooltip>

      <Group gap={0} ml="auto">
        <Tooltip label="缩小">
          <Button variant="light" onClick={onZoomOut} size="sm" px="xs">
            <IconZoomOut size={16} />
          </Button>
        </Tooltip>
        <Tooltip label="重置缩放">
          <Button variant="light" onClick={onZoomReset} size="sm" px="xs">
            {Math.round(zoom * 100)}%
          </Button>
        </Tooltip>
        <Tooltip label="放大">
          <Button variant="light" onClick={onZoomIn} size="sm" px="xs">
            <IconZoomIn size={16} />
          </Button>
        </Tooltip>
      </Group>

      <Tooltip label="导入设计">
        <Button leftSection={<IconUpload size={16} />} variant="light" onClick={onImport} size="sm">
          导入
        </Button>
      </Tooltip>

      <Tooltip label="导出设计">
        <Button leftSection={<IconDownload size={16} />} variant="filled" onClick={onExport} size="sm">
          导出
        </Button>
      </Tooltip>
    </Group>
  );
}
