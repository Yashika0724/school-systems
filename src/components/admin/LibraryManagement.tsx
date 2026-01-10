import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Users,
  BookCopy,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useBooks,
  useBookCategories,
  useAllBookIssues,
  useLibraryStats,
  useCreateBook,
  useReturnBook,
  useIssueBook,
  Book,
} from '@/hooks/useLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Hook to get all students for issuing books
function useAllStudents() {
  return useQuery({
    queryKey: ['all-students-for-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          user_id,
          class:classes(id, name, section)
        `)
        .order('roll_number');

      if (error) throw error;

      // Get profiles for students
      const userIds = data.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));

      return data.map(s => ({
        ...s,
        full_name: profileMap.get(s.user_id) || 'Unknown',
      }));
    },
  });
}

export function LibraryManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isIssueBookOpen, setIsIssueBookOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'General',
    publisher: '',
    publication_year: '',
    total_copies: '1',
    location: '',
    description: '',
  });

  const { data: books, isLoading: booksLoading } = useBooks(categoryFilter !== 'all' ? categoryFilter : undefined);
  const { data: categories } = useBookCategories();
  const { data: issues, isLoading: issuesLoading } = useAllBookIssues(statusFilter !== 'all' ? statusFilter : undefined);
  const { data: stats, isLoading: statsLoading } = useLibraryStats();
  const { data: students } = useAllStudents();

  const createBook = useCreateBook();
  const returnBook = useReturnBook();
  const issueBook = useIssueBook();

  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.author) return;

    await createBook.mutateAsync({
      title: newBook.title,
      author: newBook.author,
      isbn: newBook.isbn || null,
      category: newBook.category,
      publisher: newBook.publisher || null,
      publication_year: newBook.publication_year ? parseInt(newBook.publication_year) : null,
      total_copies: parseInt(newBook.total_copies) || 1,
      available_copies: parseInt(newBook.total_copies) || 1,
      location: newBook.location || null,
      description: newBook.description || null,
      cover_url: null,
    });

    setNewBook({
      title: '',
      author: '',
      isbn: '',
      category: 'General',
      publisher: '',
      publication_year: '',
      total_copies: '1',
      location: '',
      description: '',
    });
    setIsAddBookOpen(false);
  };

  const handleReturnBook = async (issueId: string) => {
    await returnBook.mutateAsync(issueId);
  };

  const handleIssueBook = async () => {
    if (!selectedBook || !selectedStudentId || !dueDate) return;

    await issueBook.mutateAsync({
      book_id: selectedBook.id,
      student_id: selectedStudentId,
      due_date: dueDate,
    });

    setIsIssueBookOpen(false);
    setSelectedBook(null);
    setSelectedStudentId('');
    setDueDate('');
  };

  const openIssueDialog = (book: Book) => {
    setSelectedBook(book);
    // Default due date to 14 days from now
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    setDueDate(defaultDue.toISOString().split('T')[0]);
    setIsIssueBookOpen(true);
  };

  const filteredBooks = books?.filter(
    book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Library Management</h1>
          <p className="text-muted-foreground">Manage books, issues, and returns</p>
        </div>
        <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newBook.title}
                  onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Book title"
                />
              </div>
              <div className="space-y-2">
                <Label>Author *</Label>
                <Input
                  value={newBook.author}
                  onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ISBN</Label>
                  <Input
                    value={newBook.isbn}
                    onChange={(e) => setNewBook(prev => ({ ...prev, isbn: e.target.value }))}
                    placeholder="ISBN"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newBook.category}
                    onValueChange={(v) => setNewBook(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Fiction">Fiction</SelectItem>
                      <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Reference">Reference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publisher</Label>
                  <Input
                    value={newBook.publisher}
                    onChange={(e) => setNewBook(prev => ({ ...prev, publisher: e.target.value }))}
                    placeholder="Publisher"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newBook.publication_year}
                    onChange={(e) => setNewBook(prev => ({ ...prev, publication_year: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Copies</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newBook.total_copies}
                    onChange={(e) => setNewBook(prev => ({ ...prev, total_copies: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={newBook.location}
                    onChange={(e) => setNewBook(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Shelf A-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newBook.description}
                  onChange={(e) => setNewBook(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Book description..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateBook} className="w-full" disabled={createBook.isPending}>
                {createBook.isPending ? 'Adding...' : 'Add Book'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Issue Book Dialog */}
      <Dialog open={isIssueBookOpen} onOpenChange={setIsIssueBookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedBook && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedBook.title}</p>
                <p className="text-sm text-muted-foreground">{selectedBook.author}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedBook.available_copies} / {selectedBook.total_copies}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Student *</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.roll_number || 'No roll'}) - {student.class?.name} {student.class?.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <Button 
              onClick={handleIssueBook} 
              className="w-full" 
              disabled={issueBook.isPending || !selectedStudentId || !dueDate}
            >
              {issueBook.isPending ? 'Issuing...' : 'Issue Book'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statsLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Total Titles</p>
                    <p className="text-2xl font-bold text-blue-800">{stats?.totalTitles || 0}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Total Books</p>
                    <p className="text-2xl font-bold text-purple-800">{stats?.totalBooks || 0}</p>
                  </div>
                  <BookCopy className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Available</p>
                    <p className="text-2xl font-bold text-green-800">{stats?.availableBooks || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Issued</p>
                    <p className="text-2xl font-bold text-orange-800">{stats?.issuedBooks || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700">Overdue</p>
                    <p className="text-2xl font-bold text-red-800">{stats?.overdueBooks || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="books" className="space-y-4">
        <TabsList>
          <TabsTrigger value="books">
            <BookOpen className="h-4 w-4 mr-2" />
            Books Catalog
          </TabsTrigger>
          <TabsTrigger value="issues">
            <RotateCcw className="h-4 w-4 mr-2" />
            Issues & Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {booksLoading ? (
                <div className="p-8 space-y-4">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredBooks && filteredBooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{book.title}</p>
                            {book.isbn && <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{book.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}>
                            {book.available_copies} / {book.total_copies}
                          </span>
                        </TableCell>
                        <TableCell>{book.location || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openIssueDialog(book)}
                            disabled={book.available_copies === 0}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Issue
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No books found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {issuesLoading ? (
                <div className="p-8 space-y-4">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : issues && issues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <p className="font-medium">{issue.book?.title || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{issue.book?.author}</p>
                        </TableCell>
                        <TableCell>
                          {new Date(issue.issue_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {new Date(issue.due_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {issue.status === 'issued' ? (
                            <Badge className="bg-blue-100 text-blue-800">Issued</Badge>
                          ) : issue.status === 'returned' ? (
                            <Badge className="bg-green-100 text-green-800">Returned</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {issue.status === 'issued' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturnBook(issue.id)}
                              disabled={returnBook.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Return
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No issues found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
