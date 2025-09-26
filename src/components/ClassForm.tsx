import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Camera, X, CalendarIcon, Clock, Upload, Trash2 } from 'lucide-react';
import { cn } from './ui/utils';
import type { Class } from '../App';

type ClassFormProps = {
  onSubmit: (classData: Omit<Class, 'id' | 'createdAt' | 'instructorId'>) => void;
  onCancel: () => void;
  user: User | null;
};

type User = {
  id: string;
  email: string;
  name: string;
  farmName?: string;
  bio?: string;
  profilePicture?: string;
  location?: string;
  stripeConnected: boolean;
  createdAt: string;
};

export function ClassForm({ onSubmit, onCancel, user }: ClassFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    shortSummary: '',
    startDate: '',
    startTime: '',
    numberOfDays: 1,
    hoursPerDay: '',
    pricePerPerson: 0,
    maxStudents: 1,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',

    },
    instructorName: user?.name || '',
    minimumAge: 0,
    instructorBio: user?.bio || '',
    advisories: '',
    houseRules: '',
    photos: [] as string[],
    autoApproveBookings: false
  });

  // Helper function to convert date string to Date object safely
  const stringToDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Compute selectedDate from formData.startDate to keep them in sync
  const selectedDate = stringToDate(formData.startDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.startDate) {
      alert('Please select a start date');
      return;
    }
    
    if (!formData.startTime) {
      alert('Please select a start time');
      return;
    }

    if (!formData.address.street || !formData.address.city || !formData.address.state || !formData.address.zipCode) {
      alert('Please fill in all address fields');
      return;
    }

    onSubmit({
      ...formData,
      hoursPerDay: formData.hoursPerDay ? Number(formData.hoursPerDay) : undefined,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof typeof formData.address, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Use local date formatting to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      setFormData(prev => ({
        ...prev,
        startDate: localDateString
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        startDate: ''
      }));
    }
    setIsCalendarOpen(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Select a date';
    // Parse date components directly to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Select time';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatTime(timeString);
        times.push({ value: timeString, display: displayTime });
      }
    }
    return times;
  };

  const handleTimeSelect = (timeValue: string) => {
    setFormData(prev => ({ ...prev, startTime: timeValue }));
    setIsTimePickerOpen(false);
  };

  // US States data
  const US_STATES = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' }
  ];

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if we've reached the 8 photo limit
    if (formData.photos.length >= 8) {
      alert('You can only upload up to 8 photos per class.');
      return;
    }

    // Process multiple files
    const newPhotos: string[] = [];
    const remainingSlots = 8 - formData.photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not a valid image file.`);
        continue;
      }

      // Validate file size (max 2MB to prevent storage issues)
      if (file.size > 2 * 1024 * 1024) {
        alert(`${file.name} is too large. Please use images smaller than 2MB to prevent storage issues. Consider compressing the image before uploading.`);
        continue;
      }

      try {
        // Convert to base64 for persistent storage
        const base64 = await fileToBase64(file);
        newPhotos.push(base64);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        alert(`Failed to process ${file.name}. Please try again.`);
      }
    }

    if (newPhotos.length > 0) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Show warning if some files were skipped due to limit
    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} photos could be added due to the 8 photo limit.`);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-[#ffffff] border-[#a8b892] shadow-lg">
        <CardHeader className="bg-[#556B2F] text-[#f8f9f6] rounded-t-lg">
          <CardTitle className="text-2xl">Create a Class</CardTitle>
          <p className="text-[#a8b892]">Share your homesteading knowledge with the community</p>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-[#2d3d1f]">Title</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                placeholder="e.g., Intro to Permaculture"
              />
            </div>

            {/* Short Summary */}
            <div>
              <Label htmlFor="shortSummary" className="text-[#2d3d1f]">Description (max 500 characters)</Label>
              <Textarea
                id="shortSummary"
                value={formData.shortSummary}
                onChange={(e) => handleChange('shortSummary', e.target.value)}
                maxLength={500}
                required
                className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                rows={4}
                placeholder="What will students learn in this class?"
              />
              <p className="text-sm text-[#3c4f21] mt-1">{formData.shortSummary.length}/500 characters</p>
            </div>

            {/* Date, Time and Duration Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-[#2d3d1f]">Start Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1 bg-[#ffffff] border-[#a8b892] hover:bg-[#f8f9f6] focus:border-[#556B2F] focus:ring-[#556B2F]",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{formatDate(formData.startDate)}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < minDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-[#2d3d1f]">Start Time</Label>
                <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1 bg-[#ffffff] border-[#a8b892] hover:bg-[#f8f9f6] focus:border-[#556B2F] focus:ring-[#556B2F]",
                        !formData.startTime && "text-muted-foreground"
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{formatTime(formData.startTime)}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="max-h-60 overflow-y-auto">
                      <div className="grid gap-1 p-2">
                        {generateTimeOptions().map((time) => (
                          <Button
                            key={time.value}
                            variant={formData.startTime === time.value ? "default" : "ghost"}
                            className={cn(
                              "justify-start font-normal",
                              formData.startTime === time.value 
                                ? "bg-[#556B2F] text-[#f8f9f6] hover:bg-[#3c4f21]" 
                                : "hover:bg-[#f8f9f6]"
                            )}
                            onClick={() => handleTimeSelect(time.value)}
                          >
                            {time.display}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="numberOfDays" className="text-[#2d3d1f]">Number of Days</Label>
                <Input
                  id="numberOfDays"
                  type="number"
                  min="1"
                  value={formData.numberOfDays}
                  onChange={(e) => handleChange('numberOfDays', Number(e.target.value))}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                />
              </div>

              <div>
                <Label htmlFor="hoursPerDay" className="text-[#2d3d1f]">Hours per Day (optional)</Label>
                <Input
                  id="hoursPerDay"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={formData.hoursPerDay}
                  onChange={(e) => handleChange('hoursPerDay', e.target.value)}
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  placeholder="e.g., 4"
                />
              </div>
            </div>

            {/* Price and Students Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pricePerPerson" className="text-[#2d3d1f]">Price per Person (USD)</Label>
                <Input
                  id="pricePerPerson"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerPerson}
                  onChange={(e) => handleChange('pricePerPerson', Number(e.target.value))}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="maxStudents" className="text-[#2d3d1f]">Max Number of Students</Label>
                <Input
                  id="maxStudents"
                  type="number"
                  min="1"
                  value={formData.maxStudents}
                  onChange={(e) => handleChange('maxStudents', Number(e.target.value))}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label className="text-[#2d3d1f] mb-3 block">Class Location</Label>
              <p className="text-sm text-[#556B2F] mb-3 italic">
                Only city and state will be shown publicly. Full address will be provided to confirmed bookings.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street" className="text-[#556B2F] text-sm">Street Address</Label>
                  <Input
                    id="street"
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="123 Farm Lane"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-[#556B2F] text-sm">City</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="City name"
                  />
                </div>
                <div>
                  <Label className="text-[#556B2F] text-sm">State</Label>
                  <Select
                    value={formData.address.state}
                    onValueChange={(value) => handleAddressChange('state', value)}
                  >
                    <SelectTrigger className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] [&>span]:truncate">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.code} - {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zipCode" className="text-[#556B2F] text-sm">ZIP/Postal Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="95123"
                  />
                </div>
              </div>
            </div>

            {/* Instructor Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instructorName" className="text-[#2d3d1f]">Instructor Name</Label>
                <Input
                  id="instructorName"
                  type="text"
                  value={formData.instructorName}
                  onChange={(e) => handleChange('instructorName', e.target.value)}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label htmlFor="minimumAge" className="text-[#2d3d1f]">Minimum Age</Label>
                <Input
                  id="minimumAge"
                  type="number"
                  min="0"
                  value={formData.minimumAge}
                  onChange={(e) => handleChange('minimumAge', Number(e.target.value))}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Instructor Bio */}
            <div>
              <Label htmlFor="instructorBio" className="text-[#2d3d1f]">Instructor Bio</Label>
              <Textarea
                id="instructorBio"
                value={formData.instructorBio}
                onChange={(e) => handleChange('instructorBio', e.target.value)}
                required
                className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                rows={4}
                placeholder="Your background and experience"
              />
            </div>

            {/* Advisories and House Rules Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="advisories" className="text-[#2d3d1f]">Advisories</Label>
                <Textarea
                  id="advisories"
                  value={formData.advisories}
                  onChange={(e) => handleChange('advisories', e.target.value)}
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                  rows={4}
                  placeholder="Safety concerns, requirements, etc."
                />
              </div>

              <div>
                <Label htmlFor="houseRules" className="text-[#2d3d1f]">House Rules</Label>
                <Textarea
                  id="houseRules"
                  value={formData.houseRules}
                  onChange={(e) => handleChange('houseRules', e.target.value)}
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                  rows={4}
                  placeholder="Guidelines for visiting your farm"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <Label className="text-[#2d3d1f]">Upload Photos (max 8)</Label>
              
              {/* Photo Grid */}
              {formData.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Class photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-[#a8b892]"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {formData.photos.length < 8 && (
                <div className="mt-3 border-2 border-dashed border-[#a8b892] rounded-lg p-6 text-center bg-[#ffffff] hover:border-[#556B2F] transition-colors">
                  <Camera className="w-12 h-12 text-[#556B2F] mx-auto mb-4" />
                  <p className="text-[#3c4f21] mb-2">
                    Add photos of your homestead and class area
                    {formData.photos.length > 0 && (
                      <span className="block text-sm text-[#556B2F] mt-1">
                        {formData.photos.length}/8 photos uploaded
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#556B2F] mb-3">
                    You can select multiple photos at once
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photos
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              )}

              {formData.photos.length >= 8 && (
                <div className="mt-3 p-4 bg-[#f8f9f6] border border-[#a8b892] rounded-lg text-center">
                  <p className="text-[#3c4f21]">Maximum of 8 photos reached</p>
                  <p className="text-sm text-[#556B2F]">Remove a photo to add more</p>
                </div>
              )}
            </div>

            {/* Booking Settings */}
            <div className="border-t border-[#a8b892] pt-6">
              <Label className="text-[#2d3d1f] mb-4 block">Booking Settings</Label>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="autoApproveBookings"
                  checked={formData.autoApproveBookings}
                  onCheckedChange={(checked) => handleChange('autoApproveBookings', checked)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor="autoApproveBookings" 
                    className="text-[#3c4f21] cursor-pointer leading-tight"
                  >
                    Enable automatic booking approval
                  </Label>
                  <div className="text-sm text-[#556B2F] space-y-1">
                    <p>
                      <strong>When enabled:</strong> Students can book instantly and receive immediate confirmation. Payment is processed automatically.
                    </p>
                    <p>
                      <strong>When disabled:</strong> Students submit booking requests that you must manually approve or decline. Payment is only processed after approval.
                    </p>
                    <p className="text-xs italic mt-2">
                      You can change this setting later for future bookings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#a8b892]">
              <Button
                type="submit"
                className="flex-1 bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
              >
                Create Class
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>


    </div>
  );
}