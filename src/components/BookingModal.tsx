import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { X, Users, DollarSign, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import type { Class, User } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { StripeSetupPrompt } from './StripeSetupPrompt';
import { StripePaymentForm } from './StripePaymentForm';

type BookingModalProps = {
  classData: Class;
  user: User;
  onClose: () => void;
  onBookingSuccess: () => void;
  onNavigate?: (page: 'home' | 'classes' | 'create-class' | 'bulletin' | 'profile' | 'dashboard') => void;
};

export function BookingModal({ classData, user, onClose, onBookingSuccess, onNavigate }: BookingModalProps) {
  const [numberOfStudents, setNumberOfStudents] = useState(1);
  const [studentNames, setStudentNames] = useState<string[]>(['']);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);

  const herdFeePercentage = 5;
  const subtotal = classData.pricePerPerson * numberOfStudents;
  const herdFee = Math.round(subtotal * (herdFeePercentage / 100) * 100) / 100;
  const total = subtotal + herdFee;

  const handleStudentCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(count, classData.maxStudents));
    setNumberOfStudents(newCount);
    
    // Adjust student names array
    const newNames = [...studentNames];
    while (newNames.length < newCount) {
      newNames.push('');
    }
    while (newNames.length > newCount) {
      newNames.pop();
    }
    setStudentNames(newNames);
  };

  const handleStudentNameChange = (index: number, name: string) => {
    const newNames = [...studentNames];
    newNames[index] = name;
    setStudentNames(newNames);
  };

  const isFormValid = () => {
    return (
      numberOfStudents > 0 &&
      numberOfStudents <= classData.maxStudents &&
      studentNames.every(name => name.trim().length > 0) &&
      liabilityAccepted
    );
  };

  const handleSubmitBooking = async () => {
    if (!isFormValid()) return;

    // If user hasn't onboarded with Stripe, show payment form
    if (!user.stripeConnected) {
      setShowPaymentForm(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user's session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      console.log('🎯 Starting booking process for class:', classData.id, '-', classData.title);

      // First, verify the class exists on the server
      console.log('🔍 Checking if class exists on server...');
      const classCheckResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (classCheckResponse.ok) {
        const serverClasses = await classCheckResponse.json();
        const classExists = serverClasses.some((c: any) => c.id === classData.id);
        
        if (!classExists) {
          console.log('⚠️ Class not found on server, attempting to sync...');
          
          // Check if this is a mock class that needs instructor reassignment
          const isOriginalMockClass = classData.id === 'class1' || classData.id === 'class2';
          let classToSync = classData;
          
          if (isOriginalMockClass) {
            // For original mock classes, we need to get current user info to assign as instructor
            const { data: { user: currentUser } } = await supabase.auth.getUser(session.access_token);
            if (currentUser) {
              console.log('🔄 Assigning current user as instructor for mock class');
              classToSync = {
                ...classData,
                instructorId: currentUser.id,
                instructorName: user.name || currentUser.email?.split('@')[0] || 'User'
              };
            }
          }
          
          // Try to sync this specific class to the server
          const syncResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(classToSync)
          });

          if (syncResponse.ok) {
            console.log('✅ Successfully synced class to server');
          } else {
            const syncError = await syncResponse.text();
            console.error('❌ Failed to sync class to server:', syncError);
            throw new Error('This class is not available for booking. Please try refreshing the page or contact support.');
          }
        } else {
          console.log('✅ Class found on server');
        }
      } else {
        console.warn('⚠️ Could not verify class existence on server');
      }

      const bookingData = {
        classId: classData.id,
        studentCount: numberOfStudents,
        studentNames: studentNames.map(name => name.trim()),
        totalAmount: total,
        subtotal: subtotal,
        herdFee: herdFee,
        autoApprove: classData.autoApproveBookings
      };

      console.log('📤 Sending booking request...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/booking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (classData.autoApproveBookings) {
          alert('Booking confirmed! You will receive a confirmation email with class details and location.');
        } else {
          alert('Booking request submitted! The host will review your request and you\'ll receive an email with their decision.');
        }
        
        onBookingSuccess();
        onClose();
      } else {
        // Handle both JSON and text error responses
        let errorMessage = 'Failed to process booking';
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
        
        // Check if this is a Stripe setup error
        if (errorMessage.includes('payment setup') || errorMessage.includes('Stripe')) {
          // Try to extract host name from error message
          const hostNameMatch = errorMessage.match(/host.*?\(([^)]+)\)/);
          if (hostNameMatch) {
            setHostName(hostNameMatch[1]);
          }
          setShowStripeSetup(true);
          return; // Don't throw error, show setup prompt instead
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Booking error:', error);
      setError(error.message || 'An error occurred while processing your booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (paymentData: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    nameOnCard: string;
    email: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Get the user's session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      console.log('🎯 Starting booking process with direct payment for class:', classData.id, '-', classData.title);

      // First, verify the class exists on the server (same as before)
      console.log('🔍 Checking if class exists on server...');
      const classCheckResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (classCheckResponse.ok) {
        const serverClasses = await classCheckResponse.json();
        const classExists = serverClasses.some((c: any) => c.id === classData.id);
        
        if (!classExists) {
          console.log('⚠️ Class not found on server, attempting to sync...');
          
          // Check if this is a mock class that needs instructor reassignment
          const isOriginalMockClass = classData.id === 'class1' || classData.id === 'class2';
          let classToSync = classData;
          
          if (isOriginalMockClass) {
            // For original mock classes, we need to get current user info to assign as instructor
            const { data: { user: currentUser } } = await supabase.auth.getUser(session.access_token);
            if (currentUser) {
              console.log('🔄 Assigning current user as instructor for mock class');
              classToSync = {
                ...classData,
                instructorId: currentUser.id,
                instructorName: user.name || currentUser.email?.split('@')[0] || 'User'
              };
            }
          }
          
          // Try to sync this specific class to the server
          const syncResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(classToSync)
          });

          if (syncResponse.ok) {
            console.log('✅ Successfully synced class to server');
          } else {
            const syncError = await syncResponse.text();
            console.error('❌ Failed to sync class to server:', syncError);
            throw new Error('This class is not available for booking. Please try refreshing the page or contact support.');
          }
        } else {
          console.log('✅ Class found on server');
        }
      } else {
        console.warn('⚠️ Could not verify class existence on server');
      }

      const bookingData = {
        classId: classData.id,
        studentCount: numberOfStudents,
        studentNames: studentNames.map(name => name.trim()),
        totalAmount: total,
        subtotal: subtotal,
        herdFee: herdFee,
        autoApprove: classData.autoApproveBookings,
        paymentMethod: 'direct_card', // Indicate this is a direct card payment
        paymentData: paymentData // Include payment details for processing
      };

      console.log('📤 Sending booking request with direct payment...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/booking-direct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (classData.autoApproveBookings) {
          alert('Booking confirmed and payment processed! You will receive a confirmation email with class details and location.');
        } else {
          alert('Booking request submitted and payment processed! The host will review your request and you\'ll receive an email with their decision. If approved, you\'ll receive full class details.');
        }
        
        onBookingSuccess();
        onClose();
      } else {
        // Handle both JSON and text error responses
        let errorMessage = 'Failed to process booking and payment';
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
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Booking and payment error:', error);
      setError(error.message || 'An error occurred while processing your booking and payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <>
      {showStripeSetup && (
        <StripeSetupPrompt
          onClose={() => {
            setShowStripeSetup(false);
            onClose();
          }}
          onGoToProfile={() => {
            setShowStripeSetup(false);
            onClose();
            onNavigate?.('profile');
          }}
          hostName={hostName || undefined}
        />
      )}

      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <StripePaymentForm
              amount={total}
              onPaymentSubmit={handlePaymentSubmit}
              loading={loading}
              onCancel={() => {
                setShowPaymentForm(false);
                setError(null);
              }}
              user={{
                name: user.name,
                email: user.email
              }}
            />
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <p className="text-red-800 text-sm font-medium">Payment Error</p>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <p className="text-red-600 text-xs mt-2">
                  Your payment was not processed. Please try again or contact support if the issue persists.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!showStripeSetup && !showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="bg-[#ffffff] border-[#a8b892] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-2">Book: {classData.title}</CardTitle>
              <p className="text-[#a8b892]">with {classData.instructorName}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-[#f8f9f6] hover:bg-[#6B7F3F]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Class Summary */}
          <div className="bg-[#f8f9f6] rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-[#2d3d1f] mb-3">Class Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#556B2F]" />
                <span>{formatDate(classData.startDate)}</span>
              </div>
              {classData.startTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#556B2F]" />
                  <span>{formatTime(classData.startTime)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#556B2F]" />
                <span>${classData.pricePerPerson} per person</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#556B2F]" />
                <span>{classData.address.city}, {classData.address.state}</span>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[#2d3d1f]">Student Information</h4>
            
            <div>
              <Label htmlFor="studentCount">Number of Students</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStudentCountChange(numberOfStudents - 1)}
                  disabled={numberOfStudents <= 1}
                  className="w-8 h-8 p-0"
                >
                  -
                </Button>
                <Input
                  id="studentCount"
                  type="number"
                  min="1"
                  max={classData.maxStudents}
                  value={numberOfStudents}
                  onChange={(e) => handleStudentCountChange(parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStudentCountChange(numberOfStudents + 1)}
                  disabled={numberOfStudents >= classData.maxStudents}
                  className="w-8 h-8 p-0"
                >
                  +
                </Button>
                <span className="text-sm text-[#556B2F] ml-2">
                  (Max {classData.maxStudents} students)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Student Names</Label>
              {studentNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#556B2F] flex-shrink-0" />
                  <Input
                    placeholder={`Student ${index + 1} name`}
                    value={name}
                    onChange={(e) => handleStudentNameChange(index, e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#2d3d1f]">Cost Breakdown</h4>
            <div className="bg-[#f8f9f6] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Class fee ({numberOfStudents} × ${classData.pricePerPerson})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>HERD service fee ({herdFeePercentage}%)</span>
                <span>${herdFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-[#a8b892] pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Liability Waiver */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#2d3d1f]">Liability Agreement</h4>
            <div className="bg-[#fff8e1] border border-[#f9cc33] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#f39c12] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="liability"
                      checked={liabilityAccepted}
                      onCheckedChange={(checked) => setLiabilityAccepted(checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="liability" className="text-sm cursor-pointer">
                      By checking this box, I acknowledge that I understand the risks involved in this homesteading class and release both HERD and the class host from any liability for injuries or damages that may occur during the class activities. I participate at my own risk and agree to follow all safety instructions provided by the host.
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Booking Button */}
          <div className="pt-4 border-t border-[#a8b892]">
            <Button
              onClick={handleSubmitBooking}
              disabled={!isFormValid() || loading}
              className="w-full bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : user.stripeConnected ? (
                classData.autoApproveBookings ? (
                  `Book Now - ${total.toFixed(2)} (via Stripe)`
                ) : (
                  `Request Booking - ${total.toFixed(2)} (via Stripe)`
                )
              ) : (
                `Continue to Stripe Payment - ${total.toFixed(2)}`
              )}
            </Button>
            
            <p className="text-xs text-[#556B2F] mt-2 text-center">
              {user.stripeConnected ? (
                classData.autoApproveBookings 
                  ? 'Your payment will be processed immediately and you\'ll receive confirmation details.'
                  : 'No payment will be charged until the host approves your booking request. Payment processing via Stripe.'
              ) : (
                'You\'ll enter your payment details on the next screen.'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
      )}
    </>
  );
}