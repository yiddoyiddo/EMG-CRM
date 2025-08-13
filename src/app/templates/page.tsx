'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Plus, Search, X, Tag, Folder } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { sanitizeEmailHtml, htmlToPlainText } from '@/lib/html';

type TemplateItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  isArchived: boolean;
  categoryId?: string | null;
  updatedAt: string;
  category?: { id: string; name: string } | null;
};

type TemplatesResponse = {
  items: TemplateItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Category = { id: string; name: string; description?: string | null; sortOrder: number; templateCount?: number };

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_INTERNAL_HOSTNAME) return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function useTemplates(params: { search?: string; type?: string; categoryId?: string | null; includeArchived?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.includeArchived) searchParams.set('includeArchived', '1');
  return useQuery({
    queryKey: ['templates', params],
    queryFn: async (): Promise<TemplatesResponse> => {
      const res = await fetch(`${getBaseUrl()}/api/templates?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
  });
}

function useCategories() {
  return useQuery({
    queryKey: ['templateCategories'],
    queryFn: async (): Promise<{ categories: Category[] }> => {
      const res = await fetch(`${getBaseUrl()}/api/templates/categories`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
  });
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<TemplateItem | null>(null);
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useTemplates({ search, type, categoryId: categoryId || undefined, includeArchived });
  const { data: cats } = useCategories();
  const templates = data?.items || [];
  const categories = cats?.categories || [];

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; type?: string; tags?: string[]; categoryId?: string | null }) => {
      const res = await fetch(`${getBaseUrl()}/api/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create template');
      return res.json();
    },
    onSuccess: () => { toast.success('Template created'); queryClient.invalidateQueries({ queryKey: ['templates'] }); queryClient.invalidateQueries({ queryKey: ['templateCategories'] }); setCreateOpen(false); },
    onError: (e: any) => toast.error(e?.message || 'Failed to create template')
  });
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<TemplateItem> }) => {
      const res = await fetch(`${getBaseUrl()}/api/templates/${payload.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload.data) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update template');
      return res.json();
    },
    onSuccess: (tpl) => { toast.success('Template updated'); setEditing(null); queryClient.invalidateQueries({ queryKey: ['templates'] }); queryClient.invalidateQueries({ queryKey: ['template', tpl.id] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update template')
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getBaseUrl()}/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete template');
    },
    onSuccess: () => { toast.success('Template deleted'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['templates'] }); queryClient.invalidateQueries({ queryKey: ['templateCategories'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete template')
  });

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('GENERAL');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [newTags, setNewTags] = useState<string>('');
  const [newContent, setNewContent] = useState('');

  const filteredByCategory = useMemo(() => {
    if (!categoryId) return templates;
    return templates.filter(t => t.categoryId === categoryId);
  }, [templates, categoryId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Templates</span>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Template</DialogTitle>
                  </DialogHeader>
                   <div className="space-y-3">
                    <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Type (e.g. LINKEDIN_INTRO)" value={newType} onChange={e => setNewType(e.target.value)} />
                      <Input placeholder="Category ID (optional)" value={newCategory ?? ''} onChange={e => setNewCategory(e.target.value || null)} />
                    </div>
                    <Input placeholder="Tags (comma separated)" value={newTags} onChange={e => setNewTags(e.target.value)} />
                      <div className="max-h-[60vh] overflow-auto">
                        <RichTextEditor value={newContent} onChange={setNewContent} placeholder="Write or paste formatted content here…" heightClassName="min-h-[240px]" />
                      </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                       <Button onClick={() => createMutation.mutate({ title: newTitle, content: sanitizeEmailHtml(newContent), type: newType, tags: newTags.split(',').map(s => s.trim()).filter(Boolean), categoryId: newCategory })} disabled={createMutation.isPending}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>Knowledgebase for BDR outreach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Input placeholder="Search templates" value={search} onChange={e => setSearch(e.target.value)} />
              <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {categories.map(c => (
                <button key={c.id} className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted ${categoryId === c.id ? 'bg-muted' : ''}`} onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}>
                  <span className="flex items-center gap-2"><Folder className="h-4 w-4" /> {c.name}</span>
                  <Badge variant="secondary">{c.templateCount ?? 0}</Badge>
                </button>
              ))}
              {categories.length === 0 && <div className="text-sm text-muted-foreground">No categories yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-9 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading templates…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredByCategory.map(t => (
              <Card key={t.id} className={t.isArchived ? 'opacity-60' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t.title}</span>
                    <div className="flex items-center gap-2">
                      {t.tags?.slice(0,3).map(tag => <Badge key={tag} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>)}
                    </div>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <span>{t.type}</span>
                    {t.category?.name && <span>• {t.category.name}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6 mb-3" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(t.content) }} />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(t.content); toast.success('Copied HTML'); }}><Copy className="h-4 w-4 mr-2" /> Copy HTML</Button>
                    <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(htmlToPlainText(t.content)); toast.success('Copied Text'); }}>Copy Text</Button>
                    <Button size="sm" onClick={() => setSelected(t)}>Open</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(t.id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredByCategory.length === 0 && (
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>No templates found</CardTitle>
                  <CardDescription>Create your first template to get started.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New template</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* View dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">{selected?.type}{selected?.category?.name ? ` • ${selected.category.name}` : ''}</div>
              <div className="rounded-md bg-background p-3 text-sm max-h-[60vh] overflow-auto prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selected?.content || '') }} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={async () => { if (selected) { await navigator.clipboard.writeText(selected.content); toast.success('Copied HTML'); } }}><Copy className="h-4 w-4 mr-2" /> Copy HTML</Button>
                <Button variant="secondary" onClick={async () => { if (selected) { await navigator.clipboard.writeText(htmlToPlainText(selected.content)); toast.success('Copied Text'); } }}>Copy Text</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={editing?.title || ''} onChange={e => setEditing(editing ? { ...editing, title: e.target.value } : editing)} />
            <Input placeholder="Type" value={editing?.type || ''} onChange={e => setEditing(editing ? { ...editing, type: e.target.value } : editing)} />
            <Input placeholder="Category ID (optional)" value={editing?.categoryId || ''} onChange={e => setEditing(editing ? { ...editing, categoryId: e.target.value } : editing)} />
            <Input placeholder="Tags (comma separated)" value={editing?.tags?.join(', ') || ''} onChange={e => setEditing(editing ? { ...editing, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : editing)} />
              <RichTextEditor value={editing?.content || ''} onChange={(html) => setEditing(editing ? { ...editing, content: html } : editing)} />
            <div className="flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={!!editing?.isArchived} onChange={e => setEditing(editing ? { ...editing, isArchived: e.target.checked } : editing)} /> Archived
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  {editing && <Button onClick={() => updateMutation.mutate({ id: editing.id, data: { title: editing.title, content: sanitizeEmailHtml(editing.content), type: editing.type, tags: editing.tags, categoryId: editing.categoryId, isArchived: editing.isArchived } })}>Save</Button>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


