import React from 'react';
import { PartStatus, BodyPartsMap } from '../types';

interface CarBodySelectorProps {
  parts: BodyPartsMap;
  onChange: (partKey: string, status: PartStatus) => void;
}

const CarBodySelector: React.FC<CarBodySelectorProps> = ({ parts, onChange }) => {
  
  const cycleStatus = (current: PartStatus): PartStatus => {
    switch (current) {
      case 'original': return 'local';
      case 'local': return 'painted';
      case 'painted': return 'changed';
      case 'changed': return 'original';
      default: return 'original';
    }
  };

  const handlePartClick = (key: string) => {
    const nextStatus = cycleStatus(parts[key] || 'original');
    onChange(key, nextStatus);
  };

  const getStatusColor = (status: PartStatus) => {
    switch (status) {
      case 'original': return 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-500 text-slate-300';
      case 'local': return 'bg-yellow-500/80 hover:bg-yellow-400/80 border-yellow-300 text-black font-bold';
      case 'painted': return 'bg-purple-600/80 hover:bg-purple-500/80 border-purple-400 text-white font-bold';
      case 'changed': return 'bg-red-600/80 hover:bg-red-500/80 border-red-400 text-white font-bold';
      default: return 'bg-slate-700/50 border-slate-500';
    }
  };

  const getStatusLabel = (status: PartStatus) => {
    switch (status) {
      case 'original': return ''; // Clean look for original
      case 'local': return 'L';
      case 'painted': return 'B';
      case 'changed': return 'D';
      default: return '';
    }
  };

  const PartButton = ({ partKey, className, label }: { partKey: string, className: string, label?: string }) => {
    const status = parts[partKey] || 'original';
    const statusText = getStatusLabel(status);
    const displayText = statusText || label;
    // If showing status code (single letter), use larger font. If label, use smaller.
    const textSize = statusText ? 'text-lg md:text-xl' : 'text-[9px] md:text-[10px]';

    return (
      <button
        type="button"
        onClick={() => handlePartClick(partKey)}
        className={`absolute flex items-center justify-center text-center leading-tight transition-all border shadow-sm backdrop-blur-sm p-0.5 ${getStatusColor(status)} ${className} ${textSize}`}
      >
        <span className="break-words w-full px-0.5">
          {displayText}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      <div className="relative w-[300px] h-[440px] bg-slate-800/30 rounded-3xl border border-slate-700/50 shadow-inner p-4 scale-90 sm:scale-100 origin-top">
        
        {/* Schematic Outline (Simplified Car Shape) */}
        
        {/* --- CENTRAL COLUMN --- */}
        
        {/* Front Bumper */}
        <PartButton 
          partKey="front_bumper" 
          className="top-2 left-1/2 -translate-x-1/2 w-44 h-8 rounded-t-2xl rounded-b-sm" 
          label="Ön Tampon"
        />

        {/* Hood (Kaput) */}
        <PartButton 
          partKey="hood" 
          className="top-11 left-1/2 -translate-x-1/2 w-32 h-24 rounded-lg z-10" 
          label="Kaput"
        />

        {/* Roof (Tavan) */}
        <PartButton 
          partKey="roof" 
          className="top-36 left-1/2 -translate-x-1/2 w-32 h-32 rounded-lg z-10" 
          label="Tavan"
        />

        {/* Trunk (Bagaj) */}
        <PartButton 
          partKey="trunk" 
          className="bottom-11 left-1/2 -translate-x-1/2 w-32 h-20 rounded-lg z-10" 
          label="Bagaj"
        />

        {/* Rear Bumper */}
        <PartButton 
          partKey="rear_bumper" 
          className="bottom-2 left-1/2 -translate-x-1/2 w-44 h-8 rounded-b-2xl rounded-t-sm" 
          label="Arka Tampon"
        />


        {/* --- LEFT SIDE --- */}

        {/* FL Fender */}
        <PartButton 
          partKey="fl_fender" 
          className="top-11 left-4 w-16 h-24 rounded-tl-3xl rounded-bl-sm"
          label="Sol Ön Çamurluk" 
        />

        {/* FL Door */}
        <PartButton 
          partKey="fl_door" 
          className="top-36 left-4 w-16 h-32 rounded-l-sm border-t-0 border-b-0 border-l border-r-0 my-0.5" 
          label="Sol Ön Kapı"
        />

        {/* RL Door */}
        <PartButton 
          partKey="rl_door" 
          className="bottom-36 left-4 w-16 h-32 rounded-l-sm border-t-0 border-b-0 border-l border-r-0 my-0.5" 
          label="Sol Arka Kapı"
        />

         {/* RL Fender */}
         <PartButton 
          partKey="rl_fender" 
          className="bottom-11 left-4 w-16 h-24 rounded-bl-3xl rounded-tl-sm" 
          label="Sol Arka Çamurluk"
        />


        {/* --- RIGHT SIDE --- */}

        {/* FR Fender */}
        <PartButton 
          partKey="fr_fender" 
          className="top-11 right-4 w-16 h-24 rounded-tr-3xl rounded-br-sm" 
          label="Sağ Ön Çamurluk"
        />

        {/* FR Door */}
        <PartButton 
          partKey="fr_door" 
          className="top-36 right-4 w-16 h-32 rounded-r-sm border-t-0 border-b-0 border-r border-l-0 my-0.5" 
          label="Sağ Ön Kapı"
        />

        {/* RR Door */}
        <PartButton 
          partKey="rr_door" 
          className="bottom-36 right-4 w-16 h-32 rounded-r-sm border-t-0 border-b-0 border-r border-l-0 my-0.5" 
          label="Sağ Arka Kapı"
        />

        {/* RR Fender */}
        <PartButton 
          partKey="rr_fender" 
          className="bottom-11 right-4 w-16 h-24 rounded-br-3xl rounded-tr-sm" 
          label="Sağ Arka Çamurluk"
        />

      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-4 gap-2 w-full max-w-sm">
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded bg-slate-700 border border-slate-500"></div>
          <span className="text-[10px] text-slate-400">Orijinal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded bg-yellow-500 border border-yellow-300 flex items-center justify-center text-xs font-bold text-black">L</div>
          <span className="text-[10px] text-slate-400">Lokal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded bg-purple-600 border border-purple-400 flex items-center justify-center text-xs font-bold text-white">B</div>
          <span className="text-[10px] text-slate-400">Boyalı</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded bg-red-600 border border-red-400 flex items-center justify-center text-xs font-bold text-white">D</div>
          <span className="text-[10px] text-slate-400">Değişen</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">Parçalara dokunarak durumunu değiştirin.</p>
    </div>
  );
};

export default CarBodySelector;
