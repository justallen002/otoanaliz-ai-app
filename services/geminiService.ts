import { GoogleGenAI, Type } from "@google/genai";
import { CarAnalysis, PriceEstimate, NearbyPlace } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Image Analysis (Uses Vision Model)
export const analyzeCarImage = async (base64Images: string[]): Promise<CarAnalysis> => {
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    You are an elite automotive expert with encyclopedic knowledge of all vehicle makes, models, generations, and rare editions (including JDM, Classics, Supercars, and specific trims).
    
    Analyze the provided car images (there may be one or multiple angles) with extreme precision. Combine findings from all images:
    1. **Identification**: 
       - Identify the Make, Model, Sub-model, and Generation specifically.
    2. **Condition**: 
       - Analyze visible cosmetic condition across all provided angles.
    3. **Rarity**: 
       - Determine if it is a rare, limited edition, or collector's item.

    Return the response in JSON format.
    IMPORTANT: The values for 'visualCondition', 'color', and 'identifiedDamages' MUST be in Turkish language.
    The 'confidence' value MUST be an integer between 0 and 100.

    {
      "make": "string",
      "model": "string",
      "generation": "string",
      "color": "string",
      "visualCondition": "string",
      "identifiedDamages": ["string"],
      "isRare": boolean,
      "confidence": number
    }
  `;

  try {
    const imageParts = base64Images.map(img => ({
      inlineData: { mimeType: "image/jpeg", data: img }
    }));

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            make: { type: Type.STRING },
            model: { type: Type.STRING },
            generation: { type: Type.STRING },
            color: { type: Type.STRING },
            visualCondition: { type: Type.STRING },
            identifiedDamages: { type: Type.ARRAY, items: { type: Type.STRING } },
            isRare: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
          },
          required: ["make", "model", "visualCondition", "identifiedDamages", "isRare", "confidence"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as CarAnalysis;

  } catch (error) {
    console.error("Image analysis failed:", error);
    throw new Error("Araç fotoğrafları analiz edilemedi.");
  }
};

// 2. Price Estimation (Uses Search Grounding)
export const estimateCarPrice = async (
  analysis: CarAnalysis, 
  year: number, 
  km: number
): Promise<PriceEstimate> => {
  const modelId = "gemini-3-flash-preview"; 
  
  const prompt = `
    You are a strict and realistic car appraiser in Turkey.
    
    CAR DETAILS:
    - Make: ${analysis.make}
    - Model: ${analysis.model}
    - Year: ${year}
    - Mileage: ${km} km
    - Condition: ${analysis.visualCondition}

    TASK:
    1. Use Google Search to find current listing prices in Turkey (sahibinden, arabam.com, etc).
    2. Exclude "Ağır Hasar Kayıtlı" listings.
    3. Determine the minPrice, maxPrice, and avgPrice based on real market listings.
    
    CRITICAL PRICING RULES FOR TURKISH MARKET (STRICT ADJUSTMENTS):
    - MILEAGE SENSITIVITY: Kilometre (Mileage) is the absolute most critical value factor. A car with ~95,000 km is worth significantly more than a 350,000 km version (approx 400k-500k TL difference in premium segments).
    - LOWERING THE HIGH END: Listing prices on sites like Sahibinden are often optimistic "wish prices." Be very careful with the "maxPrice." Do not use the highest outlier price found. Lower the high end of the range to reflect a price that would actually sell.
    - RANGE PRECISION: Keep the price gap (min-max) tight. Avoid wide ranges like 3.5M - 5.5M unless absolutely necessary. Aim for a more realistic distribution (e.g., if avg is 1.5M, a tight range might be 1.4M - 1.6M).
    - REALISTIC TRANSACTION DISCOUNT: Apply a conservative downward adjustment (approx. 4-5%) to all raw search results to account for "ilan şişirmesi" (inflated listing prices).
    
    4. Calculate "Pazarlık Payı" (bargaining margin). In Turkey, this is usually 2% to 5% of the listing price.
    5. Return a realistic transaction price range and a specific bargaining amount.

    Return JSON:
    {
      "minPrice": number,
      "maxPrice": number,
      "avgPrice": number,
      "currency": "TL",
      "bargainingMargin": number,
      "reasoning": "string (Turkish, explain clearly how you applied the strict pricing logic, mileage sensitivity, and why the high end was capped to remain realistic)",
      "marketTrend": "rising" | "stable" | "falling"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            minPrice: { type: Type.NUMBER },
            maxPrice: { type: Type.NUMBER },
            avgPrice: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            bargainingMargin: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            marketTrend: { type: Type.STRING, enum: ["rising", "stable", "falling"] }
          },
          required: ["minPrice", "maxPrice", "avgPrice", "currency", "bargainingMargin", "reasoning", "marketTrend"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as PriceEstimate;

  } catch (error) {
    console.error("Price estimation failed:", error);
    throw new Error("Fiyat analizi yapılamadı.");
  }
};

export const findNearbyServices = async (lat: number, lng: number, query: string): Promise<string> => {
  const modelId = "gemini-2.5-flash"; 
  const prompt = `Find 3 top-rated "${query}" near the provided location. List them with names, addresses and snippets. Format: Turkish Markdown.`;
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { tools: [{ googleMaps: {} }], toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } }
    });
    return response.text || "Yakınlarda servis bulunamadı.";
  } catch (error) { return "Harita servisine şu an ulaşılamıyor."; }
};

export const chatWithExpert = async (history: any[], message: string): Promise<string> => {
  const modelId = "gemini-3-pro-preview";
  try {
    const chatSession = ai.chats.create({
      model: modelId,
      history: history,
      config: { systemInstruction: "You are a helpful automotive expert assistant for the OtoAnaliz app in Turkey. Answer in Turkish." }
    });
    const result = await chatSession.sendMessage({ message });
    return result.text || "Anlayamadım.";
  } catch (error) { return "Üzgünüm, şu an cevap veremiyorum."; }
}