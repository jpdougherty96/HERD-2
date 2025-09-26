import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

export function ServerDiagnostics() {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test: string, status: 'pass' | 'fail' | 'info', message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Basic Supabase connection
    addResult('Supabase Config', 'info', `Project ID: ${projectId}`);
    addResult('Supabase Config', 'info', `Public Key: ${publicAnonKey.substring(0, 20)}...`);

    // Test 2: Auth session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        addResult('Auth Session', 'fail', `Auth error: ${error.message}`);
      } else if (session) {
        addResult('Auth Session', 'pass', `User authenticated: ${session.user.email}`);
        addResult('Auth Session', 'info', `Token valid until: ${new Date(session.expires_at! * 1000).toLocaleString()}`);
      } else {
        addResult('Auth Session', 'info', 'No active session (user not logged in)');
      }
    } catch (error) {
      addResult('Auth Session', 'fail', `Auth check failed: ${error.message}`);
    }

    // Test 3: Health check with different timeouts
    const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-568778ec/health`;
    
    for (const timeout of [3000, 10000, 30000]) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const startTime = Date.now();
        const response = await fetch(healthUrl, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          addResult(`Health Check (${timeout}ms)`, 'pass', `Server responded in ${duration}ms`, data);
          break; // Stop testing longer timeouts if this one passes
        } else {
          addResult(`Health Check (${timeout}ms)`, 'fail', `HTTP ${response.status}: ${response.statusText} (${duration}ms)`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          addResult(`Health Check (${timeout}ms)`, 'fail', `Timeout after ${timeout}ms`);
        } else {
          addResult(`Health Check (${timeout}ms)`, 'fail', `Network error: ${error.message}`);
        }
      }
    }

    // Test 4: Alternative endpoint test (try a different function route)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        addResult('Classes Endpoint', 'pass', `Classes endpoint works, returned ${data.length} classes`);
      } else {
        addResult('Classes Endpoint', 'fail', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      addResult('Classes Endpoint', 'fail', `Classes endpoint error: ${error.message}`);
    }

    // Test 5: Storage debug endpoint (development only)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/debug/storage`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        addResult('Storage Debug', 'pass', 
          `Storage state: ${data.storage.classes.count} classes, ${data.storage.users.count} users, ${data.storage.bookings.count} bookings`,
          data.storage);
      } else {
        addResult('Storage Debug', 'fail', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      addResult('Storage Debug', 'fail', `Storage debug error: ${error.message}`);
    }

    // Test 6: Raw Supabase function test
    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/`;
      const response = await fetch(baseUrl, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      addResult('Base Functions URL', response.ok ? 'pass' : 'fail', 
        `Base functions response: ${response.status} ${response.statusText}`);
    } catch (error) {
      addResult('Base Functions URL', 'fail', `Base URL error: ${error.message}`);
    }

    setTesting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle className="text-lg">Server Connectivity Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Diagnostics...' : 'Run Server Diagnostics'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.test}</span>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-gray-700 mb-1">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500">Show Details</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {results.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Click "Run Server Diagnostics" to test connectivity
          </div>
        )}
      </CardContent>
    </Card>
  );
}