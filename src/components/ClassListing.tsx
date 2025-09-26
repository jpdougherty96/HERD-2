import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Calendar, MapPin, Users, DollarSign, Clock, Plus, Search, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BookingModal } from './BookingModal';
import type { Class, User } from '../App';

type ClassListingProps = {
  classes: Class[];
  onNavigate: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'dashboard' | 'profile') => void;
  user: User | null;
  onRequireAuth: () => void;
  onSelectClass: (classData: Class) => void;
};

export function ClassListing({ classes, onNavigate, user, onRequireAuth, onSelectClass }: ClassListingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookingClass, setBookingClass] = useState<Class | null>(null);

  const filteredClasses = classes.filter(cls =>
    cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.shortSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.instructorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      // For legacy string addresses, try to extract city/state or return as-is
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
    // Refresh the page or update local state as needed
    // For now, we'll just close the modal
    setBookingClass(null);
  };

  const ClassCard = ({ cls }: { cls: Class }) => (
    <Card className="bg-[#ffffff] border-[#a8b892] shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
          onClick={() => onSelectClass(cls)}>
      {/* Class Photo */}
      <div className="relative w-full h-48 md:h-52 bg-gray-100">
        {cls.photos && cls.photos.length > 0 ? (
          <ImageWithFallback
            src={cls.photos[0]}
            alt={cls.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#f8f9f6] to-[#e8e9e6] flex items-center justify-center">
            <div className="text-center text-[#556B2F]">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-70">No photo available</p>
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className="bg-[#556B2F] text-[#f8f9f6] hover:bg-[#556B2F]">
            ${cls.pricePerPerson}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-[#2d3d1f] leading-tight">{cls.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-[#3c4f21] text-sm line-clamp-2">{cls.shortSummary}</p>
        
        <div className="grid grid-cols-2 gap-3 text-sm text-[#3c4f21]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#556B2F] flex-shrink-0" />
            <span className="truncate">{formatDate(cls.startDate)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#556B2F] flex-shrink-0" />
            <span className="truncate">{cls.startTime ? formatTime(cls.startTime) : `${cls.numberOfDays} day${cls.numberOfDays > 1 ? 's' : ''}`}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#556B2F] flex-shrink-0" />
            <span className="truncate">Max {cls.maxStudents} students</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#556B2F] flex-shrink-0" />
            <span className="truncate">{formatAddress(cls.address)}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-[#a8b892]">
          <p className="text-sm text-[#3c4f21] truncate">
            <span className="font-medium">Instructor:</span> {cls.instructorName}
          </p>
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2d3d1f] mb-2">Homesteading Classes</h1>
            <p className="text-[#3c4f21]">Discover hands-on learning opportunities in your community</p>
          </div>
          
          <Button 
            onClick={() => user ? onNavigate('create-class') : onRequireAuth()}
            className="bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {user ? 'Create Class' : 'Sign In to Teach'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#556B2F] w-4 h-4" />
          <Input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
          />
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <Card className="bg-[#ffffff] border-[#a8b892] p-12 text-center">
          <div className="space-y-4">
            <h3 className="text-xl text-[#2d3d1f]">
              {classes.length === 0 ? 'No classes available yet' : 'No classes match your search'}
            </h3>
            <p className="text-[#3c4f21]">
              {classes.length === 0 
                ? 'Be the first to create a class and share your homesteading knowledge!'
                : 'Try adjusting your search terms or browse all available classes.'
              }
            </p>
            <Button 
              onClick={() => user ? onNavigate('create-class') : onRequireAuth()}
              className="bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
            >
              <Plus className="w-4 h-4 mr-2" />
              {user ? 'Create the First Class' : 'Sign In to Create Class'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}

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