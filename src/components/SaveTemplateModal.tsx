import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Radio,
  Box,
  Text,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { TemplateType, DesignTemplate } from '../types';
import { TEMPLATE_CATEGORIES } from '../types';
import type { CanvasElement, PaperConfig } from '../types';

interface SaveTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (options: {
    name: string;
    category: string;
    tags: string[];
    description: string;
    type: TemplateType;
  }) => void;
  elements: CanvasElement[];
  paper: PaperConfig;
  editingTemplate?: DesignTemplate | null;
}

export function SaveTemplateModal({
  opened,
  onClose,
  onSave,
  elements,
  paper,
  editingTemplate,
}: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>('其他');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>('full');

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setCategory(editingTemplate.category);
      setTags(editingTemplate.tags);
      setDescription(editingTemplate.description);
      setType(editingTemplate.type);
    } else {
      setName('');
      setCategory('其他');
      setTags([]);
      setTagInput('');
      setDescription('');
      setType('full');
    }
  }, [editingTemplate, opened]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category: category || '其他',
      tags,
      description: description.trim(),
      type,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editingTemplate ? '编辑模板' : '保存为模板'}
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="模板名称"
          placeholder="请输入模板名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Select
          label="分类"
          placeholder="请选择分类"
          data={TEMPLATE_CATEGORIES.filter((c) => c !== '全部')}
          value={category}
          onChange={setCategory}
        />

        <div>
          <Text size="sm" fw={500} mb="xs">
            标签
          </Text>
          <Group gap="xs" mb="xs">
            {tags.map((tag) => (
              <Badge
                key={tag}
                size="sm"
                variant="light"
                rightSection={
                  <ActionIcon size={14} variant="transparent" c="gray" onClick={() => handleRemoveTag(tag)}>
                    <IconX size={10} />
                  </ActionIcon>
                }
              >
                {tag}
              </Badge>
            ))}
          </Group>
          <Group gap="xs">
            <TextInput
              placeholder="输入标签后按回车添加"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button size="sm" onClick={handleAddTag} variant="light">
              添加
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            最多添加 10 个标签，便于后续检索
          </Text>
        </div>

        <Textarea
          label="模板说明"
          placeholder="请输入模板的用途、特点等说明信息"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
          maxRows={5}
        />

        <div>
          <Text size="sm" fw={500} mb="xs">
            模板类型
          </Text>
          <Radio.Group value={type} onChange={(val) => setType(val as TemplateType)}>
            <Stack gap="sm">
              <Box
                p="sm"
                style={{
                  border: type === 'full' ? '2px solid #228be6' : '1px solid #e9ecef',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => setType('full')}
              >
                <Group wrap="nowrap">
                  <Radio value="full" size="sm" />
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={500}>
                        完整模板
                      </Text>
                      <Badge size="xs" color="blue" variant="light">
                        推荐
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      保存完整的排版方案，包括所有元素内容、样式和位置。适用于结构固定的设计，如名片、海报等。
                    </Text>
                  </div>
                </Group>
              </Box>

              <Box
                p="sm"
                style={{
                  border: type === 'style' ? '2px solid #9c36b5' : '1px solid #e9ecef',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => setType('style')}
              >
                <Group wrap="nowrap">
                  <Radio value="style" size="sm" />
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={500}>
                        风格模板
                      </Text>
                      <Badge size="xs" color="violet" variant="light">
                        仅样式
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      只保存字体、字号、颜色、排版规则等风格信息，不复制具体文字内容。适用于保持品牌风格统一。
                    </Text>
                  </div>
                </Group>
              </Box>
            </Stack>
          </Radio.Group>
        </div>

        <div>
          <Text size="sm" fw={500} mb="xs">
            预览信息
          </Text>
          <Group gap="xs">
            <Badge variant="outline">
              纸张: {paper.width} × {paper.height}
            </Badge>
            <Badge variant="outline">元素: {elements.length} 个</Badge>
          </Group>
        </div>

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editingTemplate ? '保存修改' : '保存模板'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
