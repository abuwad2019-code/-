import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Download, AlertCircle, Image as ImageIcon, FileText, Wand2, Key, Eye, EyeOff, Smartphone, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import { FileUploader } from './components/FileUploader';
import { Button } from './components/Button';
import { hideFiles, extractFiles } from './utils/steganography';
import { AppMode } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ENCRYPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Encrypt State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [secretFiles, setSecretFiles] = useState<File[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{original: string, new: string} | null>(null);

  // Decrypt State
  const [encodedImage, setEncodedImage] = useState<File | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<JSZip | null>(null);
  const [extractedFileList, setExtractedFileList] = useState<string[]>([]);

  // Cleanup Blob URLs to prevent memory leaks (Quota Exceeded)
  useEffect(() => {
    return () => {
      if (resultImage) {
        URL.revokeObjectURL(resultImage);
      }
    };
  }, [resultImage]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setError(null);
    setLoading(false);
    setPassword('');
    // Reset states
    setCoverImage(null);
    setSecretFiles([]);
    // Revoke old URL before clearing
    if (resultImage) URL.revokeObjectURL(resultImage);
    setResultImage(null);
    setEncodedImage(null);
    setDecryptedFiles(null);
    setExtractedFileList([]);
    setResizeInfo(null);
  };

  const onEncrypt = async () => {
    if (!coverImage || secretFiles.length === 0) return;
    if (!password) {
      setError('يرجى تحديد كلمة مرور لتأمين الملفات.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResizeInfo(null);
    
    // Clean previous result
    if (resultImage) {
        URL.revokeObjectURL(resultImage);
        setResultImage(null);
    }

    try {
      // Small delay to let UI render loading state
      await new Promise(r => setTimeout(r, 100));
      
      const { blob, isResized, originalDimensions, newDimensions } = await hideFiles(coverImage, secretFiles, password);
      const url = URL.createObjectURL(blob);
      setResultImage(url);
      
      if (isResized) {
        setResizeInfo({ original: originalDimensions, new: newDimensions });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء عملية التشفير.');
    } finally {
      setLoading(false);
    }
  };

  const onDecrypt = async () => {
    if (!encodedImage) return;
    if (!password) {
      setError('يرجى إدخال كلمة المرور لفك التشفير.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedFileList([]);
    setDecryptedFiles(null);

    try {
       await new Promise(r => setTimeout(r, 100));
       
       const zip = await extractFiles(encodedImage, password);
       const files: string[] = [];
       zip.forEach((relativePath) => files.push(relativePath));
       
       if (files.length === 0) {
         throw new Error('لم يتم العثور على ملفات داخل هذه الصورة.');
       }

       setDecryptedFiles(zip);
       setExtractedFileList(files);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء محاولة استخراج الملفات.');
    } finally {
      setLoading(false);
    }
  };

  const downloadEncryptedImage = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `stego_image_${Date.now()}.png`;
    a.click();
  };

  const downloadExtractedFile = async (filename: string) => {
    if (!decryptedFiles) return;
    const file = decryptedFiles.file(filename);
    if (file) {
      const blob = await file.async('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); // Revoke after download
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm safe-area-top">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white p-2 rounded-xl shadow-lg shadow-primary-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">StegoGuard</h1>
              <span className="text-xs font-medium text-primary-600 flex items-center gap-1">
                الوكيل الذكي <Wand2 size={10} />
              </span>
            </div>
          </div>

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95 animate-in fade-in slide-in-from-top-2"
            >
              <Smartphone size={16} />
              <span className="hidden sm:inline">تثبيت التطبيق</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <button
            onClick={() => handleModeChange(AppMode.ENCRYPT)}
            className={clsx(
              "flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300",
              mode === AppMode.ENCRYPT
                ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Lock size={20} />
            تشفير (إخفاء)
          </button>
          <button
            onClick={() => handleModeChange(AppMode.DECRYPT)}
            className={clsx(
              "flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300",
              mode === AppMode.DECRYPT
                ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Unlock size={20} />
            فك التشفير (استخراج)
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
            <AlertCircle className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Encrypt Mode */}
        {mode === AppMode.ENCRYPT && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Steps Container */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <span className="bg-blue-50 text-blue-600 p-2 rounded-lg"><ImageIcon size={18}/></span>
                  1. صورة الغلاف
                </h2>
                <div className="mb-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg flex gap-2">
                  <Wand2 size={16} className="text-primary-500 shrink-0 mt-0.5" />
                  <p>سيقوم الوكيل الذكي بتعديل حجم الصورة تلقائياً إذا كانت الملفات كبيرة جداً.</p>
                </div>
                <FileUploader
                  label="اختر الصورة"
                  accept="image/*"
                  selectedFiles={coverImage ? [coverImage] : []}
                  onChange={(files) => setCoverImage(files[0])}
                  onRemove={() => setCoverImage(null)}
                />
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-shadow hover:shadow-md">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                   <span className="bg-purple-50 text-purple-600 p-2 rounded-lg"><FileText size={18}/></span>
                   2. الملفات السرية
                </h2>
                <FileUploader
                  label="اختر الملفات"
                  multiple
                  selectedFiles={secretFiles}
                  onChange={(files) => setSecretFiles(prev => [...prev, ...files])}
                  onRemove={(idx) => setSecretFiles(prev => prev.filter((_, i) => i !== idx))}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 max-w-xl mx-auto">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <span className="bg-amber-50 text-amber-600 p-2 rounded-lg"><Key size={18}/></span>
                  3. كلمة المرور (مطلوب)
                </h2>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ادخل كلمة مرور قوية..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 px-1">
                  تنبيه: لن تتمكن من استرجاع الملفات إذا نسيت كلمة المرور.
                </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={onEncrypt} 
                disabled={!coverImage || secretFiles.length === 0 || !password} 
                isLoading={loading}
                className="w-full md:w-auto shadow-xl shadow-primary-500/20"
              >
                بدء التشفير والإخفاء
              </Button>
            </div>

            {resultImage && (
              <div className="mt-8 overflow-hidden bg-white rounded-3xl border border-green-200 shadow-lg animate-in zoom-in-95 duration-500">
                <div className="bg-green-50 p-8 text-center border-b border-green-100">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-50">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">تم التشفير بنجاح!</h3>
                  <p className="text-green-700">بياناتك الآن مخفية ومحمية بكلمة مرور.</p>
                </div>

                <div className="p-6 space-y-4">
                  {resizeInfo && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Wand2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <p className="font-bold text-blue-800 text-sm">تدخل الوكيل الذكي</p>
                          <p className="text-blue-600 text-sm">
                            قام النظام بتكبير أبعاد الصورة لتتسع لجميع الملفات المخفية.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-white/60 p-2 rounded border border-blue-100 flex flex-col items-center">
                          <span className="text-xs font-bold text-blue-400 mb-1">الأبعاد الأصلية</span>
                          <span className="font-mono text-blue-700 font-medium" dir="ltr">{resizeInfo.original}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-blue-200 shadow-sm flex flex-col items-center relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                           <span className="text-xs font-bold text-blue-600 mb-1">الأبعاد الجديدة</span>
                           <span className="font-mono text-blue-900 font-bold" dir="ltr">{resizeInfo.new}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center pt-2 gap-3 flex-wrap">
                      <Button onClick={downloadEncryptedImage} variant="primary" className="gap-2 w-full md:w-auto">
                          <Download size={20} />
                          تحميل الصورة النهائية
                      </Button>
                      <Button 
                        onClick={() => {
                          setResultImage(null);
                          setResizeInfo(null);
                          setSecretFiles([]);
                          setCoverImage(null);
                        }} 
                        variant="secondary" 
                        className="gap-2 w-full md:w-auto"
                      >
                          <Trash2 size={20} />
                          بدء من جديد
                      </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decrypt Mode */}
        {mode === AppMode.DECRYPT && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="bg-slate-100 p-1.5 rounded-lg"><ImageIcon size={18}/></span>
                1. اختر الصورة المشفرة
              </h2>
              <FileUploader
                label="ارفع الصورة لاستخراج الملفات منها"
                accept="image/*"
                selectedFiles={encodedImage ? [encodedImage] : []}
                onChange={(files) => setEncodedImage(files[0])}
                onRemove={() => setEncodedImage(null)}
              />
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <span className="bg-amber-50 text-amber-600 p-2 rounded-lg"><Key size={18}/></span>
                  2. كلمة المرور
                </h2>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ادخل كلمة مرور فك التشفير..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={onDecrypt} 
                disabled={!encodedImage || !password} 
                isLoading={loading}
                className="w-full md:w-auto"
              >
                استخراج الملفات
              </Button>
            </div>

            {decryptedFiles && extractedFileList.length > 0 && (
                <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Unlock size={24} className="text-primary-500"/>
                        الملفات المستخرجة ({extractedFileList.length})
                    </h3>
                    <div className="grid gap-3">
                        {extractedFileList.map((filename, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="text-slate-400" />
                                    <span className="font-medium text-slate-700 truncate">{filename}</span>
                                </div>
                                <button
                                    onClick={() => downloadExtractedFile(filename)}
                                    className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:bg-white hover:shadow-sm px-3 py-1.5 rounded-lg transition-all"
                                >
                                    <Download size={16} />
                                    تحميل
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;