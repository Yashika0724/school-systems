import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useAvailableTeachersForAdmin,
  useMessagesRealtime,
} from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdminMessagesPage() {
  const { user } = useAuth();
  useMessagesRealtime();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: teachers, isLoading: teachersLoading } = useAvailableTeachersForAdmin();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showTeachers, setShowTeachers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useMessages(selectedUserId);

  useEffect(() => {
    if (selectedUserId) markAsRead.mutate(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedUserId || !newMessage.trim()) return;
    await sendMessage.mutateAsync({
      receiver_id: selectedUserId,
      subject: 'Message',
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const selectedConversation = conversations?.find(c => c.other_user_id === selectedUserId);
  const selectedTeacher = teachers?.find(t => t.user_id === selectedUserId);
  const selectedName =
    selectedConversation?.other_user_name || selectedTeacher?.full_name || 'Unknown';

  if (conversationsLoading || teachersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Direct chat with teachers</p>
        </div>
        <Button onClick={() => setShowTeachers(!showTeachers)}>
          <Users className="h-4 w-4 mr-2" />
          {showTeachers ? 'View Conversations' : 'Contact Teacher'}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {showTeachers ? 'Teachers' : 'Conversations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {showTeachers ? (
                teachers && teachers.length > 0 ? (
                  <div className="divide-y">
                    {teachers.map((teacher) => (
                      <button
                        key={teacher.user_id}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted transition-colors',
                          selectedUserId === teacher.user_id && 'bg-muted',
                        )}
                        onClick={() => {
                          setSelectedUserId(teacher.user_id);
                          setShowTeachers(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={teacher.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(teacher.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{teacher.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {teacher.designation || 'Teacher'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No teachers found</p>
                  </div>
                )
              ) : (
                conversations && conversations.length > 0 ? (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <button
                        key={conv.other_user_id}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted transition-colors',
                          selectedUserId === conv.other_user_id && 'bg-muted',
                        )}
                        onClick={() => setSelectedUserId(conv.other_user_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={conv.other_user_avatar || undefined} />
                            <AvatarFallback>{getInitials(conv.other_user_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{conv.other_user_name}</p>
                              {conv.unread_count > 0 && (
                                <Badge className="bg-primary">{conv.unread_count}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(conv.last_message_at), 'MMM dd, hh:mm a')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs">Click "Contact Teacher" to start</p>
                  </div>
                )
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          {selectedUserId ? (
            <>
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedUserId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedName}</CardTitle>
                    <CardDescription>
                      {selectedTeacher?.designation || 'Teacher'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[400px] p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[80%] rounded-lg px-4 py-2',
                                isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={cn(
                                  'text-xs mt-1',
                                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
                                )}
                              >
                                {format(new Date(msg.created_at), 'hh:mm a')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    className="self-end"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a teacher to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
