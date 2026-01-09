import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Search,
  Plus,
  Loader2
} from 'lucide-react';
import { StudentsList } from './StudentsList';
import { TeachersList } from './TeachersList';
import { ParentsList } from './ParentsList';
import { CreateUserDialog } from './CreateUserDialog';

interface UserManagementProps {
  defaultTab?: 'students' | 'teachers' | 'parents';
}

export function UserManagement({ defaultTab = 'students' }: UserManagementProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createUserType, setCreateUserType] = useState<'student' | 'teacher' | 'parent'>('student');

  const handleCreateUser = (type: 'student' | 'teacher' | 'parent') => {
    setCreateUserType(type);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage students, teachers, and parents</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="parents" className="gap-2">
              <Users className="h-4 w-4" />
              Parents
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={() => handleCreateUser(activeTab === 'students' ? 'student' : activeTab === 'teachers' ? 'teacher' : 'parent')}>
              <Plus className="h-4 w-4 mr-2" />
              Add {activeTab === 'students' ? 'Student' : activeTab === 'teachers' ? 'Teacher' : 'Parent'}
            </Button>
          </div>
        </div>

        <TabsContent value="students" className="mt-6">
          <StudentsList searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="teachers" className="mt-6">
          <TeachersList searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="parents" className="mt-6">
          <ParentsList searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        userType={createUserType}
      />
    </div>
  );
}
