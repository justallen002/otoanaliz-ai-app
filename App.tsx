import React, { useState, useEffect } from 'react';
import { Upload, Camera, ArrowRight, Loader2, Gauge, Calendar, RefreshCcw, Layers, CarFront, Sparkles, Edit3, Search, Lock } from 'lucide-react';
import { analyzeCarImage, estimateCarPrice } from './services/geminiService';
import { AppraisalState, CarAnalysis, BodyPartsMap, PartStatus } from './types';
import AnalysisResult from './components/AnalysisResult';
import ChatAssistant from './components/ChatAssistant';
import CarBodySelector from './components/CarBodySelector';

type EntryMode = 'smart' | 'manual' | null;

const App: React.FC = () => {
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [state, setState] = useState<AppraisalState>({
    step: 'upload',
    images: [],
    analysis: null,
    year: null,
    km: null,
    estimate: null,
    error: null
  });

  const [inputMake, setInputMake] = useState<string>('');
  const [inputModel, setInputModel] = useState<string>('');
  const [inputYear, setInputYear] = useState<string>('');
  const [inputKm, setInputKm] = useState<string>('');
  
  // State for Body Parts (Manual Mode)
  const [bodyParts, setBodyParts] = useState<BodyPartsMap>({
    hood: 'original',
    roof: 'original',
    trunk: 'original',
    fl_fender: 'original',
    fr_fender: 'original',
    fl_door: 'original',
    fr_door: 'original',
    rl_door: 'original',
    rr_door: 'original',
    rl_fender: 'original',
    rr_fender: 'original',
    front_bumper: 'original',
    rear_bumper: 'original',
  });

  // Update inputs when AI analysis is complete (Only for Smart Mode)
  useEffect(() => {
    if (state.analysis && entryMode === 'smart') {
      setInputMake(state.analysis.make || '');
      setInputModel(state.analysis.model || '');
    }
  }, [state.analysis, entryMode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const filePromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(base64Strings => {
        const base64DataArray = base64Strings.map(str => str.split(',')[1]);
        
        setState(prev => ({ ...prev, step: 'analyzing_image', images: base64Strings, error: null }));
        
        analyzeCarImage(base64DataArray)
          .then(analysis => {
            // In manual mode, we merge the user's input with the AI's condition analysis
            if (entryMode === 'manual') {
              const mergedAnalysis = {
                ...analysis,
                make: inputMake || analysis.make,
                model: inputModel || analysis.model
              };
              setState(prev => ({ ...prev, step: 'details_input', analysis: mergedAnalysis }));
            } else {
              setState(prev => ({ ...prev, step: 'details_input', analysis }));
            }
          })
          .catch(err => {
            setState(prev => ({ ...prev, step: 'upload', error: err.message }));
          });
      });
    }
  };

  const handleBodyPartChange = (partKey: string, status: PartStatus) => {
    setBodyParts(prev => ({ ...prev, [partKey]: status }));
  };

  const generateDamageReportFromParts = (): string[] => {
    const labels: {[key: string]: string} = {
      hood: 'Kaput', roof: 'Tavan', trunk: 'Bagaj',
      fl_fender: 'Sol Ön Çamurluk', fr_fender: 'Sağ Ön Çamurluk',
      fl_door: 'Sol Ön Kapı', fr_door: 'Sağ Ön Kapı',
      rl_door: 'Sol Arka Kapı', rr_door: 'Sağ Arka Kapı',
      rl_fender: 'Sol Arka Çamurluk', rr_fender: 'Sağ Arka Çamurluk',
      front_bumper: 'Ön Tampon', rear_bumper: 'Arka Tampon'
    };

    const statusLabels: {[key: string]: string} = {
      painted: 'Boyalı', changed: 'Değişen', local: 'Lokal Boyalı'
    };

    const damages: string[] = [];
    Object.entries(bodyParts).forEach(([key, status]) => {
      if (status !== 'original' && labels[key]) {
        damages.push(`${labels[key]}: ${statusLabels[status as string]}`);
      }
    });
    return damages;
  };

  const handleDetailsSubmit = () => {
    if (!inputYear || !inputKm) return;
    
    const year = parseInt(inputYear);
    const km = parseInt(inputKm.replace(/\D/g, ''));

    // If manual mode, merge the visual body selector damages
    let finalDamages = state.analysis?.identifiedDamages || [];
    if (entryMode === 'manual') {
      const manualDamages = generateDamageReportFromParts();
      // If user selected parts, prioritize them over generic AI findings or combine
      if (manualDamages.length > 0) {
        finalDamages = manualDamages; 
      }
    }

    const finalAnalysis: CarAnalysis = {
      ...(state.analysis || {
        color: 'Belirtilmedi',
        visualCondition: finalDamages.length > 0 ? 'Kullanıcı tarafından belirtilen hasarlar mevcut.' : 'Temiz',
        identifiedDamages: [],
        isRare: false,
        confidence: 1.0,
        make: inputMake || 'Bilinmiyor',
        model: inputModel || 'Bilinmiyor'
      }),
      make: inputMake || state.analysis?.make || 'Bilinmiyor',
      model: inputModel || state.analysis?.model || 'Bilinmiyor',
      identifiedDamages: finalDamages
    };

    setState(prev => ({ ...prev, step: 'calculating_price', year, km, analysis: finalAnalysis }));

    estimateCarPrice(finalAnalysis, year, km)
      .then(estimate => {
        setState(prev => ({ ...prev, step: 'result', estimate }));
      })
      .catch(err => {
        setState(prev => ({ ...prev, step: 'details_input', error: err.message }));
      });
  };

  const resetApp = () => {
    setState({
      step: 'upload',
      images: [],
      analysis: null,
      year: null,
      km: null,
      estimate: null,
      error: null
    });
    setEntryMode(null);
    setInputMake('');
    setInputModel('');
    setInputYear('');
    setInputKm('');
    // Reset body parts
    setBodyParts({
      hood: 'original', roof: 'original', trunk: 'original',
      fl_fender: 'original', fr_fender: 'original',
      fl_door: 'original', fr_door: 'original',
      rl_door: 'original', rr_door: 'original',
      rl_fender: 'original', rr_fender: 'original',
      front_bumper: 'original', rear_bumper: 'original',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Camera className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              OtoAnaliz AI
            </h1>
          </div>
          {(state.step !== 'upload' || entryMode !== null) && (
            <button onClick={resetApp} className="text-xs md:text-sm text-slate-400 hover:text-white flex items-center gap-1">
              <RefreshCcw size={14} /> <span>Geri Dön</span>
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 w-full max-w-6xl mx-auto">
        
        {state.error && (
          <div className="w-full max-w-lg mb-6 bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-200 text-center text-sm">
            {state.error}
          </div>
        )}

        {/* Step 0: Choice Screen */}
        {state.step === 'upload' && entryMode === null && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Option 1: Smart AI */}
            <button 
              onClick={() => setEntryMode('smart')}
              className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl text-left hover:border-blue-500 hover:bg-slate-900/80 transition-all shadow-xl hover:shadow-blue-900/10 flex flex-col items-start gap-6"
            >
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="text-blue-500 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Yapay Zeka ile Analiz</h3>
                <p className="text-slate-400 text-sm md:text-base">
                  Fotoğraf yükleyin; marka, model, hasar ve nadirlik durumunu biz bulalım.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 text-blue-400 font-semibold text-sm">
                Fotoğraf ile Başla <ArrowRight size={16} />
              </div>
            </button>

            {/* Option 2: Manual Info First */}
            <button 
              onClick={() => setEntryMode('manual')}
              className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl text-left hover:border-indigo-500 hover:bg-slate-900/80 transition-all shadow-xl hover:shadow-indigo-900/10 flex flex-col items-start gap-6"
            >
              <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Edit3 className="text-indigo-500 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Manuel Bilgi Girişi</h3>
                <p className="text-slate-400 text-sm md:text-base">
                  Araç bilgilerini ve ekspertiz detaylarını kendiniz girin.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                Bilgileri Girerek Başla <ArrowRight size={16} />
              </div>
            </button>
          </div>
        )}

        {/* Step 1: Upload (Smart Mode) */}
        {state.step === 'upload' && entryMode === 'smart' && (
          <div className="w-full max-w-lg text-center space-y-8 animate-fade-in">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold">Aracın Fotoğrafını Atın</h2>
              <p className="text-slate-400">Görselden her şeyi (nadir modeller dahil) tanıyalım.</p>
            </div>
            
            <label className="group relative block w-full aspect-video border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/50 hover:bg-slate-800/80 hover:border-blue-500 transition-all cursor-pointer overflow-hidden shadow-2xl">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Upload className="w-8 h-8 text-blue-400 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-200">Fotoğrafları Seçin</p>
                  <p className="text-sm text-slate-500">Analiz otomatik başlayacaktır.</p>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Step 1: Upload (Manual Mode - Info First) */}
        {state.step === 'upload' && entryMode === 'manual' && (
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-8 animate-fade-in">
            <div className="border-b border-slate-800 pb-4">
               <h3 className="text-xl font-bold">Araç Detayları ve Ekspertiz</h3>
               <p className="text-slate-400 text-sm mt-1">Hasar durumunu şemadan işaretleyin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Text Inputs */}
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marka</label>
                    <input type="text" value={inputMake} onChange={(e) => setInputMake(e.target.value)} placeholder="Örn: BMW" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
                    <input type="text" value={inputModel} onChange={(e) => setInputModel(e.target.value)} placeholder="Örn: M3 E46" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Yıl</label>
                    <input type="number" value={inputYear} onChange={(e) => setInputYear(e.target.value)} placeholder="2004" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kilometre</label>
                    <input type="number" value={inputKm} onChange={(e) => setInputKm(e.target.value)} placeholder="120000" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm" />
                  </div>
                </div>
                
                <div className="pt-4">
                  <label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Opsiyonel: Fotoğraf Ekle</label>
                  <label className="flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl hover:border-indigo-500 cursor-pointer transition-colors bg-slate-800/30">
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    <Camera size={20} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">Görsel Yükle</span>
                  </label>
                </div>
                
                {/* Submit button for manual mode moved here if no photo upload */}
                <button 
                  onClick={handleDetailsSubmit}
                  disabled={!inputMake || !inputModel || !inputYear || !inputKm}
                  className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Sparkles size={18} />
                  Fiyat Analizi Yap
                </button>
              </div>

              {/* Right Side: Visual Body Selector */}
              <div className="flex flex-col items-center bg-slate-800/20 rounded-2xl p-4 border border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-4 w-full text-center">Kaporta Durumu (Dokunarak Seçin)</label>
                <CarBodySelector parts={bodyParts} onChange={handleBodyPartChange} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing Image */}
        {state.step === 'analyzing_image' && (
          <div className="text-center space-y-10 w-full max-w-lg animate-fade-in py-10">
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Sparkles className="w-10 h-10 text-blue-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                  Analiz Ediliyor...
                </h3>
                <p className="text-slate-400 text-sm md:text-base animate-pulse">
                  Görseller taranıyor, marka ve model detayları saptanıyor.
                </p>
              </div>
            </div>

            {/* Thumbnails Only */}
            <div className="flex flex-wrap justify-center gap-3 px-4">
              {state.images.map((img, idx) => (
                 <div key={idx} className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                   <img 
                     src={img} 
                     alt="Preview" 
                     className="w-full h-full object-cover" 
                   />
                   <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Details Input (Final verification for both modes) */}
        {state.step === 'details_input' && state.analysis && (
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
             <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                {state.images.length > 0 && <img src={state.images[0]} className="w-20 h-20 object-cover rounded-xl border border-slate-700 shadow-lg" alt="Car" />}
                <div>
                  <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sparkles size={12} /> Analiz Tamamlandı
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {inputMake} {inputModel}
                  </h3>
                  <p className="text-slate-500 text-[10px] mt-1">
                    {entryMode === 'smart' ? 'AI tarafından saptanan veriler kilitlenmiştir.' : 'Lütfen bilgileri onaylayın.'}
                  </p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marka</label>
                  <input 
                    type="text" 
                    value={inputMake} 
                    onChange={(e) => setInputMake(e.target.value)} 
                    readOnly={entryMode === 'smart'}
                    className={`w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm ${entryMode === 'smart' ? 'opacity-70 cursor-not-allowed bg-slate-800/50 pr-8' : ''}`} 
                  />
                  {entryMode === 'smart' && <Lock size={12} className="absolute bottom-3 right-3 text-slate-500" />}
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model</label>
                  <input 
                    type="text" 
                    value={inputModel} 
                    onChange={(e) => setInputModel(e.target.value)} 
                    readOnly={entryMode === 'smart'}
                    className={`w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm ${entryMode === 'smart' ? 'opacity-70 cursor-not-allowed bg-slate-800/50 pr-8' : ''}`} 
                  />
                  {entryMode === 'smart' && <Lock size={12} className="absolute bottom-3 right-3 text-slate-500" />}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Yıl *</label>
                  <input 
                    type="number" 
                    value={inputYear} 
                    onChange={(e) => setInputYear(e.target.value)} 
                    placeholder="Örn: 2018"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm placeholder:text-slate-600" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Kilometre *</label>
                  <input 
                    type="number" 
                    value={inputKm} 
                    onChange={(e) => setInputKm(e.target.value)} 
                    placeholder="Örn: 85000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-sm placeholder:text-slate-600" 
                  />
                </div>
             </div>

            {/* In Manual Mode with uploaded images, we still show the body selector just in case, or we skip it if we assume image analysis takes over. 
                However, for simplicity, if entryMode is 'manual', we always use the body selector overrides if they exist.
             */}
             {entryMode === 'manual' && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-400 mb-2">Seçili Ekspertiz Durumu:</p>
                    <div className="flex flex-wrap gap-2">
                        {generateDamageReportFromParts().length > 0 ? (
                            generateDamageReportFromParts().map((d, i) => (
                                <span key={i} className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">{d}</span>
                            ))
                        ) : (
                            <span className="text-[10px] text-green-500">Hatasız / Orijinal seçildi.</span>
                        )}
                    </div>
                </div>
             )}

             <button 
                onClick={handleDetailsSubmit}
                disabled={!inputYear || !inputKm}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg"
             >
               Hesaplamayı Başlat <ArrowRight size={18} />
             </button>
          </div>
        )}

        {/* Step 4: Calculating Price */}
        {state.step === 'calculating_price' && (
          <div className="text-center space-y-6">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
            <div className="animate-pulse">
              <h3 className="text-xl font-semibold">Piyasa Taranıyor...</h3>
              <p className="text-slate-400">Google Search ile güncel ilanlar karşılaştırılıyor.</p>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {state.step === 'result' && state.analysis && state.estimate && (
          <AnalysisResult 
            analysis={state.analysis}
            estimate={state.estimate}
            year={state.year!}
            km={state.km!}
            images={state.images}
          />
        )}
      </main>
      
      <ChatAssistant />
      
      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-slate-600 text-xs">
        <p>© 2024 OtoAnaliz AI. Gemini 3.0 Pro & Google Search desteklidir.</p>
      </footer>
    </div>
  );
};

export default App;