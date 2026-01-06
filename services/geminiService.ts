
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractGnreData(base64Image: string): Promise<ExtractionResult[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this image of a GNRE (Guia Nacional de Recolhimento de Tributos Estaduais) payment guide page.
    Each page contains EXACTLY ONE main payment guide. 
    Extract the following details from the document:
    - linhaDigitavel: The 48-digit barcode sequence. Return only the numbers.
    - valor: The total value to be paid (Total a Recolher).
    - vencimento: The due date (Data de Vencimento) in format DD/MM/YYYY.
    - uf: The destination state (UF Favorecida), usually a 2-letter code like DF, SE, MG, etc.
    
    Ensure you capture the primary guide information accurately. Return as a list of one item.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            guias: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  linhaDigitavel: {
                    type: Type.STRING,
                    description: 'The 48-digit barcode sequence, digits only.',
                  },
                  valor: {
                    type: Type.NUMBER,
                    description: 'The total value.',
                  },
                  vencimento: {
                    type: Type.STRING,
                    description: 'The due date in DD/MM/YYYY format.',
                  },
                  uf: {
                    type: Type.STRING,
                    description: 'The 2-letter state code.',
                  },
                },
                required: ["linhaDigitavel", "valor", "vencimento", "uf"],
              },
            },
          },
          required: ["guias"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"guias":[]}');
    
    // Clean and validate
    return (result.guias || []).map((g: any) => ({
      ...g,
      linhaDigitavel: String(g.linhaDigitavel).replace(/\D/g, ""),
      uf: String(g.uf).toUpperCase().slice(0, 2)
    }));
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Falha na extração de dados da página.");
  }
}
