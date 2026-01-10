import { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  BookMarked,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBooks,
  useBookCategories,
  useStudentBookIssues,
  useStudentReservations,
  useReserveBook,
} from '@/hooks/useLibrary';
import { useDemo } from '@/contexts/DemoContext';

// Demo data
const demoBooks = [
  { id: '1', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', available_copies: 3, total_copies: 5, isbn: '978-0446310789', location: 'Shelf A-1', description: null, publisher: null, publication_year: 1960, cover_url: null, created_at: '', updated_at: '' },
  { id: '2', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', available_copies: 0, total_copies: 2, isbn: '978-0553380163', location: 'Shelf B-3', description: null, publisher: null, publication_year: 1988, cover_url: null, created_at: '', updated_at: '' },
  { id: '3', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', available_copies: 4, total_copies: 4, isbn: '978-0743273565', location: 'Shelf A-2', description: null, publisher: null, publication_year: 1925, cover_url: null, created_at: '', updated_at: '' },
  { id: '4', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Reference', available_copies: 1, total_copies: 3, isbn: '978-0262033848', location: 'Shelf C-1', description: null, publisher: null, publication_year: 2009, cover_url: null, created_at: '', updated_at: '' },
];

const demoIssues = [
  { id: '1', book_id: '2', student_id: '1', issue_date: '2026-01-01', due_date: '2026-01-15', return_date: null, status: 'issued', fine_amount: 0, fine_paid: false, remarks: null, issued_by: null, created_at: '', updated_at: '', book: demoBooks[1] },
];

export function StudentLibraryPage() {
  const { isDemo } = useDemo();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: books, isLoading: booksLoading } = useBooks(categoryFilter !== 'all' ? categoryFilter : undefined);
  const { data: categories } = useBookCategories();
  const { data: issues, isLoading: issuesLoading } = useStudentBookIssues();
  const { data: reservations } = useStudentReservations();
  const reserveBook = useReserveBook();

  const displayBooks = isDemo ? demoBooks : books;
  const displayIssues = isDemo ? demoIssues : issues;
  const displayCategories = isDemo ? ['Fiction', 'Science', 'Reference'] : categories;

  const filteredBooks = displayBooks?.filter(
    book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentIssues = displayIssues?.filter(i => i.status === 'issued') || [];
  const pastIssues = displayIssues?.filter(i => i.status === 'returned') || [];

  const handleReserve = async (bookId: string) => {
    if (isDemo) return;
    await reserveBook.mutateAsync(bookId);
  };

  if (booksLoading && !isDemo) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">Browse books and manage your borrowings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Currently Borrowed</p>
                <p className="text-2xl font-bold text-blue-800">{currentIssues.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Books Returned</p>
                <p className="text-2xl font-bold text-green-800">{pastIssues.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Reservations</p>
                <p className="text-2xl font-bold text-orange-800">{reservations?.length || 0}</p>
              </div>
              <BookMarked className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">
            <Search className="h-4 w-4 mr-2" />
            Browse Books
          </TabsTrigger>
          <TabsTrigger value="borrowed">
            <BookOpen className="h-4 w-4 mr-2" />
            My Books
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
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
                {displayCategories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks?.map((book) => (
              <Card key={book.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{book.category}</Badge>
                      {book.location && (
                        <span className="text-xs text-muted-foreground">{book.location}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {book.available_copies > 0 ? `${book.available_copies} available` : 'Not available'}
                      </span>
                      {book.available_copies === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReserve(book.id)}
                          disabled={isDemo || reserveBook.isPending}
                        >
                          Reserve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBooks?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No books found matching your search</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="borrowed" className="space-y-4">
          {/* Current Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Currently Borrowed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issuesLoading && !isDemo ? (
                <div className="space-y-4">
                  {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : currentIssues.length > 0 ? (
                <div className="space-y-3">
                  {currentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{issue.book?.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.book?.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Due: {new Date(issue.due_date).toLocaleDateString('en-IN')}</p>
                        {new Date(issue.due_date) < new Date() ? (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">Issued</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No books currently borrowed</p>
              )}
            </CardContent>
          </Card>

          {/* Past Issues */}
          {pastIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Return History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="font-medium">{issue.book?.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.book?.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Returned: {issue.return_date ? new Date(issue.return_date).toLocaleDateString('en-IN') : '-'}
                        </p>
                        <Badge className="bg-green-100 text-green-800">Returned</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
