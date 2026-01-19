import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Download, AlertCircle, Image as ImageIcon, FileText, Wand2, Key, Eye, EyeOff, Smartphone, Trash2, Facebook, MessageCircle, Moon, Sun, Eraser, AlertTriangle, Loader2, Check, Info } from 'lucide-react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import { FileUploader } from './components/FileUploader';
import { Button } from './components/Button';
import { hideFiles, extractFiles } from './utils/steganography';
import { AppMode } from './types';

// Security Ticker Component - Seamless Infinite Loop
const SecurityTicker = () => {
  const tips = [
    { icon: AlertTriangle, text: "تنبيه أمني: تجنب استخدام صور غلاف ذات أحجام ضخمة جداً (أكبر من 4K) لتفادي إثارة الشكوك." },
    { icon: Key, text: "نصيحة ذهبية: استخدم كلمة مرور قوية ومعقدة (أحرف، أرقام، ورموز) لضمان استحالة كسر التشفير." },
    { icon: Trash2, text: "هام جداً: الوكيل الذكي لا يحذف ملفاتك الأصلية تلقائياً. تأكد من حذفها يدوياً من الاستوديو بعد التشفير." },
    { icon: ShieldCheck, text: "خصوصية تامة: هذا التطبيق يعمل 100% على جهازك ولا يحتاج للإنترنت، ملفاتك لا تغادر هاتفك أبداً." },
    { icon: AlertCircle, text: "تحذير: احتفظ بكلمة المرور في مكان آمن، ففي حال نسيانها يستحيل استرجاع الملفات المخفية." }
  ];

  const TickerContent = () => (
    <div className="flex gap-16 px-4 shrink-0 items-center" dir="rtl">
       {tips.map((tip, idx) => (
         <div key={idx} className="flex items-center gap-2 text-xs md:text-sm font-bold text-amber-800 dark:text-amber-500 whitespace-nowrap">
            <tip.icon size={15} className="shrink-0 mb-0.5" />
            <span>{tip.text}</span>
         </div>
       ))}
    </div>
  );

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 overflow-hidden relative h-10 flex items-center shadow-inner select-none group" role="marquee" dir="ltr">
      <div className="flex w-max animate-marquee-infinite group-hover:pause">
          <TickerContent />
          <TickerContent />
      </div>
      
      <style>{`
        @keyframes marquee-infinite {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-infinite {
          animation: marquee-infinite 80s linear infinite;
        }
        .group:hover .animate-marquee-infinite {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

function App() {
  // Theme State with Time Awareness
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        return savedTheme;
      }
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
  
  // Auto Clear State
  const [autoClear, setAutoClear] = useState(false);
  const [showDeleteReminder, setShowDeleteReminder] = useState(false);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Encrypt State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [secretFiles, setSecretFiles] = useState<File[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{original: string, new: string} | null>(null);

  // Decrypt State
  const [encodedImage, setEncodedImage] = useState<File | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<JSZip | null>(null);
  const [extractedFileList, setExtractedFileList] = useState<string[]>([]);
  
  // File Download Status State: { [filename]: 'idle' | 'loading' | 'success' }
  const [fileDownloadStatus, setFileDownloadStatus] = useState<Record<string, 'idle' | 'loading' | 'success'>>({});

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

  // Check if app is already installed
  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    
    checkStandalone();
    window.addEventListener('resize', checkStandalone); // Sometimes mode changes on resize
    
    return () => window.removeEventListener('resize', checkStandalone);
  }, []);

  // Handle Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      if (!isInstalled) {
        setDeferredPrompt(e);
      }
    };

    const handleAppInstalled = () => {
      console.log('App installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setError(null);
    setLoading(false);
    setPassword('');
    setCoverImage(null);
    setSecretFiles([]);
    if (resultImage) URL.revokeObjectURL(resultImage);
    setResultImage(null);
    setEncodedImage(null);
    setDecryptedFiles(null);
    setExtractedFileList([]);
    setResizeInfo(null);
    setShowDeleteReminder(false);
    setFileDownloadStatus({});
  };

  // Cleanup Blob URLs
  useEffect(() => {
    return () => {
      if (resultImage) {
        URL.revokeObjectURL(resultImage);
      }
    };
  }, [resultImage]);

  const onEncrypt = async () => {
    if (!coverImage || secretFiles.length === 0) return;
    if (!password) {
      setError('يرجى تحديد كلمة مرور لتأمين الملفات.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResizeInfo(null);
    setShowDeleteReminder(false);
    
    if (resultImage) {
        URL.revokeObjectURL(resultImage);
        setResultImage(null);
    }

    try {
      await new Promise(r => setTimeout(r, 100));
      const { blob, isResized, originalDimensions, newDimensions } = await hideFiles(coverImage, secretFiles, password);
      const url = URL.createObjectURL(blob);
      setResultImage(url);
      
      if (isResized) {
        setResizeInfo({ original: originalDimensions, new: newDimensions });
      }

      // Auto Clear Logic
      if (autoClear) {
        setSecretFiles([]); // Clear Secret Files from memory
        setCoverImage(null); // Clear Cover Image from memory
        setShowDeleteReminder(true); // Trigger UI reminder
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
    setFileDownloadStatus({});

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
    
    // Set status to loading
    setFileDownloadStatus(prev => ({ ...prev, [filename]: 'loading' }));

    try {
      const file = decryptedFiles.file(filename);
      if (file) {
        // Add a small delay for better UX perception
        await new Promise(resolve => setTimeout(resolve, 500));

        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        // Set status to success
        setFileDownloadStatus(prev => ({ ...prev, [filename]: 'success' }));

        // Optional: Revert to idle after 3 seconds
        setTimeout(() => {
             setFileDownloadStatus(prev => ({ ...prev, [filename]: 'idle' }));
        }, 3000);
      }
    } catch (e) {
      console.error("Download error", e);
      setFileDownloadStatus(prev => ({ ...prev, [filename]: 'idle' }));
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
            </button>

            {/* Show Install Button ONLY if deferredPrompt is available AND not already installed */}
            {deferredPrompt && !isInstalled && (
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

      {/* Security Ticker */}
      <SecurityTicker />

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

            {/* Password Field & Auto Clear Toggle */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 max-w-xl mx-auto transition-colors">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg"><Key size={18}/></span>
                  3. كلمة المرور (مطلوب)
                </h2>
                <div className="relative mb-4">
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

                {/* Auto Clear Toggle */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => setAutoClear(!autoClear)}>
                   <div className={clsx("w-10 h-6 rounded-full p-1 transition-colors duration-300 relative", autoClear ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600")}>
                      <div className={clsx("w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300", autoClear ? "translate-x-0" : "-translate-x-4")} dir="ltr"></div>
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Eraser size={16} className={autoClear ? "text-red-500" : "text-slate-400"}/>
                        وضع المسح الآمن
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">
                        إزالة الملفات تلقائياً من التطبيق بعد التشفير وتذكيرك بحذفها من الجهاز.
                      </p>
                   </div>
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 px-1">
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
                  {/* Delete Reminder Alert */}
                  {showDeleteReminder && (
                     <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                           <AlertTriangle className="text-red-500 shrink-0 mt-1" size={20}/>
                           <div>
                              <p className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">تذكير أمني هام</p>
                              <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed">
                                 تم مسح الملفات الأصلية من ذاكرة التطبيق. يرجى الذهاب الآن إلى مدير الملفات أو الاستوديو وحذف الملفات الأصلية يدوياً لضمان الخصوصية التامة.
                              </p>
                           </div>
                        </div>
                     </div>
                  )}

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
                          setShowDeleteReminder(false);
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
                        {extractedFileList.map((filename, idx) => {
                            const status = fileDownloadStatus[filename] || 'idle';
                            return (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors w-full max-w-full overflow-hidden">
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                        <FileText className="text-slate-400 dark:text-slate-500 shrink-0" />
                                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate w-full" dir="auto" title={filename}>{filename}</p>
                                    </div>
                                    <button
                                        onClick={() => downloadExtractedFile(filename)}
                                        disabled={status === 'loading'}
                                        className={clsx(
                                            "flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 mr-3 rtl:mr-3 rtl:ml-0 hover:shadow-sm min-w-[100px] justify-center",
                                            status === 'success' 
                                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default" 
                                              : "text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {status === 'loading' ? (
                                           <>
                                             <Loader2 size={16} className="animate-spin" />
                                             <span>جاري...</span>
                                           </>
                                        ) : status === 'success' ? (
                                           <>
                                             <Check size={16} />
                                             <span>تم التحميل</span>
                                           </>
                                        ) : (
                                           <>
                                             <Download size={16} />
                                             <span>تحميل</span>
                                           </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
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