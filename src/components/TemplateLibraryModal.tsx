import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  TextInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Group,
  Button,
  Text,
  Box,
  Center,
} from '@mantine/core';
import { IconSearch, IconPlus, IconTemplate, IconUpload } from '@tabler/icons-react';
import { TemplateCard } from './TemplateCard';
import { SaveTemplateModal } from './SaveTemplateModal';
import type { DesignTemplate, TemplateType, CanvasElement, PaperConfig } from '../types';
import {
  getAllTemplates,
  searchTemplates,
  saveTemplate,
  deleteTemplate,
  createTemplate,
  downloadTemplateFile,
  generateTemplateThumbnail,
  updateTemplate,
  importTemplate,
} from '../utils/templateStorage';
import { notifications } from '@mantine/notifications';

interface TemplateLibraryModalProps {
  opened: boolean;
  onClose: () => void;
  onApplyTemplate: (template: DesignTemplate) => void;
  elements: CanvasElement[];
  paper: PaperConfig;
}

export function TemplateLibraryModal({
  opened,
  onClose,
  onApplyTemplate,
  elements,
  paper,
}: TemplateLibraryModalProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TemplateType>('all');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [saveModalOpened, setSaveModalOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DesignTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = () => {
    const allTemplates = getAllTemplates();
    setTemplates(allTemplates);
  };

  useEffect(() => {
    if (opened) {
      loadTemplates();
    }
  }, [opened]);

  const filteredTemplates = useMemo(() => {
    const typeFilter = filterType === 'all' ? undefined : filterType;
    return searchTemplates(searchQuery, {
      category: activeCategory,
      type: typeFilter,
    });
  }, [searchQuery, filterType, activeCategory, templates]);

  const handleSaveTemplate = async (options: {
    name: string;
    category: string;
    tags: string[];
    description: string;
    type: TemplateType;
  }) => {
    try {
      const thumbnail = await generateTemplateThumbnail(elements, paper);

      if (editingTemplate) {
        const updatedTemplate = createTemplate(elements, paper, {
          ...options,
          thumbnail,
        });
        updateTemplate(editingTemplate.id, {
          ...updatedTemplate,
          id: editingTemplate.id,
          createdAt: editingTemplate.createdAt,
          usageCount: editingTemplate.usageCount,
        });
        notifications.show({
          title: '更新成功',
          message: '模板信息和内容已更新',
          color: 'green',
        });
      } else {
        const template = createTemplate(elements, paper, {
          ...options,
          thumbnail,
        });
        saveTemplate(template);
        notifications.show({
          title: '保存成功',
          message: `模板 "${options.name}" 已保存`,
          color: 'green',
        });
      }

      loadTemplates();
      setEditingTemplate(null);
    } catch (e) {
      notifications.show({
        title: '保存失败',
        message: '模板保存失败，请重试',
        color: 'red',
      });
    }
  };

  const handleDeleteTemplate = (template: DesignTemplate) => {
    if (window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      deleteTemplate(template.id);
      loadTemplates();
      notifications.show({
        title: '已删除',
        message: `模板 "${template.name}" 已删除`,
        color: 'blue',
      });
    }
  };

  const handleEditTemplate = (template: DesignTemplate) => {
    setEditingTemplate(template);
    setSaveModalOpened(true);
  };

  const handleExportTemplate = (template: DesignTemplate) => {
    downloadTemplateFile(template);
    notifications.show({
      title: '导出成功',
      message: `模板 "${template.name}" 已导出`,
      color: 'green',
    });
  };

  const handleApplyTemplate = (template: DesignTemplate) => {
    onApplyTemplate(template);
    onClose();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let importedTemplate = importTemplate(content);
        
        if (importedTemplate) {
          importedTemplate = {
            ...importedTemplate,
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0,
          };
          saveTemplate(importedTemplate);
          loadTemplates();
          notifications.show({
            title: '导入成功',
            message: `模板 "${importedTemplate.name}" 已导入`,
            color: 'green',
          });
        } else {
          notifications.show({
            title: '导入失败',
            message: '模板文件格式不正确',
            color: 'red',
          });
        }
      } catch (err) {
        notifications.show({
          title: '导入失败',
          message: '读取文件失败，请重试',
          color: 'red',
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ['全部', ...Array.from(cats)];
  }, [templates]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="模板库"
        size="xl"
        fullScreen
        style={{ maxWidth: 1200 }}
      >
        <Stack gap="md" h="calc(100vh - 120px)">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" style={{ flex: 1 }}>
              <TextInput
                placeholder="搜索模板名称、描述或标签..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, maxWidth: 400 }}
              />
              <SegmentedControl
                value={filterType}
                onChange={(val) => setFilterType(val as 'all' | TemplateType)}
                data={[
                  { value: 'all', label: '全部' },
                  { value: 'full', label: '完整模板' },
                  { value: 'style', label: '风格模板' },
                ]}
                size="sm"
              />
            </Group>
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconUpload size={16} />}
                onClick={handleImportClick}
              >
                导入模板
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setEditingTemplate(null);
                  setSaveModalOpened(true);
                }}
              >
                保存当前设计
              </Button>
            </Group>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </Group>

          <Group gap={4} grow noWrap align="flex-start">
            <Box style={{ width: 140, flexShrink: 0 }}>
              <Stack gap={2}>
                <Text size="xs" fw={500} c="dimmed" px="xs" py={4}>
                  分类
                </Text>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? 'light' : 'subtle'}
                    size="sm"
                    fullWidth
                    justify="flex-start"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box style={{ flex: 1, overflow: 'auto' }}>
              {filteredTemplates.length > 0 ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleApplyTemplate}
                      onDelete={handleDeleteTemplate}
                      onEdit={handleEditTemplate}
                      onExport={handleExportTemplate}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Center style={{ height: '100%', minHeight: 300 }}>
                  <Stack align="center" gap="md">
                    <IconTemplate size={48} color="#adb5bd" />
                    <Stack gap={4} align="center">
                      <Text fw={500} size="lg">
                        暂无模板
                      </Text>
                      <Text size="sm" c="dimmed" ta="center" maw={300}>
                        {searchQuery || filterType !== 'all' || activeCategory !== '全部'
                          ? '没有找到匹配的模板，试试其他搜索条件'
                          : '还没有保存任何模板，点击"保存当前设计"开始创建'}
                      </Text>
                    </Stack>
                  </Stack>
                </Center>
              )}
            </Box>
          </Group>

          <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
            <Text size="sm" c="dimmed">
              共 {filteredTemplates.length} 个模板
            </Text>
            <Button variant="light" onClick={onClose}>
              关闭
            </Button>
          </Group>
        </Stack>
      </Modal>

      <SaveTemplateModal
        opened={saveModalOpened}
        onClose={() => {
          setSaveModalOpened(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        elements={elements}
        paper={paper}
        editingTemplate={editingTemplate}
      />
    </>
  );
}
