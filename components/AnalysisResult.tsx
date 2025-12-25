import React, { useEffect, useState } from 'react';
import { CarAnalysis, PriceEstimate } from '../types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, MapPin, ChevronLeft, ChevronRight, ShieldCheck, Tag } from 'lucide-react';
import { findNearbyServices } from '../services/geminiService';

interface AnalysisResultProps {
  analysis: CarAnalysis;
  estimate: PriceEstimate;
  year: number;
  km: number;
  images: string[];
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, estimate, year, km, images }) => {
  const [nearbyServices, setNearbyServices] = useState<string>("");
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (navigator.geolocation) {
      setLoadingMaps(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const result = await findNearbyServices(
              position.coords.latitude, 
              position.coords.longitude, 
              "Oto Ekspertiz"
            );
            setNearbyServices(result);
          } catch (e) {
            setLocationError("Harita verisi alınamadı.");
          } finally {
            setLoadingMaps(false);
          }
        },
        (err) => {
          setLoadingMaps(false);
          setLocationError("Konum izni verilmedi.");
        }
      );
    }
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const getDisplayConfidence = () => {
    let conf = analysis.confidence || 0;
    if (conf <= 1 && conf > 0) conf = conf * 100;
    return Math.min(Math.round(conf), 100);
  };

  const confidence = getDisplayConfidence();
  
  const getConfidenceColor = () => {
    if (confidence >= 85) return 'bg-emerald-600';
    if (confidence >= 60) return 'bg-amber-500';
    return 'bg-orange-600';
  };

  const expectedFinalPrice = estimate.avgPrice - estimate.bargainingMargin;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-24 md:pb-20">
      
      {/* Header Card */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col md:flex-row">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2 h-56 sm:h-64 md:h-auto relative group">
          <img 
            src={images[currentImageIndex]} 
            alt={`Car view ${currentImageIndex + 1}`} 
            className="w-full h-full object-cover transition-opacity duration-300" 
          />
          
          <div className={`absolute top-4 left-4 ${getConfidenceColor()} text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl z-10 flex items-center gap-1.5 border border-white/20`}>
            <ShieldCheck size={14} />
            AI Güven: %{confidence}
          </div>

          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        <div className="w-full md:w-1/2 p-5 md:p-6 flex flex-col justify-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{analysis.make} {analysis.model}</h2>
          <div className="text-blue-400 text-base md:text-lg font-medium mb-4">{analysis.generation} • {year} • {km.toLocaleString()} KM</div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wide">Renk</span>
              <p className="text-white font-semibold text-sm md:text-base">{analysis.color}</p>
            </div>
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wide">Model Tipi</span>
              <p className="text-white font-semibold capitalize text-sm md:text-base">{analysis.isRare ? 'Nadir' : 'Standart'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Estimate Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 md:p-6 border border-indigo-500/30 shadow-xl">
          <h3 className="text-lg md:text-xl font-semibold text-indigo-300 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Piyasa Değerlemesi
          </h3>
          
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-slate-400 text-xs md:text-sm">Liste Fiyatı (İlan Ortalaması)</span>
              <div className="text-3xl md:text-4xl font-bold text-white tracking-tight my-2">
                {formatCurrency(estimate.avgPrice)}
              </div>
              
              {/* Market Range Display */}
              <div className="text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 mb-2">
                <span>{formatCurrency(estimate.minPrice)}</span>
                <span className="h-px w-8 bg-indigo-500/30"></span>
                <span>{formatCurrency(estimate.maxPrice)}</span>
              </div>
            </div>

            {/* Bargaining Section */}
            <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300">
                <Tag size={18} />
                <span className="text-xs md:text-sm font-semibold">Beklenen Pazarlık Payı:</span>
              </div>
              <div className="text-amber-200 font-bold text-sm md:text-base">
                - {formatCurrency(estimate.bargainingMargin)}
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
              <span className="text-green-400 text-[10px] md:text-xs uppercase font-bold tracking-widest">Tahmini Alım/Satım Fiyatı</span>
              <div className="text-2xl md:text-3xl font-extrabold text-green-100 mt-1">
                {formatCurrency(expectedFinalPrice)}
              </div>
            </div>

            <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-500/20">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {estimate.marketTrend === 'rising' ? <TrendingUp className="text-green-400" /> : 
                   estimate.marketTrend === 'falling' ? <TrendingDown className="text-red-400" /> : 
                   <Minus className="text-yellow-400" />}
                </div>
                <div>
                  <p className="text-indigo-200 text-xs md:text-sm leading-relaxed">{estimate.reasoning}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Damage Report Card */}
        <div className="bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-700 shadow-xl">
          <h3 className="text-lg md:text-xl font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Hasar ve Kondisyon Raporu
          </h3>
          
          <div className="mb-6 italic text-slate-300 text-xs md:text-sm">
            "{analysis.visualCondition}"
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Tespit Edilen Kusurlar</h4>
            {analysis.identifiedDamages.length > 0 ? (
              <ul className="space-y-2">
                {analysis.identifiedDamages.map((damage, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-red-900/20 p-3 rounded-lg border border-red-900/30 text-red-200 text-xs md:text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{damage}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3 bg-green-900/20 p-4 rounded-lg border border-green-900/30 text-green-200 text-xs md:text-sm">
                <CheckCircle className="w-5 h-5" />
                Belirgin bir hasar tespit edilmedi.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nearby Services */}
      <div className="bg-slate-800 rounded-2xl p-5 md:p-6 border border-slate-700 shadow-xl">
         <h3 className="text-lg md:text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-500" />
            Yakındaki Ekspertiz Merkezleri
          </h3>
          <div className="prose prose-invert prose-sm max-w-none text-xs md:text-sm">
            {loadingMaps ? (
              <p className="text-slate-400 animate-pulse">Konumunuza göre servisler aranıyor...</p>
            ) : locationError ? (
              <p className="text-slate-500">{locationError}</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: nearbyServices.replace(/\n/g, '<br />') }} />
            )}
          </div>
      </div>
    </div>
  );
};

export default AnalysisResult;