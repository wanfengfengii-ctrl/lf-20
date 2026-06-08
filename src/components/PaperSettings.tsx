import { Paper, Title, Stack, NumberInput, Select, ColorInput, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import type { PaperConfig } from '../types';
import { DEFAULT_PAPER_PRESETS } from '../types';

interface PaperSettingsProps {
  paper: PaperConfig;
  onUpdatePaper: (paper: PaperConfig) => void;
}

export function PaperSettings({ paper, onUpdatePaper }: PaperSettingsProps) {
  const form = useForm({
    initialValues: {
      preset: '自定义',
      width: paper.width,
      height: paper.height,
      backgroundColor: paper.backgroundColor,
    },
  });

  useEffect(() => {
    const preset = DEFAULT_PAPER_PRESETS.find(
      (p) => p.width === paper.width && p.height === paper.height && p.name !== '自定义'
    );
    form.setValues({
      preset: preset ? preset.name : '自定义',
      width: paper.width,
      height: paper.height,
      backgroundColor: paper.backgroundColor,
    });
  }, [paper.width, paper.height, paper.backgroundColor]);

  const handlePresetChange = (presetName: string) => {
    const preset = DEFAULT_PAPER_PRESETS.find((p) => p.name === presetName);
    if (preset && preset.name !== '自定义') {
      form.setValues({
        preset: presetName,
        width: preset.width,
        height: preset.height,
      });
      onUpdatePaper({
        ...paper,
        width: preset.width,
        height: preset.height,
      });
    } else {
      form.setFieldValue('preset', presetName);
    }
  };

  const handleDimensionChange = (field: 'width' | 'height', value: number) => {
    const numValue = Math.max(50, value);
    form.setFieldValue(field, numValue);

    const newPaper = {
      ...paper,
      [field]: numValue,
    };

    const preset = DEFAULT_PAPER_PRESETS.find(
      (p) => p.width === newPaper.width && p.height === newPaper.height && p.name !== '自定义'
    );
    if (preset) {
      form.setFieldValue('preset', preset.name);
    } else {
      form.setFieldValue('preset', '自定义');
    }

    onUpdatePaper(newPaper);
  };

  const handleColorChange = (color: string) => {
    form.setFieldValue('backgroundColor', color);
    onUpdatePaper({
      ...paper,
      backgroundColor: color,
    });
  };

  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="md">纸张设置</Title>

      <Stack gap="md">
        <Select
          label="纸张预设"
          value={form.values.preset}
          onChange={(val) => val && handlePresetChange(val)}
          data={DEFAULT_PAPER_PRESETS.map((p) => ({ value: p.name, label: p.name }))}
          size="xs"
        />

        <Group grow>
          <NumberInput
            label="宽度 (px)"
            value={form.values.width}
            onChange={(val) => handleDimensionChange('width', Number(val) || 50)}
            min={50}
            size="xs"
          />
          <NumberInput
            label="高度 (px)"
            value={form.values.height}
            onChange={(val) => handleDimensionChange('height', Number(val) || 50)}
            min={50}
            size="xs"
          />
        </Group>

        <ColorInput
          label="背景颜色"
          value={form.values.backgroundColor}
          onChange={handleColorChange}
          size="xs"
          format="hex"
        />

        <Text size="xs" c="dimmed">
          尺寸：{paper.width} × {paper.height} px
        </Text>
      </Stack>
    </Paper>
  );
}
