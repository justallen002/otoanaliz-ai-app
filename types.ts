
export interface CarAnalysis {
  make: string;
  model: string;
  generation?: string;
  color: string;
  visualCondition: string;
  identifiedDamages: string[];
  isRare: boolean;
  confidence: number;
}

export interface PriceEstimate {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currency: string;
  reasoning: string;
  marketTrend: 'rising' | 'stable' | 'falling';
  bargainingMargin: number; // Estimated bargaining amount in TL
  comparableListingsSource?: string[];
}

export interface AppraisalState {
  step: 'upload' | 'analyzing_image' | 'details_input' | 'calculating_price' | 'result';
  images: string[];
  analysis: CarAnalysis | null;
  year: number | null;
  km: number | null;
  estimate: PriceEstimate | null;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface NearbyPlace {
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
}

export type PartStatus = 'original' | 'local' | 'painted' | 'changed';

export interface BodyPartsMap {
  [key: string]: PartStatus;
}
