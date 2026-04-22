import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  publisher: string | null;
  publication_year: number | null;
  total_copies: number;
  available_copies: number;
  location: string | null;
  description: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookIssue {
  id: string;
  book_id: string;
  student_id: string;
  issued_by: string | null;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  fine_amount: number;
  fine_paid: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  book?: Book;
  student?: {
    id: string;
    roll_number: string | null;
    profile?: { full_name: string };
  };
}

export interface BookReservation {
  id: string;
  book_id: string;
  student_id: string;
  reservation_date: string;
  expiry_date: string;
  status: string;
  created_at: string;
  book?: Book;
}

// Hooks
export function useBooks(category?: string) {
  return useQuery({
    queryKey: ['books', category],
    queryFn: async () => {
      let query = supabase
        .from('books')
        .select('*')
        .order('title');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Book[];
    },
  });
}

export function useBookCategories() {
  return useQuery({
    queryKey: ['book-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('category');

      if (error) throw error;
      const categories = [...new Set(data.map(b => b.category))];
      return categories.sort();
    },
  });
}

export function useStudentBookIssues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-book-issues', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('book_issues')
        .select(`
          *,
          book:books(*)
        `)
        .eq('student_id', student.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      return data as BookIssue[];
    },
    enabled: !!user?.id,
  });
}

export function useStudentBookIssuesById(studentId: string | null | undefined) {
  return useQuery({
    queryKey: ['student-book-issues-by-id', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_issues')
        .select(`*, book:books(*)`)
        .eq('student_id', studentId!)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      return data as BookIssue[];
    },
  });
}

export function useAllBookIssues(status?: string) {
  return useQuery({
    queryKey: ['all-book-issues', status],
    queryFn: async () => {
      let query = supabase
        .from('book_issues')
        .select(`
          *,
          book:books(*)
        `)
        .order('issue_date', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BookIssue[];
    },
  });
}

export function useStudentReservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-reservations', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('book_reservations')
        .select(`
          *,
          book:books(*)
        `)
        .eq('student_id', student.id)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      return data as BookReservation[];
    },
    enabled: !!user?.id,
  });
}

export function useLibraryStats() {
  return useQuery({
    queryKey: ['library-stats'],
    queryFn: async () => {
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('total_copies, available_copies');

      if (booksError) throw booksError;

      const { data: issues, error: issuesError } = await supabase
        .from('book_issues')
        .select('status');

      if (issuesError) throw issuesError;

      const totalBooks = books?.reduce((sum, b) => sum + b.total_copies, 0) || 0;
      const availableBooks = books?.reduce((sum, b) => sum + b.available_copies, 0) || 0;
      const issuedBooks = issues?.filter(i => i.status === 'issued').length || 0;
      const overdueBooks = issues?.filter(i => i.status === 'overdue').length || 0;

      return {
        totalBooks,
        availableBooks,
        issuedBooks,
        overdueBooks,
        totalTitles: books?.length || 0,
      };
    },
  });
}

// Mutations
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('books').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      toast.success('Book added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add book: ${error.message}`);
    },
  });
}

export function useIssueBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      book_id: string;
      student_id: string;
      due_date: string;
    }) => {
      // Issue book
      const { error: issueError } = await supabase.from('book_issues').insert({
        book_id: data.book_id,
        student_id: data.student_id,
        due_date: data.due_date,
        status: 'issued',
      });

      if (issueError) throw issueError;

      // Update available copies
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', data.book_id)
        .single();

      if (bookError) throw bookError;

      const { error: updateError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', data.book_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['all-book-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      toast.success('Book issued successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to issue book: ${error.message}`);
    },
  });
}

export function useReturnBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      // Get issue details
      const { data: issue, error: issueError } = await supabase
        .from('book_issues')
        .select('book_id')
        .eq('id', issueId)
        .single();

      if (issueError) throw issueError;

      // Update issue
      const { error: updateIssueError } = await supabase
        .from('book_issues')
        .update({
          status: 'returned',
          return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', issueId);

      if (updateIssueError) throw updateIssueError;

      // Update available copies
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', issue.book_id)
        .single();

      if (bookError) throw bookError;

      const { error: updateBookError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies + 1 })
        .eq('id', issue.book_id);

      if (updateBookError) throw updateBookError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['all-book-issues'] });
      queryClient.invalidateQueries({ queryKey: ['student-book-issues'] });
      queryClient.invalidateQueries({ queryKey: ['library-stats'] });
      toast.success('Book returned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to return book: ${error.message}`);
    },
  });
}

export function useReserveBook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      if (!user?.id) throw new Error('No user ID');

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { error } = await supabase.from('book_reservations').insert({
        book_id: bookId,
        student_id: student.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-reservations'] });
      toast.success('Book reserved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reserve book: ${error.message}`);
    },
  });
}
