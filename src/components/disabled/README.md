# Disabled Components

This directory contains components that have been temporarily disabled but are available for future restoration.

## Kanban View (Leads)

The kanban view has been disabled to focus development on the table view. To restore it:

1. Move `kanban-view.tsx` back to `src/components/kanban-view.tsx`
2. In `src/app/leads/page.tsx`:
   - Uncomment the kanban import: `import { KanbanView } from '@/components/kanban-view';`
   - Uncomment the tabs import: `import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';`
   - Add back the LayoutList and TableIcon imports from lucide-react
   - Replace the `<div className="space-y-4">` wrapper with the original `<Tabs defaultValue="table" className="space-y-4">`
   - Add back the TabsList with both table and kanban triggers
   - Wrap the LeadsTable in `<TabsContent value="table">`
   - Add back the kanban TabsContent: `<TabsContent value="kanban"><KanbanView leads={leads} /></TabsContent>`

## Pipeline Kanban View

The pipeline kanban view has been disabled to focus development on the table view. To restore it:

1. Move `pipeline-board.tsx` back to `src/components/pipeline-board.tsx`
2. In `src/app/pipeline/page.tsx`:
   - Uncomment the pipeline board import: `import { PipelineBoard } from '@/components/pipeline-board';`
   - Uncomment the LayoutGrid and Table2 imports from lucide-react
   - Uncomment the ViewType type definition: `type ViewType = 'kanban' | 'table';`
   - Uncomment the viewType state: `const [viewType, setViewType] = useState<ViewType>('table');`
   - Add back the view toggle buttons in the header section
   - Replace the single PipelineTable with conditional rendering:
     ```tsx
     {viewType === 'kanban' ? (
       <PipelineBoard 
         items={pipelineItems}
         isLoading={isLoading}
         selectedBdr={selectedBdr}
         onRefresh={handleRefresh}
       />
     ) : (
       <PipelineTable 
         items={pipelineItems} 
         onRefresh={handleRefresh}
         selectedBdr={selectedBdr}
       />
     )}
     ```

## Why Disabled

The kanban views were disabled because:
- They were not being used actively
- Development focus was shifting to table view features
- To avoid confusion between kanban and table view implementations

## Files

- `kanban-view.tsx` - The main leads kanban view component
- `pipeline-board.tsx` - The pipeline kanban view component
- `README.md` - This documentation file 