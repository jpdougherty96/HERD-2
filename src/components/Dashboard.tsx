import React, { useState, useEffect } from 'react';
import { User, Class } from '../App';
import { HostDashboard } from './HostDashboard';
import { UserDashboard } from './UserDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, MessageSquare, Star, BookOpen } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export type Booking = {
  id: string;
  classId: string;
  userId: string;
  userEmail: string;
  userName: string;
  hostId: string;
  hostEmail: string;
  hostName: string;
  studentCount: number;
  studentNames: string[];
  totalAmount: number;
  subtotal: number;
  herdFee: number;
  status: 'pending' | 'confirmed' | 'denied' | 'failed';
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
  autoApprove: boolean;
  // Optional fields for enhanced booking data
  className?: string;
  startDate?: string;
  stripePaymentIntentId?: string;
  approvedAt?: string;
  deniedAt?: string;
  hostMessage?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  classId?: string;
  className?: string;
};

export type Conversation = {
  id: string;
  participants: string[];
  participantNames: string[];
  classId?: string;
  className?: string;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
};

interface DashboardProps {
  user: User;
  classes: Class[];
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'profile' | 'dashboard' | 'class-detail') => void;
  onDeleteClass: (classId: string) => Promise<void>;
  onManageClass: (classData: Class) => void;
  onSelectClass: (classData: Class) => void;
}

