import { useMantineTheme, AppShell, Group, Box, Stack, Title, ScrollArea, Badge } from '@mantine/core';
import { FabricCanvas } from './components/FabricCanvas';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { PaperSettings } from './components/PaperSettings';
import { IssuesPanel, AnalysisPanel, DiagnosisPanel } from './components/AnalysisPanel';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { useAppState } from './hooks';

function App() {
  const theme = useMantineTheme();
  const { state, actions, fileInputRef } = useAppState();

  return (
    <AppShell
      padding="md"
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      aside={{
        width: 320,
        breakpoint: 'md',
        collapsed: { desktop: false, mobile: true },
      }}
      style={{ background: theme.colors.gray[1] }}
    >
      <AppShell.Header
        style={{
          background: theme.white,
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Title order={3} c="dark">
              活版印刷工作室
            </Title>
            {state.showCompareView && (
              <Badge color="violet" variant="light" size="lg">
                优化前后对比视图
              </Badge>
            )}
          </Group>
          <Toolbar
            onAddText={actions.addText}
            onAddLead={actions.addLead}
            onAddDecoration={actions.addDecoration}
            onDeleteSelected={actions.deleteSelected}
            onExport={actions.handleExport}
            onImport={actions.handleImport}
            onOpenTemplates={actions.handleOpenTemplates}
            onSaveToLibrary={actions.handleSaveToLibrary}
            onZoomIn={actions.handleZoomIn}
            onZoomOut={actions.handleZoomOut}
            onZoomReset={actions.handleZoomReset}
            zoom={state.zoom}
            hasSelection={!!state.selectedId}
          />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea h="100%">
          <Stack gap="md">
            <PaperSettings paper={state.paper} onUpdatePaper={actions.handleUpdatePaper} />
            <PropertyPanel element={state.selectedElement} onUpdateElement={actions.handleUpdateElement} />
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            overflow: 'auto',
            padding: theme.spacing.xl,
            background: theme.colors.gray[2],
            gap: theme.spacing.lg,
          }}
        >
          {state.showCompareView && state.compareBeforeElements && state.compareAfterElements ? (
            <>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm }}>
                <Badge color="gray" variant="light" size="lg">
                  优化前
                </Badge>
                <Box
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <FabricCanvas
                    paper={state.paper}
                    elements={state.compareBeforeElements}
                    selectedId={null}
                    onElementSelect={() => {}}
                    onElementMove={() => {}}
                    onElementModify={() => {}}
                    scale={state.zoom}
                  />
                </Box>
              </Box>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm }}>
                <Badge color="green" variant="light" size="lg">
                  优化后
                </Badge>
                <Box
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 120, 0, 0.25)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    outline: `3px solid ${theme.colors.green[5]}`,
                  }}
                >
                  <FabricCanvas
                    paper={state.paper}
                    elements={state.compareAfterElements}
                    selectedId={null}
                    onElementSelect={() => {}}
                    onElementMove={() => {}}
                    onElementModify={() => {}}
                    scale={state.zoom}
                  />
                </Box>
              </Box>
            </>
          ) : (
            <Box
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <FabricCanvas
                paper={state.paper}
                elements={state.elements}
                selectedId={state.selectedId}
                onElementSelect={actions.selectElement}
                onElementMove={actions.handleElementMove}
                onElementModify={actions.handleElementModify}
                onModifyStart={actions.handleModifyStart}
                scale={state.zoom}
              />
            </Box>
          )}
        </Box>
      </AppShell.Main>

      <AppShell.Aside p="md">
        <ScrollArea h="100%">
          <Stack gap="md">
            <DiagnosisPanel
              diagnosis={state.layoutDiagnosis}
              onOptimize={actions.handleOptimize}
              canUndo={state.canUndo}
              canRedo={state.canRedo}
              onUndo={actions.handleUndo}
              onRedo={actions.handleRedo}
              showPreview={state.showCompareView}
              onTogglePreview={actions.handleToggleCompare}
              isOptimized={state.hasOptimizeHistory}
              optimizedScore={state.optimizedScore}
            />
            <AnalysisPanel analysis={state.layoutAnalysis} />
            <IssuesPanel issues={state.validationIssues} />
          </Stack>
        </ScrollArea>
      </AppShell.Aside>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={actions.handleFileChange}
      />

      <TemplateLibraryModal
        opened={state.templateModalOpened}
        onClose={actions.handleCloseTemplates}
        onApplyTemplate={actions.handleApplyTemplate}
        elements={state.elements}
        paper={state.paper}
      />
    </AppShell>
  );
}

export default App;
