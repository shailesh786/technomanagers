import { useState } from 'react';
import { CloudUpload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export interface ImageUploadHandle {
  selectedFile: File | null;
  urlValue: string;
}

interface Props {
  bucketName: string;
  inputId: string;
  /** Existing image URL (for edit mode) */
  initialUrl?: string;
  /** Called when user picks a file */
  onFileChange: (file: File | null) => void;
  /** Called when user types/clears a URL OR removes the existing image */
  onUrlChange: (url: string) => void;
  /** The current url value tracked by parent */
  urlValue: string;
  /** The currently selected File tracked by parent */
  selectedFile: File | null;
}

/**
 * Reusable image upload component used by Course and Event admin forms.
 * - Shared bucket prop allows reuse across different storage buckets.
 * - Parent owns the File + URL state for easy submission.
 */
export function ImageUpload({
  inputId,
  onFileChange,
  onUrlChange,
  urlValue,
  selectedFile,
}: Props) {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileSelect = (file: File) => {
    setFileError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Unsupported format. Please upload a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError('File is too large. Maximum size is 2MB.');
      return;
    }
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(file));
    setShowUrlInput(false);
    onFileChange(file);
    onUrlChange('');
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setFileError(null);
    onFileChange(null);
    onUrlChange('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const currentPreview = filePreview || (urlValue && !selectedFile ? urlValue : null);

  return (
    <div>
      {currentPreview && !fileError ? (
        <div className="relative border rounded-xl overflow-hidden" style={{ maxWidth: 300 }}>
          <img src={currentPreview} alt="Preview" className="w-full h-[180px] object-cover" />
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove image"
            className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {selectedFile && (
            <div className="px-3 py-1.5 bg-muted text-xs text-muted-foreground">
              {selectedFile.name} · {formatSize(selectedFile.size)}
            </div>
          )}
          {!selectedFile && (
            <button
              type="button"
              onClick={() => document.getElementById(inputId)?.click()}
              className="w-full px-3 py-1.5 bg-muted text-xs text-primary hover:underline text-center"
            >
              Change image
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById(inputId)?.click()}
          className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          style={{ width: 300, height: 180 }}
        >
          <CloudUpload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click to upload or drag & drop</span>
          <span className="text-xs text-muted-foreground/70">PNG, JPG up to 2MB</span>
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = '';
        }}
      />
      {fileError && <p className="text-sm text-destructive mt-1">{fileError}</p>}

      <Collapsible open={showUrlInput} onOpenChange={setShowUrlInput}>
        <CollapsibleTrigger asChild>
          <button type="button" className="text-xs text-primary hover:underline mt-2">
            Or paste an image URL instead
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Input
            className="mt-2"
            value={urlValue}
            onChange={(e) => {
              onUrlChange(e.target.value);
              if (e.target.value && selectedFile) onFileChange(null);
            }}
            placeholder="https://..."
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export async function uploadImageToBucket(
  bucketName: string,
  file: File,
  ownerId?: string,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const id = ownerId || crypto.randomUUID();
  const path = `${id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}
