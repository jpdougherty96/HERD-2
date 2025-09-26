import React, { useState, useEffect } from 'react';
import { User, Class } from '../App';
import { Booking, Conversation } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessagingCenter } from './MessagingCenter';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar, Users, DollarSign, MessageSquare, Plus, Eye, Check, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

// New booking type for our system
interface HerdBooking {
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
  approvedAt?: string;
  deniedAt?: string;
  hostMessage?: string;
  stripePaymentIntentId?: string;
}

interface HostDashboardProps {
  user: User;
  classes: Class[];
  conversations: Conversation[];
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'profile' | 'dashboard') => void;
  onDeleteClass: (classId: string) => Promise<void>;
  onManageClass: (classData: Class) => void;
  activeView?: 'overview' | 'classes' | 'bookings' | 'messages';
  onSendMessage?: (conversationId: string, content: string) => void;
}

export function HostDashboard({ 
  user, 
  classes, 
  conversations, 
  onNavigate, 
  onDeleteClass,
  onManageClass,
  activeView = 'overview',
  onSendMessage
}: HostDashboardProps) {
  const [bookings, setBookings] = useState<HerdBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<HerdBooking | null>(null);
  const [denialMessage, setDenialMessage] = useState('');
  
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.subtotal, 0);
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Load bookings
  useEffect(() => {
    fetchBookings();
  }, [user.id]);

  const fetchBookings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/bookings/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only host bookings
        const hostBookings = data.filter((booking: HerdBooking) => booking.hostId === user.id);
        setBookings(hostBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingResponse = async (bookingId: string, action: 'approve' | 'deny', message?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/booking/${bookingId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, message })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (action === 'approve') {
          alert('Booking approved! Payment has been processed and the guest will receive confirmation details.');
        } else {
          alert('Booking denied. The guest has been notified.');
        }
        
        // Refresh bookings
        fetchBookings();
        setSelectedBooking(null);
        setDenialMessage('');
      } else {
        // Handle both JSON and text error responses
        let errorMessage = 'Failed to process booking response';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, try to get text response
          try {
            const errorText = await response.text();
            errorMessage = errorText || `Server error: ${response.status}`;
          } catch {
            errorMessage = `Server error: ${response.status}`;
          }
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error responding to booking:', error);
      alert('An error occurred while processing your response. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (activeView === 'overview') {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-[#556B2F]">Listed Classes</CardTitle>
              <Calendar className="h-4 w-4 text-[#556B2F]" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-[#3c4f21]">{classes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-[#556B2F]">Pending Bookings</CardTitle>
              <Users className="h-4 w-4 text-[#c54a2c]" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-[#3c4f21]">{pendingBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-[#556B2F]">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-[#556B2F]" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-[#3c4f21]">${totalRevenue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-[#556B2F]">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-[#c54a2c]" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-[#3c4f21]">{unreadMessages}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => onNavigate('create-class')}
            className="bg-[#556B2F] hover:bg-[#3c4f21] text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create New Class</span>
            <span className="sm:hidden">New Class</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('classes')}
            className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View All Classes</span>
            <span className="sm:hidden">View Classes</span>
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Pending Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3c4f21] text-lg">Pending Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending bookings</p>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.slice(0, 3).map((booking) => {
                    const classData = classes.find(c => c.id === booking.classId);
                    return (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#f8f9f6] rounded-lg gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#3c4f21] truncate">{booking.userName}</p>
                          <p className="text-sm text-[#556B2F] truncate">{classData?.title || 'Unknown Class'}</p>
                          <p className="text-xs text-gray-500">{booking.studentCount} student{booking.studentCount > 1 ? 's' : ''}</p>
                          <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                            onClick={() => handleBookingResponse(booking.id, 'approve')}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-8 px-3"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3c4f21] text-lg">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No messages</p>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 3).map((conversation) => (
                    <div key={conversation.id} className="p-3 bg-[#f8f9f6] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#3c4f21] truncate">
                          {conversation.participantNames.find(name => name !== user.name)}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-[#c54a2c] text-white">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#556B2F] mb-1 truncate">{conversation.className}</p>
                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeView === 'classes') {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-[#3c4f21]">My Classes</h2>
          <Button 
            onClick={() => onNavigate('create-class')}
            className="bg-[#556B2F] hover:bg-[#3c4f21] text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create New Class</span>
            <span className="sm:hidden">New Class</span>
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#556B2F] mx-auto mb-4"></div>
              <p className="text-gray-500">Loading classes...</p>
            </CardContent>
          </Card>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven't created any classes yet</p>
              <Button 
                onClick={() => onNavigate('create-class')}
                className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
              >
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {classes.map((cls) => {
              const classBookings = bookings.filter(b => b.classId === cls.id);
              const pendingCount = classBookings.filter(b => b.status === 'pending').length;
              const confirmedCount = classBookings.filter(b => b.status === 'confirmed').length;
              
              return (
                <Card key={cls.id} className="overflow-hidden">
                  {/* Class Photo */}
                  <div className="relative w-full h-40 md:h-48 bg-gray-100">
                    {cls.photos && cls.photos.length > 0 ? (
                      <ImageWithFallback
                        src={cls.photos[0]}
                        alt={cls.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#f8f9f6] to-[#e8e9e6] flex items-center justify-center">
                        <div className="text-center text-[#556B2F]">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs opacity-70">No photo</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-[#556B2F] text-[#f8f9f6] text-xs">
                        ${cls.pricePerPerson}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#3c4f21] text-lg leading-tight">{cls.title}</CardTitle>
                    <p className="text-sm text-[#556B2F] line-clamp-2">{cls.shortSummary}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm"><strong>Date:</strong> {formatDate(cls.startDate)}{cls.startTime && ` at ${formatTime(cls.startTime)}`}</p>
                      <p className="text-sm"><strong>Max Students:</strong> {cls.maxStudents}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {pendingCount > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {pendingCount} pending
                        </Badge>
                      )}
                      {confirmedCount > 0 && (
                        <Badge className="bg-green-100 text-green-800">
                          {confirmedCount} confirmed
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                        onClick={() => onManageClass(cls)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Manage Class
                      </Button>
                      
                      {/* Only show delete button to admins and class hosts */}
                      {(user.isAdmin || cls.instructorId === user.id) && (
                        <div className="relative">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={() => onDeleteClass(cls.id)}
                            title={user.isAdmin ? "Delete class (Admin privileges)" : "Delete class (requires no active bookings)"}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Class
                            {user.isAdmin && (
                              <Badge className="ml-2 bg-orange-500 text-white text-xs px-1 py-0">
                                ADMIN
                              </Badge>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'bookings') {
    return (
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-[#3c4f21]">Booking Management</h2>
        
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#556B2F] mx-auto mb-4"></div>
              <p className="text-gray-500">Loading bookings...</p>
            </CardContent>
          </Card>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bookings yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const classData = classes.find(c => c.id === booking.classId);
              return (
                <Card key={booking.id}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="font-bold text-[#3c4f21] truncate">{classData?.title || 'Unknown Class'}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div>
                            <p className="text-sm text-[#556B2F]"><strong>Guest:</strong> {booking.userName}</p>
                            <p className="text-sm text-[#556B2F] truncate"><strong>Email:</strong> {booking.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-sm text-[#556B2F]"><strong>Students:</strong> {booking.studentCount}</p>
                            <p className="text-sm text-[#556B2F]"><strong>Your earnings:</strong> ${booking.subtotal.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          <p className="text-sm text-gray-500">
                            <strong>Student Names:</strong> {booking.studentNames.join(', ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            <strong>Class Date:</strong> {classData ? formatDate(classData.startDate) : 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            <strong>Booked:</strong> {formatDate(booking.createdAt)}
                          </p>
                        </div>

                        {booking.status === 'denied' && booking.hostMessage && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <p className="text-sm text-red-800"><strong>Denial reason:</strong> {booking.hostMessage}</p>
                          </div>
                        )}
                      </div>
                      
                      {booking.status === 'pending' && (
                        <div className="flex gap-2 justify-end lg:justify-start">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleBookingResponse(booking.id, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Deny</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Denial modal component
  const DenialModal = () => {
    if (!selectedBooking) return null;
    
    const classData = classes.find(c => c.id === selectedBooking.classId);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="bg-[#ffffff] border-[#a8b892] max-w-md w-full">
          <CardHeader className="bg-[#c54a2c] text-[#f8f9f6]">
            <CardTitle className="text-lg">Deny Booking Request</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#556B2F] mb-2">
                <strong>Guest:</strong> {selectedBooking.userName}
              </p>
              <p className="text-sm text-[#556B2F] mb-2">
                <strong>Class:</strong> {classData?.title || 'Unknown Class'}
              </p>
              <p className="text-sm text-[#556B2F] mb-4">
                <strong>Students:</strong> {selectedBooking.studentCount} ({selectedBooking.studentNames.join(', ')})
              </p>
            </div>
            
            <div>
              <Label htmlFor="denialMessage">Reason for denial (optional)</Label>
              <Textarea
                id="denialMessage"
                placeholder="Let the guest know why you can't accommodate their booking..."
                value={denialMessage}
                onChange={(e) => setDenialMessage(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBooking(null);
                  setDenialMessage('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleBookingResponse(selectedBooking.id, 'deny', denialMessage)}
                className="flex-1"
              >
                Deny Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (activeView === 'messages' && onSendMessage) {
    return (
      <>
        <MessagingCenter 
          conversations={conversations}
          currentUserId={user.id}
          currentUserName={user.name}
          onSendMessage={onSendMessage}
        />
        <DenialModal />
      </>
    );
  }

  return <DenialModal />;
}