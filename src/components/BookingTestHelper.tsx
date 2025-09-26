import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import type { Class } from '../App';

type BookingTestHelperProps = {
  classes: Class[];
};

export function BookingTestHelper({ classes }: BookingTestHelperProps) {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBookingEndpoint = async () => {
    setLoading(true);
    setTestResult('Testing booking endpoint...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setTestResult('❌ No authentication session found');
        setLoading(false);
        return;
      }

      setTestResult('✅ Auth session found, testing booking endpoint...');

      // Use the first available class
      const testClass = classes.length > 0 ? classes[0] : null;
      if (!testClass) {
        setTestResult('❌ No classes available to test booking with');
        setLoading(false);
        return;
      }

      const testBookingData = {
        classId: testClass.id,
        studentCount: 1,
        studentNames: ['Test Student'],
        totalAmount: testClass.pricePerPerson * 1.05, // Including 5% HERD fee
        subtotal: testClass.pricePerPerson,
        herdFee: testClass.pricePerPerson * 0.05,
        autoApprove: testClass.autoApproveBookings
      };

      setTestResult(`✅ Testing booking for class: "${testClass.title}" (ID: ${testClass.id})...`);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/booking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testBookingData)
      });

      const responseText = await response.text();
      
      if (response.ok) {
        setTestResult(`✅ Booking test successful!\nResponse: ${responseText}`);
      } else {
        setTestResult(`❌ Booking test failed (${response.status}):\n${responseText}`);
      }
    } catch (error) {
      setTestResult(`❌ Error testing booking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto m-4">
      <CardHeader>
        <CardTitle className="text-lg">Booking System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testBookingEndpoint}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Booking Endpoint'}
        </Button>
        
        {testResult && (
          <div className="bg-gray-100 rounded p-3 text-sm">
            <pre className="whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}