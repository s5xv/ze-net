import { useState, useRef } from 'react';
import { supabase } from '../services/supabase';

export default function ImageUpload({ bucket, path, onUpload, accept = 'image/*', label = 'Upload Image' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) { alert('Upload error: ' + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    onUpload(publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-lg">
        {uploading ? 'Uploading...' : label}
      </button>
    </div>
  );
}
