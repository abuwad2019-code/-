import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileType, X, CheckCircle2, Image as ImageIcon, FileText, FileCode, Film, Music } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploaderProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  selectedFiles: File[];
  onRemove?: (index: number) => void;
}

interface FileItemProps {
  file: File;
  onRemove?: () => void;
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('video/')) return <Film size={24} className="text-slate-500" />;
  if (file.type.startsWith('audio/')) return <Music size={24} className="text-slate-500" />;
  if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) return <FileText size={24} className="text-slate-500" />;
  if (file.name.match(/\.(js|ts|tsx|jsx|json|html|css|py|java|cpp|xml)$/)) return <FileCode size={24} className="text-slate-500" />;
  if (file.type.startsWith('image/')) return <ImageIcon size={24} className="text-slate-500" />;
  return <FileType size={24} className="text-slate-500" />;
};

const FileItem: React.FC<FileItemProps> = ({ file, onRemove }) => {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Simulate upload/scan progress
    const t1 = setTimeout(() => setProgress(100), 50);
    const t2 = setTimeout(() => setIsReady(true), 550); // 500ms duration + buffer

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [file]);

  return (
    <div className="relative flex items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      {/* Progress Bar (visible during loading) */}
      <div 
        className={clsx(
          "absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-500 ease-out z-0",
          isReady ? "opacity-0" : "opacity-100"
        )}
        style={{ width: `${progress}%` }}
      />

      {/* Icon / Thumbnail Section */}
      <div className="relative shrink-0 rtl:ml-3 ltr:mr-3">
        <div className={clsx(
          "w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 bg-slate-50",
          !previewUrl && "bg-slate-50"
        )}>
          {previewUrl ? (
            <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
          ) : (
            getFileIcon(file)
          )}
        </div>
        
        {/* Status Badge */}
        {isReady && (
          <div className="absolute -bottom-1 -right-1 rtl:right-auto rtl:-left-1 bg-white rounded-full p-0.5 shadow-sm border border-green-100">
             <CheckCircle2 size={16} className="text-green-500 fill-green-50 animate-in zoom-in" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center justify-between">
          <span className="truncate font-medium text-slate-700 text-sm block" title={file.name}>{file.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
             {!isReady && <span className="text-xs text-primary-500 font-medium animate-pulse">جاري المعالجة...</span>}
        </div>
      </div>
      
      {onRemove && (
        <button 
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10 ml-2 rtl:ml-0 rtl:mr-2"
          title="إزالة"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  accept,
  multiple = false,
  onChange,
  selectedFiles,
  onRemove
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      onChange(newFiles);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onChange(newFiles);
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300",
          isDragOver 
            ? "border-primary-500 bg-primary-50" 
            : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-slate-100 rounded-full text-slate-500">
            <UploadCloud size={32} />
          </div>
          <p className="text-slate-700 font-medium text-lg">{label}</p>
          <p className="text-slate-400 text-sm">اسحب الملفات هنا أو اضغط للاختيار</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, idx) => (
            <FileItem 
              key={`${file.name}-${file.lastModified}-${idx}`} 
              file={file} 
              onRemove={onRemove ? () => onRemove(idx) : undefined} 
            />
          ))}
        </div>
      )}
    </div>
  );
};