export function Dashboard({ user, classes, onNavigate, onDeleteClass, onManageClass, onSelectClass }: DashboardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  const loadDashboardData = async () => {
    console.log('📊 Loading dashboard data for user:', user.id);
    
    // Load conversations (still using mock data for now)
    const mockConversations: Conversation[] = [
      {
        id: 'conv1',
        participants: [user.id, user.stripeConnected ? 'student1' : 'host1'],
        participantNames: [user.name, user.stripeConnected ? 'Jane Smith' : 'John Farmer'],
        classId: 'class1',
        className: 'Urban Beekeeping Basics',
        lastMessage: {
          id: 'msg1',
          conversationId: 'conv1',
          senderId: user.stripeConnected ? 'student1' : 'host1',
          receiverId: user.id,
          content: 'I have a question about what to bring to the class.',
          createdAt: new Date().toISOString()
        },
        unreadCount: 1,
        updatedAt: new Date().toISOString()
      }
    ];
    setConversations(mockConversations);

    // Load real bookings from server
    await loadBookingsFromServer();

    // Load favorites (for regular users) - still using mock data for now
    if (!user.stripeConnected) {
      setFavorites(['class1', 'class2']);
    }
  };

  const loadBookingsFromServer = async () => {
    try {
      setLoadingBookings(true);
      console.log('📋 Loading bookings from server for user:', user.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('No access token available for loading bookings');
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const startTime = Date.now();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/bookings/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const serverBookings = await response.json();
        console.log(`📋 Loaded bookings from server in ${duration}ms:`, serverBookings.length, 'bookings');
        
        // Validate that serverBookings is an array
        if (!Array.isArray(serverBookings)) {
          console.warn('Server returned non-array response for bookings:', typeof serverBookings);
          return;
        }
        
        // Enhance bookings with class information
        const enhancedBookings = await enhanceBookingsWithClassData(serverBookings);
        setBookings(enhancedBookings);
      } else {
        const errorText = await response.text();
        console.warn(`❌ Failed to load bookings from server (${duration}ms):`, response.status, errorText);
        
        // Show user-friendly error message
        if (response.status === 401) {
          console.warn('Authentication error - user may need to sign in again');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⏰ Bookings loading request timed out after 10 seconds');
      } else {
        console.error('❌ Error loading bookings from server:', error);
      }
    } finally {
      setLoadingBookings(false);
    }
  };

  // Helper function to enhance bookings with class data
  const enhanceBookingsWithClassData = async (bookings: Booking[]): Promise<Booking[]> => {
    return Promise.all(bookings.map(async (booking) => {
      // Find the class data from the classes prop
      const classData = classes.find(cls => cls.id === booking.classId);
      
      return {
        ...booking,
        className: classData?.title || 'Unknown Class',
        startDate: classData?.startDate || booking.createdAt
      };
    }));
  };



  const handleSendMessage = (conversationId: string, content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId: user.id,
      receiverId: conversations.find(c => c.id === conversationId)?.participants.find(p => p !== user.id) || '',
      content,
      createdAt: new Date().toISOString()
    };

    // Update conversations with new message
    setConversations(conversations.map(conv => 
      conv.id === conversationId 
        ? { ...conv, lastMessage: newMessage, updatedAt: new Date().toISOString() }
        : conv
    ));
  };

  const handleToggleFavorite = (classId: string) => {
    setFavorites(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  if (user.stripeConnected) {
    return (
      <div className="max-w-6xl mx-auto p-3 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl text-[#3c4f21] mb-2">Host Dashboard</h1>
          <p className="text-sm md:text-base text-[#556B2F]">Manage your classes, bookings, and connect with students</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 md:mb-6 h-auto p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <BookOpen size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <Calendar size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">My Classes</span>
              <span className="sm:hidden">Classes</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <Calendar size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Bookings</span>
              <span className="sm:hidden">Books</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4 relative">
              <MessageSquare size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden">Chat</span>
              {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <span className="bg-[#c54a2c] text-white rounded-full px-1.5 py-0.5 text-xs ml-1 absolute -top-1 -right-1 md:relative md:top-0 md:right-0">
                  {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HostDashboard 
              user={user}
              classes={classes.filter(c => c.instructorId === user.id)}
              conversations={conversations}
              onNavigate={onNavigate}
              onDeleteClass={onDeleteClass}
              onManageClass={onManageClass}
            />
          </TabsContent>

          <TabsContent value="classes">
            <HostDashboard 
              user={user}
              classes={classes.filter(c => c.instructorId === user.id)}
              conversations={conversations}
              onNavigate={onNavigate}
              onDeleteClass={onDeleteClass}
              onManageClass={onManageClass}
              activeView="classes"
            />
          </TabsContent>

          <TabsContent value="bookings">
            <HostDashboard 
              user={user}
              classes={classes.filter(c => c.instructorId === user.id)}
              conversations={conversations}
              onNavigate={onNavigate}
              onDeleteClass={onDeleteClass}
              onManageClass={onManageClass}
              activeView="bookings"
            />
          </TabsContent>

          <TabsContent value="messages">
            <HostDashboard 
              user={user}
              classes={classes.filter(c => c.instructorId === user.id)}
              conversations={conversations}
              onNavigate={onNavigate}
              onDeleteClass={onDeleteClass}
              onManageClass={onManageClass}
              activeView="messages"
              onSendMessage={handleSendMessage}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } else {
    return (
      <div className="max-w-6xl mx-auto p-3 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl text-[#3c4f21] mb-2">My Dashboard</h1>
          <p className="text-sm md:text-base text-[#556B2F]">Track your bookings, favorites, and messages</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 md:mb-6 h-auto p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <BookOpen size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <Calendar size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">My Bookings</span>
              <span className="sm:hidden">Books</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4">
              <Star size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Favorites</span>
              <span className="sm:hidden">Favs</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-2 md:px-4 relative">
              <MessageSquare size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden">Chat</span>
              {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <span className="bg-[#c54a2c] text-white rounded-full px-1.5 py-0.5 text-xs ml-1 absolute -top-1 -right-1 md:relative md:top-0 md:right-0">
                  {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <UserDashboard 
              user={user}
              classes={classes}
              bookings={bookings}
              conversations={conversations}
              favorites={favorites}
              onNavigate={onNavigate}
              onRefreshBookings={loadBookingsFromServer}
              loadingBookings={loadingBookings}
              onSelectClass={onSelectClass}
            />
          </TabsContent>

          <TabsContent value="bookings">
            <UserDashboard 
              user={user}
              classes={classes}
              bookings={bookings}
              conversations={conversations}
              favorites={favorites}
              onNavigate={onNavigate}
              activeView="bookings"
              onRefreshBookings={loadBookingsFromServer}
              loadingBookings={loadingBookings}
              onManageClass={onManageClass}
            />
          </TabsContent>

          <TabsContent value="favorites">
            <UserDashboard 
              user={user}
              classes={classes}
              bookings={bookings}
              conversations={conversations}
              favorites={favorites}
              onNavigate={onNavigate}
              activeView="favorites"
              onToggleFavorite={handleToggleFavorite}
              onRefreshBookings={loadBookingsFromServer}
              loadingBookings={loadingBookings}
              onManageClass={onManageClass}
            />
          </TabsContent>

          <TabsContent value="messages">
            <UserDashboard 
              user={user}
              classes={classes}
              bookings={bookings}
              conversations={conversations}
              favorites={favorites}
              onNavigate={onNavigate}
              activeView="messages"
              onSendMessage={handleSendMessage}
              onRefreshBookings={loadBookingsFromServer}
              loadingBookings={loadingBookings}
              onManageClass={onManageClass}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
}