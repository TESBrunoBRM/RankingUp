import { Alert } from 'react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''; // Míralo en Google AI Studio

export interface AnalyzedFood {
  food_name: string;
  serving_description: string;
  servir_tamaño: number;
}

export const aiAnalyzerService = {
  async analyzeImageB64(base64Image: string): Promise<AnalyzedFood[]> {
    if (!GEMINI_API_KEY) {
      throw new Error("No has configurado EXPO_PUBLIC_GEMINI_API_KEY en tu .env. Obtén una gratis en Google AI Studio para usar la IA.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
Analiza la siguiente imagen de comida. Devuelve SOLO un JSON puro que contenga un arreglo de objetos.
El formato exacto que debes devolver es:
[
  {
    "food_name": "nombre genérico del alimento en español (ej. manzana, huevo, pollo, arroz)",
    "serving_description": "descripción de la porción en español (ej. unidad, gramos, rebanada, plato, completo)",
    "servir_tamaño": número de acuerdo a la porción (ej. 1, 100, 2)
  }
]
No añadas texto adicional, ni bloques \`\`\`json. Solo el array válido en JSON.
Si no puedes detectar comida clara en la foto, devuelve un arreglo vacío [].
    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (!response.ok) {
         console.error('Gemini API Error:', data);
         throw new Error(data.error?.message || "Error al comunicarse con la IA.");
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
         throw new Error("La IA devolvió una respuesta vacía.");
      }

      // Clean the response if the model added markdown blocks despite instructions
      const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(cleanedText);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (e: any) {
      console.error('AI Analyzing Error:', e);
      throw new Error(e.message || "No se pudo procesar la imagen con Inteligencia Artificial.");
    }
  }
};
