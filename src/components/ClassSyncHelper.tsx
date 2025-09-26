import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { Class } from '../App';

type ClassSyncHelperProps = {
  classes: Class[];
  onClassesUpdated: (classes: Class[]) => void;
};

export function ClassSyncHelper({ classes, onClassesUpdated }: ClassSyncHelperProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>('');

  const syncClassesToServer = async () => {
    setSyncing(true);
    setSyncResult('Syncing classes to server...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSyncResult('❌ No authentication session found');
        setSyncing(false);
        return;
      }

      // Get current classes from server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      let serverClasses: Class[] = [];
      if (response.ok) {
        serverClasses = await response.json();
        setSyncResult(`✅ Found ${serverClasses.length} classes on server\n`);
      } else {
        setSyncResult(`⚠️ Could not fetch server classes: ${response.status}\n`);
      }

      // Find classes to sync
      const serverClassIds = serverClasses.map(c => c.id);
      const classesToSync = classes.filter(cls => !serverClassIds.includes(cls.id));

      if (classesToSync.length === 0) {
        setSyncResult(prev => prev + '✅ All classes already synced!');
        setSyncing(false);
        return;
      }

      setSyncResult(prev => prev + `🔄 Syncing ${classesToSync.length} classes...\n`);

      // Upload each class
      let synced = 0;
      for (const classToSync of classesToSync) {
        try {
          const syncResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(classToSync)
          });

          if (syncResponse.ok) {
            const savedClass = await syncResponse.json();
            setSyncResult(prev => prev + `✅ Synced: ${classToSync.title}\n`);
            synced++;
          } else {
            const error = await syncResponse.text();
            setSyncResult(prev => prev + `❌ Failed: ${classToSync.title} - ${error}\n`);
          }
        } catch (error) {
          setSyncResult(prev => prev + `❌ Error: ${classToSync.title} - ${error.message}\n`);
        }
      }

      setSyncResult(prev => prev + `\n🎉 Sync complete: ${synced}/${classesToSync.length} classes synced`);

      // Reload classes from server
      const finalResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (finalResponse.ok) {
        const updatedServerClasses = await finalResponse.json();
        onClassesUpdated(updatedServerClasses);
        setSyncResult(prev => prev + `\n✅ Refreshed local classes: ${updatedServerClasses.length} total`);
      }

    } catch (error) {
      setSyncResult(`❌ Sync error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const clearResults = () => {
    setSyncResult('');
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Class Sync Helper
          <Badge variant="secondary">{classes.length} local classes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={syncClassesToServer}
            disabled={syncing}
            className="flex-1"
          >
            {syncing ? 'Syncing...' : 'Sync Classes to Server'}
          </Button>
          {syncResult && (
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          )}
        </div>
        
        {syncResult && (
          <div className="bg-gray-100 rounded p-3 text-sm max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{syncResult}</pre>
          </div>
        )}

        {classes.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Local Classes:</h4>
            <div className="space-y-1 text-sm">
              {classes.map(cls => (
                <div key={cls.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{cls.title}</span>
                  <span className="text-gray-500 text-xs">ID: {cls.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}