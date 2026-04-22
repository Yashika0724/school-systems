import { useMemo, useState } from 'react';
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Search,
  Download,
  ExternalLink,
  GraduationCap,
  BookMarked,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentResources, type Resource, type ResourceType } from '@/hooks/useResources';
import { format } from 'date-fns';

const typeMeta: Record<ResourceType, { label: string; icon: typeof FileText; color: string }> = {
  material: { label: 'Material', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  syllabus: { label: 'Syllabus', icon: GraduationCap, color: 'bg-purple-100 text-purple-800' },
  reference: { label: 'Reference', icon: BookMarked, color: 'bg-amber-100 text-amber-800' },
  video: { label: 'Video', icon: Video, color: 'bg-pink-100 text-pink-800' },
  link: { label: 'Link', icon: LinkIcon, color: 'bg-green-100 text-green-800' },
};

export function StudentResourcesPage() {
  const { data: resources, isLoading } = useStudentResources();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');

  const filtered = useMemo(() => {
    if (!resources) return [];
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        (r.subject?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [resources, search, typeFilter]);

  const bySubject = useMemo(() => {
    const map = new Map<string, Resource[]>();
    filtered.forEach((r) => {
      const key = r.subject?.name || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Study Resources</h1>
        <p className="text-muted-foreground">
          Materials, syllabus, and references shared by your teachers
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, subject, or description..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | ResourceType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="material">Materials</TabsTrigger>
            <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="link">Links</TabsTrigger>
          </TabsList>
          <TabsContent value={typeFilter} />
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">
              {resources && resources.length === 0
                ? 'No resources have been shared with your class yet'
                : 'No resources match your filters'}
            </p>
            {resources && resources.length === 0 && (
              <p className="text-sm mt-2">
                Your teachers will upload study materials here as the term progresses.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {bySubject.map(([subject, items]) => (
            <div key={subject} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{subject}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const meta = typeMeta[resource.resource_type];
  const Icon = meta.icon;
  const href = resource.external_url || resource.file_url;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight line-clamp-2">{resource.title}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
              {resource.subject?.name && (
                <Badge variant="outline" className="text-xs">{resource.subject.name}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{resource.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">
            {resource.uploader?.full_name ? `By ${resource.uploader.full_name}` : 'Teacher'}
          </span>
          <span>{format(new Date(resource.created_at), 'MMM d, yyyy')}</span>
        </div>
        {href && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={href} target="_blank" rel="noreferrer noopener">
              {resource.external_url ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open link
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
