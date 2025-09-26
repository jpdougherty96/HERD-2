import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Clock, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BookingModal } from './BookingModal';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { Class, User } from '../App';

type ClassDetailProps = {
  classData: Class;
  user: User | null;
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'dashboard' | 'profile') => void;
  onRequireAuth: () => void;
};

export function ClassDetail({ classData, user, onNavigate, onRequireAuth }: ClassDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingClass, setBookingClass] = useState<Class | null>(null);
  const [availableSpots, setAvailableSpots] = useState<number | null>(null);
  const [loadingSpots, setLoadingSpots] = useState(true);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const formatAddress = (address: any) => {
    if (typeof address === 'string') {
      return address;
    }
    return `${address.city}, ${address.state}`;
  };

  const handleBookClass = (classData: Class) => {
    if (!user) {
      onRequireAuth();
    } else {
      setBookingClass(classData);
    }
  };

  const handleBookingSuccess = () => {
    setBookingClass(null);
  };

  const nextImage = () => {
    if (classData.photos && classData.photos.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === classData.photos!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (classData.photos && classData.photos.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? classData.photos!.length - 1 : prev - 1
      );
    }
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const hasMultipleImages = classData.photos && classData.photos.length > 1;

  // Fetch available spots when component mounts
  useEffect(() => {
    const fetchAvailableSpots = async () => {
      try {
        setLoadingSpots(true);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Get current session for authenticated requests
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || publicAnonKey;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class/${classData.id}/available-spots`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const spotsData = await response.json();
          setAvailableSpots(spotsData.availableSpots);
        } else {
          console.warn('Failed to fetch bookings for available spots calculation:', response.status);
          setAvailableSpots(null);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Booking fetch request timed out');
        } else {
          console.error('Error fetching available spots:', error);
        }
        setAvailableSpots(null);
      } finally {
        setLoadingSpots(false);
      }
    };

    fetchAvailableSpots();
  }, [classData.id, classData.maxStudents]);

  return (
    <div className="min-h-screen bg-[#f8f9f6]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('classes')}
            className="text-[#556B2F] hover:bg-[#e8e9e6] hover:text-[#3c4f21]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>
        </div>

        {/* Class Images Section */}
        <div className="mb-8">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            {classData.photos && classData.photos.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative w-full h-64 md:h-96">
                  <ImageWithFallback
                    src={classData.photos[currentImageIndex]}
                    alt={`${classData.title} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}

                  {/* Image Counter */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {classData.photos.length}
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-[#556B2F] text-[#f8f9f6] hover:bg-[#556B2F] text-lg px-3 py-1">
                      ${classData.pricePerPerson}
                    </Badge>
                  </div>
                </div>

                {/* Thumbnail Navigation */}
                {hasMultipleImages && (
                  <div className="flex gap-2 p-4 bg-white/90 overflow-x-auto">
                    {classData.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => selectImage(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                          index === currentImageIndex 
                            ? 'border-[#556B2F] shadow-md' 
                            : 'border-gray-300 hover:border-[#a8b892]'
                        }`}
                      >
                        <ImageWithFallback
                          src={photo}
                          alt={`${classData.title} - Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-64 md:h-96 bg-gradient-to-br from-[#f8f9f6] to-[#e8e9e6] flex items-center justify-center">
                <div className="text-center text-[#556B2F]">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg opacity-70">No photos available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Class Details */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Title and Instructor */}
            <div>
              <h1 className="text-3xl font-bold text-[#2d3d1f] mb-2">{classData.title}</h1>
              <p className="text-lg text-[#556B2F]">with {classData.instructorName}</p>
            </div>

            {/* About This Class */}
            <div>
              <h2 className="text-xl font-semibold text-[#2d3d1f] mb-3">About This Class</h2>
              <p className="text-[#3c4f21] leading-relaxed">{classData.shortSummary}</p>
            </div>

            {/* About the Instructor */}
            <div>
              <h2 className="text-xl font-semibold text-[#2d3d1f] mb-3">About the Instructor</h2>
              <p className="text-[#3c4f21] leading-relaxed">{classData.instructorBio}</p>
            </div>

            {/* Important Information */}
            {classData.advisories && (
              <div>
                <h2 className="text-xl font-semibold text-[#2d3d1f] mb-3">Important Information</h2>
                <p className="text-[#3c4f21] leading-relaxed">{classData.advisories}</p>
              </div>
            )}

            {/* House Rules */}
            {classData.houseRules && (
              <div>
                <h2 className="text-xl font-semibold text-[#2d3d1f] mb-3">House Rules</h2>
                <p className="text-[#3c4f21] leading-relaxed">{classData.houseRules}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Class Details Card */}
            <Card className="bg-[#ffffff] border-[#a8b892] sticky top-6">
              <CardHeader>
                <CardTitle className="text-[#2d3d1f]">Class Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#556B2F] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#2d3d1f]">{formatDate(classData.startDate)}</div>
                      {classData.startTime && (
                        <div className="text-sm text-[#556B2F]">{formatTime(classData.startTime)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#556B2F] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#2d3d1f]">
                        {classData.numberOfDays} day{classData.numberOfDays > 1 ? 's' : ''}
                      </div>
                      {classData.hoursPerDay && (
                        <div className="text-sm text-[#556B2F]">{classData.hoursPerDay} hours/day</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-[#556B2F] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#2d3d1f]">${classData.pricePerPerson} per person</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#556B2F] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#2d3d1f]">Max {classData.maxStudents} students</div>
                      {loadingSpots ? (
                        <div className="text-sm text-[#556B2F] animate-pulse">Loading spots...</div>
                      ) : availableSpots !== null ? (
                        <div className={`text-sm ${availableSpots > 0 ? 'text-[#556B2F]' : 'text-[#c54a2c]'}`}>
                          {availableSpots > 0 ? (
                            `${availableSpots} spot${availableSpots !== 1 ? 's' : ''} available`
                          ) : (
                            'Fully booked'
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-[#888]">Spots info unavailable</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#556B2F] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-[#2d3d1f]">{formatAddress(classData.address)}</div>
                      <div className="text-xs text-[#556B2F] mt-1 italic">
                        Full address provided upon booking confirmation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="pt-4 border-t border-[#a8b892]">
                  <h4 className="font-semibold text-[#2d3d1f] mb-2">Requirements</h4>
                  <p className="text-sm text-[#3c4f21]">
                    <span className="font-medium">Minimum Age:</span> {classData.minimumAge} years
                  </p>
                </div>

                {/* Book Button */}
                <div className="pt-4 border-t border-[#a8b892]">
                  <Button 
                    onClick={() => handleBookClass(classData)}
                    className="w-full bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6] disabled:bg-gray-400 disabled:cursor-not-allowed"
                    size="lg"
                    disabled={availableSpots === 0}
                  >
                    {availableSpots === 0 ? 'Fully Booked' : user ? (classData.autoApproveBookings ? 'Book This Class' : 'Request Booking') : 'Sign In to Book'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingClass && user && (
        <BookingModal 
          classData={bookingClass}
          user={user}
          onClose={() => setBookingClass(null)}
          onBookingSuccess={handleBookingSuccess}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}