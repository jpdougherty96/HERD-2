import React from 'react';
import { User, Class } from '../App';
import { Booking, Conversation } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessagingCenter } from './MessagingCenter';
import { Calendar, Heart, MessageSquare, BookOpen, Star, Eye, HeartIcon, RefreshCw } from 'lucide-react';

interface UserDashboardProps {
  user: User;
  classes: Class[];
  bookings: Booking[];
  conversations: Conversation[];
  favorites: string[];
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'profile' | 'dashboard') => void;
  activeView?: 'overview' | 'bookings' | 'favorites' | 'messages';
  onToggleFavorite?: (classId: string) => void;
  onSendMessage?: (conversationId: string, content: string) => void;
  onRefreshBookings?: () => void;
  loadingBookings?: boolean;
  onManageClass?: (classData: Class) => void;
}

export function UserDashboard({ 
  user, 
  classes,
  bookings, 
  conversations, 
  favorites,
  onNavigate, 
  activeView = 'overview',
  onToggleFavorite,
  onSendMessage,
  onRefreshBookings,
  loadingBookings = false,
  onManageClass
}: UserDashboardProps) {
  
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const favoriteClasses = classes.filter(cls => favorites.includes(cls.id));
  
  // Filter bookings where user is the student (not the host)
  const myBookings = bookings.filter(b => b.userId === user.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'denied': return 'Denied';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const handleClassTitleClick = (classId: string) => {
    if (!onManageClass) return;
    
    const classData = classes.find(cls => cls.id === classId);
    if (classData) {
      onManageClass(classData);
    } else {
      console.warn('Class not found for ID:', classId);
    }
  };

  if (activeView === 'overview') {
    return (
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#556B2F]">My Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-[#556B2F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3c4f21]">{myBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#556B2F]">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-[#c54a2c]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3c4f21]">{pendingBookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#556B2F]">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-[#c54a2c]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3c4f21]">{favorites.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#556B2F]">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-[#c54a2c]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3c4f21]">{unreadMessages}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={() => onNavigate('classes')}
            className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Classes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('bulletin')}
            className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Bulletin Board
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3c4f21]">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {myBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No bookings yet</p>
                  <Button 
                    onClick={() => onNavigate('classes')}
                    className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
                  >
                    Browse Classes
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="p-3 bg-[#f8f9f6] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        {onManageClass ? (
                          <button
                            onClick={() => handleClassTitleClick(booking.classId)}
                            className="font-medium text-[#3c4f21] hover:text-[#556B2F] underline text-left"
                          >
                            {booking.className || 'Unknown Class'}
                          </button>
                        ) : (
                          <p className="font-medium text-[#3c4f21]">{booking.className || 'Unknown Class'}</p>
                        )}
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusDisplayName(booking.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#556B2F]">Host: {booking.hostName}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.startDate || booking.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Favorite Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3c4f21]">Favorite Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {favoriteClasses.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No favorites yet</p>
                  <Button 
                    onClick={() => onNavigate('classes')}
                    className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
                  >
                    Discover Classes
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoriteClasses.slice(0, 3).map((cls) => (
                    <div key={cls.id} className="p-3 bg-[#f8f9f6] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#3c4f21]">{cls.title}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-[#c54a2c] hover:text-[#c54a2c]"
                          onClick={() => onToggleFavorite?.(cls.id)}
                        >
                          <HeartIcon className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                      <p className="text-sm text-[#556B2F]">{cls.instructorName}</p>
                      <p className="text-sm text-[#556B2F]">${cls.pricePerPerson}/person</p>
                      <p className="text-xs text-gray-500">{formatDate(cls.startDate)}</p>
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

  if (activeView === 'bookings') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#3c4f21]">My Bookings</h2>
          {onRefreshBookings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshBookings}
              disabled={loadingBookings}
              className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingBookings ? 'animate-spin' : ''}`} />
              {loadingBookings ? 'Loading...' : 'Refresh'}
            </Button>
          )}
        </div>
        
        {loadingBookings ? (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading your bookings...</p>
            </CardContent>
          </Card>
        ) : myBookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven't booked any classes yet</p>
              <Button 
                onClick={() => onNavigate('classes')}
                className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
              >
                Browse Classes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {onManageClass ? (
                          <button
                            onClick={() => handleClassTitleClick(booking.classId)}
                            className="font-bold text-[#3c4f21] hover:text-[#556B2F] underline text-left"
                          >
                            {booking.className || 'Unknown Class'}
                          </button>
                        ) : (
                          <h3 className="font-bold text-[#3c4f21]">{booking.className || 'Unknown Class'}</h3>
                        )}
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusDisplayName(booking.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-[#556B2F]"><strong>Host:</strong> {booking.hostName}</p>
                          <p className="text-sm text-[#556B2F]"><strong>Students:</strong> {booking.studentCount}</p>
                          {booking.studentNames && booking.studentNames.length > 0 && (
                            <p className="text-sm text-[#556B2F]"><strong>Names:</strong> {booking.studentNames.join(', ')}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-[#556B2F]"><strong>Total Paid:</strong> ${booking.totalAmount}</p>
                          {booking.paymentStatus === 'completed' && (
                            <p className="text-xs text-green-600">✓ Payment Confirmed</p>
                          )}
                          <p className="text-sm text-[#556B2F]"><strong>Class Date:</strong> {formatDate(booking.startDate || booking.createdAt)}</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500">
                        <strong>Booked:</strong> {formatDate(booking.createdAt)}
                      </p>
                      
                      {booking.hostMessage && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <strong>Message from host:</strong> {booking.hostMessage}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 space-y-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message Host
                      </Button>
                      
                      {booking.status === 'confirmed' && (
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Confirmed
                        </div>
                      )}
                      
                      {booking.status === 'pending' && (
                        <div className="text-xs text-yellow-600 font-medium">
                          ⏳ Awaiting approval
                        </div>
                      )}
                      
                      {booking.status === 'denied' && (
                        <div className="text-xs text-red-600 font-medium">
                          ✗ Not approved
                        </div>
                      )}
                      
                      {booking.status === 'failed' && (
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ Booking failed
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'favorites') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#3c4f21]">Favorite Classes</h2>
        
        {favoriteClasses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No favorite classes yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Browse classes and click the heart icon to add them to your favorites
              </p>
              <Button 
                onClick={() => onNavigate('classes')}
                className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
              >
                Discover Classes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteClasses.map((cls) => (
              <Card key={cls.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-[#3c4f21] flex-1">{cls.title}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[#c54a2c] hover:text-[#c54a2c] ml-2"
                      onClick={() => onToggleFavorite?.(cls.id)}
                    >
                      <HeartIcon className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                  <p className="text-sm text-[#556B2F]">{cls.shortSummary}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm"><strong>Instructor:</strong> {cls.instructorName}</p>
                    <p className="text-sm"><strong>Date:</strong> {formatDate(cls.startDate)}</p>
                    <p className="text-sm"><strong>Price:</strong> ${cls.pricePerPerson}/person</p>
                    <p className="text-sm"><strong>Duration:</strong> {cls.numberOfDays} day{cls.numberOfDays > 1 ? 's' : ''}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-[#556B2F] hover:bg-[#3c4f21] text-white flex-1"
                    >
                      Book Now
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'messages' && onSendMessage) {
    return (
      <MessagingCenter 
        conversations={conversations}
        currentUserId={user.id}
        currentUserName={user.name}
        onSendMessage={onSendMessage}
      />
    );
  }

  return null;
}