import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Download, AlertCircle, Image as ImageIcon, FileText, Wand2, Key, Eye, EyeOff, Smartphone, Trash2, Facebook, MessageCircle, Moon, Sun, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import { FileUploader } from './components/FileUploader';
import { Button } from './components/Button';
import { hideFiles, extractFiles } from './utils/steganography';
import { AppMode } from './types';

function App() {
  // Theme State with Time Awareness
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      // 1. Check if user has manually set a preference previously
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        return savedTheme;
      }

      // 2. If no preference, check the time (Auto-Theme)
      // Night mode is active from 6 PM (18:00) to 6 AM (06:00)
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      
      if (isNight) {
        return 'dark';
      }
    }
    return 'light';
  });

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

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
    a.download = `tashfir_image_${Date.now()}.png`;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm safe-area-top transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white p-2 rounded-xl shadow-lg shadow-primary-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Tashfir</h1>
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1">
                الوكيل الذكي <Wand2 size={10} />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative group"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              
              {/* Optional: Indicator if set by time? No, keep it simple. */}
            </button>

            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95 animate-in fade-in slide-in-from-top-2"
              >
                <Smartphone size={16} />
                <span className="inline">تثبيت</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 flex-grow w-full">
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <button
            onClick={() => handleModeChange(AppMode.ENCRYPT)}
            className={clsx(
              "flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300",
              mode === AppMode.ENCRYPT
                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-700/50"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-700/50"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Unlock size={20} />
            فك التشفير (استخراج)
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
            <AlertCircle className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Encrypt Mode */}
        {mode === AppMode.ENCRYPT && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Steps Container */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md overflow-hidden">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg"><ImageIcon size={18}/></span>
                  1. صورة الغلاف
                </h2>
                <div className="mb-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg flex gap-2">
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

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md overflow-hidden">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                   <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg"><FileText size={18}/></span>
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 max-w-xl mx-auto transition-colors">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg"><Key size={18}/></span>
                  3. كلمة المرور (مطلوب)
                </h2>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ادخل كلمة مرور قوية..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
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
              <div className="mt-8 overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-green-200 dark:border-green-800 shadow-lg animate-in zoom-in-95 duration-500">
                <div className="bg-green-50 dark:bg-green-900/20 p-8 text-center border-b border-green-100 dark:border-green-800/50">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-50 dark:ring-green-900/20">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">تم التشفير بنجاح!</h3>
                  <p className="text-green-700 dark:text-green-400">بياناتك الآن مخفية ومحمية بكلمة مرور.</p>
                </div>

                <div className="p-6 space-y-4">
                  {resizeInfo && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Wand2 className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                        <div>
                          <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">تدخل الوكيل الذكي</p>
                          <p className="text-blue-600 dark:text-blue-400 text-sm">
                            قام النظام بتكبير أبعاد الصورة لتتسع لجميع الملفات المخفية.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-white/60 dark:bg-slate-800/60 p-2 rounded border border-blue-100 dark:border-blue-800 flex flex-col items-center">
                          <span className="text-xs font-bold text-blue-400 dark:text-blue-300 mb-1">الأبعاد الأصلية</span>
                          <span className="font-mono text-blue-700 dark:text-blue-200 font-medium" dir="ltr">{resizeInfo.original}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-blue-200 dark:border-blue-700 shadow-sm flex flex-col items-center relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                           <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">الأبعاد الجديدة</span>
                           <span className="font-mono text-blue-900 dark:text-blue-100 font-bold" dir="ltr">{resizeInfo.new}</span>
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
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <span className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg"><ImageIcon size={18}/></span>
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

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg"><Key size={18}/></span>
                  2. كلمة المرور
                </h2>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ادخل كلمة مرور فك التشفير..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in zoom-in-95 duration-300 transition-colors">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Unlock size={24} className="text-primary-500"/>
                        الملفات المستخرجة ({extractedFileList.length})
                    </h3>
                    <div className="grid gap-3">
                        {extractedFileList.map((filename, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors w-full max-w-full overflow-hidden">
                                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                    <FileText className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <p className="font-medium text-slate-700 dark:text-slate-300 truncate w-full" dir="auto" title={filename}>{filename}</p>
                                </div>
                                <button
                                    onClick={() => downloadExtractedFile(filename)}
                                    className="flex items-center gap-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm px-3 py-1.5 rounded-lg transition-all shrink-0 mr-3 rtl:mr-3 rtl:ml-0"
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

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <p className="text-slate-700 dark:text-slate-400 font-medium">
              إعداد المهندس <a href="https://www.facebook.com/mushir.almahsani?mibextid=ZbWKwL" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">مشير المحسني</a>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://www.facebook.com/mushir.almahsani?mibextid=ZbWKwL" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 text-[#1877F2] rounded-full shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
              title="Facebook"
            >
              <Facebook size={20} />
            </a>
            
            <a 
              href="https://wa.me/967781836277" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-full shadow-md hover:bg-[#20bd5a] hover:shadow-lg transition-all active:scale-95"
            >
              <MessageCircle size={18} />
              <span className="font-bold text-sm">اطلب تطبيقك الخاص</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;