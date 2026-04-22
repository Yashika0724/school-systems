import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useAvailableParents,
  useAvailableStudentsForTeacher,
  useAvailableAdmins,
  useMessagesRealtime,
} from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ContactGroup = 'parents' | 'students' | 'admins';

export function TeacherMessagesPage() {
  const { user } = useAuth();
  useMessagesRealtime();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: parents, isLoading: parentsLoading } = useAvailableParents();
  const { data: students, isLoading: studentsLoading } = useAvailableStudentsForTeacher();
  const { data: admins, isLoading: adminsLoading } = useAvailableAdmins();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [group, setGroup] = useState<ContactGroup>('parents');
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
  const selectedParent = parents?.find(p => p.user_id === selectedUserId);
  const selectedStudent = students?.find(s => s.user_id === selectedUserId);
  const selectedAdmin = admins?.find(a => a.user_id === selectedUserId);
  const selectedName =
    selectedConversation?.other_user_name ||
    selectedParent?.full_name ||
    selectedStudent?.full_name ||
    selectedAdmin?.full_name ||
    'Unknown';
  const selectedSubtitle = selectedParent
    ? (selectedParent.children?.map(c => c.class).filter(Boolean).join(', ') || 'Parent')
    : selectedStudent
    ? `${selectedStudent.class_label}${selectedStudent.roll_number ? ` · #${selectedStudent.roll_number}` : ''}`
    : selectedAdmin
    ? 'Admin'
    : 'Contact';

  if (conversationsLoading || parentsLoading || studentsLoading || adminsLoading) {
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
          <p className="text-muted-foreground">Communicate with parents, students, and admins</p>
        </div>
        <Button onClick={() => setShowContacts(!showContacts)}>
          <Users className="h-4 w-4 mr-2" />
          {showContacts ? 'View Conversations' : 'New Message'}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {showContacts ? 'Contacts' : 'Conversations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {showContacts && (
              <div className="px-4 pb-2">
                <Tabs value={group} onValueChange={(v) => setGroup(v as ContactGroup)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="parents">Parents</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="admins">Admins</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
            <ScrollArea className="h-[460px]">
              {showContacts ? (
                group === 'parents' ? (
                  parents && parents.length > 0 ? (
                    <div className="divide-y">
                      {parents.map((parent) => (
                        <button
                          key={parent.user_id}
                          className={cn(
                            'w-full p-4 text-left hover:bg-muted transition-colors',
                            selectedUserId === parent.user_id && 'bg-muted',
                          )}
                          onClick={() => {
                            setSelectedUserId(parent.user_id);
                            setShowContacts(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={parent.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(parent.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{parent.full_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {parent.children.slice(0, 2).map((child, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {child.class} {child.roll_number ? `#${child.roll_number}` : ''}
                                  </Badge>
                                ))}
                                {parent.children.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{parent.children.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyContacts label="No parents found" />
                  )
                ) : group === 'students' ? (
                  students && students.length > 0 ? (
                    <div className="divide-y">
                      {students.map((s) => (
                        <button
                          key={s.user_id}
                          className={cn(
                            'w-full p-4 text-left hover:bg-muted transition-colors',
                            selectedUserId === s.user_id && 'bg-muted',
                          )}
                          onClick={() => {
                            setSelectedUserId(s.user_id);
                            setShowContacts(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={s.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(s.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{s.full_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.class_label && (
                                  <Badge variant="secondary" className="text-xs">{s.class_label}</Badge>
                                )}
                                {s.roll_number && (
                                  <Badge variant="outline" className="text-xs">#{s.roll_number}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyContacts label="No students in your classes" />
                  )
                ) : (
                  admins && admins.length > 0 ? (
                    <div className="divide-y">
                      {admins.map((a) => (
                        <button
                          key={a.user_id}
                          className={cn(
                            'w-full p-4 text-left hover:bg-muted transition-colors',
                            selectedUserId === a.user_id && 'bg-muted',
                          )}
                          onClick={() => {
                            setSelectedUserId(a.user_id);
                            setShowContacts(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={a.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(a.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{a.full_name}</p>
                              <p className="text-xs text-muted-foreground">Administrator</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyContacts label="No admins found" />
                  )
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
                    <p className="text-xs">Click "New Message" to start</p>
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
                    <CardDescription>{selectedSubtitle}</CardDescription>
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
                <p className="text-sm">Choose a contact to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyContacts({ label }: { label: string }) {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
