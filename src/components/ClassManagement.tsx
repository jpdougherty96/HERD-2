import React, { useState, useEffect } from 'react';
import { User, Class } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Mail,
  Phone,
  Edit,
  Trash2,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface Booking {
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

interface ClassManagementProps {
  classData: Class;
  user: User;
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'profile' | 'dashboard') => void;
  onDeleteClass: (classId: string) => Promise<void>;
}

export function ClassManagement({ classData, user, onNavigate, onDeleteClass }: ClassManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [denialMessage, setDenialMessage] = useState('');

  useEffect(() => {
    fetchClassBookings();
  }, [classData.id]);

  const fetchClassBookings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // Add timeout and abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class/${classData.id}/bookings`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      } else {
        console.warn('Failed to fetch class bookings:', response.status);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Class bookings request timed out');
      } else {
        console.error('Error fetching class bookings:', error);
      }
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'denied': return <XCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.subtotal, 0);
  const totalStudents = confirmedBookings.reduce((sum, b) => sum + b.studentCount, 0);

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('dashboard')}
            className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          {user.isAdmin && (
            <Badge className="bg-orange-500 text-white">
              Admin View
            </Badge>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl text-[#3c4f21] mb-2">Class Management</h1>
        <p className="text-[#556B2F]">Manage bookings, view details, and edit your class</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#3c4f21] text-xl">{classData.title}</CardTitle>
                  <p className="text-[#556B2F] mt-2">{classData.shortSummary}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                    onClick={() => {
                      alert('Class editing functionality coming soon! For now, you can create a new class or contact support for edits.');
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {/* Only show delete button to admins and class hosts */}
                  {(user.isAdmin || classData.instructorId === user.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      onClick={() => onDeleteClass(classData.id)}
                      title={user.isAdmin ? "Delete class (Admin privileges)" : "Delete class (requires no active bookings)"}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                      {user.isAdmin && (
                        <Badge className="ml-2 bg-orange-500 text-white text-xs px-1 py-0">
                          ADMIN
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Class Photo */}
              <div className="mb-6">
                <div className="relative w-full h-48 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                  {classData.photos && classData.photos.length > 0 ? (
                    <ImageWithFallback
                      src={classData.photos[0]}
                      alt={classData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f8f9f6] to-[#e8e9e6] flex items-center justify-center">
                      <div className="text-center text-[#556B2F]">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-70">No photo uploaded</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-[#556B2F] text-[#f8f9f6]">
                      ${classData.pricePerPerson}/person
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Date & Time</p>
                      <p className="font-medium text-[#3c4f21]">
                        {formatDate(classData.startDate)}
                        {classData.startTime && ` at ${formatTime(classData.startTime)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Duration</p>
                      <p className="font-medium text-[#3c4f21]">
                        {classData.numberOfDays} day{classData.numberOfDays > 1 ? 's' : ''}
                        {classData.hoursPerDay && ` (${classData.hoursPerDay} hours/day)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Capacity</p>
                      <p className="font-medium text-[#3c4f21]">
                        {totalStudents} / {classData.maxStudents} students
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Location</p>
                      <p className="font-medium text-[#3c4f21]">
                        {classData.address.street}
                      </p>
                      <p className="text-sm text-[#556B2F]">
                        {classData.address.city}, {classData.address.state} {classData.address.zipCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Booking Settings</p>
                      <p className="font-medium text-[#3c4f21]">
                        {classData.autoApproveBookings ? 'Auto-approve enabled' : 'Manual approval required'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[#556B2F]" />
                    <div>
                      <p className="text-sm text-[#556B2F]">Age Requirement</p>
                      <p className="font-medium text-[#3c4f21]">
                        {classData.minimumAge}+ years old
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {(classData.instructorBio || classData.advisories || classData.houseRules) && (
                <div className="mt-6 space-y-4">
                  {classData.instructorBio && (
                    <div>
                      <h4 className="font-medium text-[#3c4f21] mb-2">About the Instructor</h4>
                      <p className="text-sm text-[#556B2F] leading-relaxed">{classData.instructorBio}</p>
                    </div>
                  )}
                  
                  {classData.advisories && (
                    <div>
                      <h4 className="font-medium text-[#3c4f21] mb-2">Important Advisories</h4>
                      <p className="text-sm text-[#556B2F] leading-relaxed">{classData.advisories}</p>
                    </div>
                  )}
                  
                  {classData.houseRules && (
                    <div>
                      <h4 className="font-medium text-[#3c4f21] mb-2">House Rules</h4>
                      <p className="text-sm text-[#556B2F] leading-relaxed">{classData.houseRules}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#556B2F]">Total Bookings</p>
                    <p className="text-2xl font-bold text-[#3c4f21]">{bookings.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-[#556B2F]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#556B2F]">Revenue</p>
                    <p className="text-2xl font-bold text-[#3c4f21]">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-[#556B2F]" />
                </div>
              </CardContent>
            </Card>

            {pendingBookings.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#556B2F]">Pending</p>
                      <p className="text-2xl font-bold text-[#c54a2c]">{pendingBookings.length}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-[#c54a2c]" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3c4f21]">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                onClick={() => {
                  alert('Messaging functionality coming soon! You can contact students via email for now.');
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Students
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                onClick={() => {
                  const emailBody = `Subject: Class Update - ${classData.title}

Dear Students,

I hope this message finds you well. I wanted to reach out regarding our upcoming class "${classData.title}" scheduled for ${formatDate(classData.startDate)}.

[Your message here]

Best regards,
${user.name}

Class Details:
- Date: ${formatDate(classData.startDate)}${classData.startTime ? ` at ${formatTime(classData.startTime)}` : ''}
- Location: ${classData.address.street}, ${classData.address.city}, ${classData.address.state}
- Duration: ${classData.numberOfDays} day${classData.numberOfDays > 1 ? 's' : ''}`;

                  const studentEmails = confirmedBookings.map(b => b.userEmail).join(';');
                  window.location.href = `mailto:${studentEmails}?subject=Class Update - ${encodeURIComponent(classData.title)}&body=${encodeURIComponent(emailBody)}`;
                }}
                disabled={confirmedBookings.length === 0}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email All Students
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#3c4f21]">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#556B2F] mx-auto mb-4"></div>
                <p className="text-gray-500">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-[#a8b892] rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-[#3c4f21]">{booking.userName}</h4>
                          <Badge className={getStatusColor(booking.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(booking.status)}
                              {booking.status}
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#556B2F]">
                          <p><strong>Email:</strong> {booking.userEmail}</p>
                          <p><strong>Students:</strong> {booking.studentCount}</p>
                          <p><strong>Names:</strong> {booking.studentNames.join(', ')}</p>
                          <p><strong>Your earnings:</strong> ${booking.subtotal.toFixed(2)}</p>
                          <p><strong>Booked:</strong> {formatDate(booking.createdAt)}</p>
                          <p><strong>Payment:</strong> {booking.paymentStatus}</p>
                        </div>
                        
                        {booking.status === 'denied' && booking.hostMessage && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <p className="text-sm text-red-800"><strong>Denial reason:</strong> {booking.hostMessage}</p>
                          </div>
                        )}
                      </div>
                      
                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              // Handle booking approval
                              alert('Booking approval functionality will be integrated with the existing system');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
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