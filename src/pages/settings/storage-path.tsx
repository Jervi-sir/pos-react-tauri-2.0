import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

function StoragePath() {
  const [storagePath, setStoragePath] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStoragePath() {
      try {
        const path = await invoke('get_storage_path');
        setStoragePath(path as string);
      } catch (err: any) {
        setError(err);
        console.error('Error fetching storage path:', err);
      }
    }
    fetchStoragePath();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Storage Path</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{storagePath ? storagePath + '\\' : 'Loading...'}</p>
      </CardContent>
    </Card>
  );
}

export default StoragePath;