export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { photos } = req.body;

  if (!photos || photos.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 fotos' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clave de API no configurada' });
  }

  const parts = [
    ...photos.map((photo, i) => ({
      inline_data: {
        mime_type: photo.type || 'image/jpeg',
        data: photo.src.split(',')[1]
      }
    })),
    {
      text: `Analiza estas ${photos.length} fotos de personas y elige cuál es la mejor estéticamente. 
      
Responde SOLO con un JSON válido, sin texto extra ni backticks, con este formato exacto:
{"winner": 0, "reason": "explicación breve y amable en español de por qué esta foto es la mejor (2-3 frases)", "scores": [{"score": 85, "label": "buena luz"}, {"score": 72, "label": "algo movida"}, ...]}

El campo "winner" es el índice (empezando por 0) de la mejor foto.
El campo "scores" tiene una entrada por cada foto en el mismo orden, con una puntuación del 1 al 100 y una etiqueta corta con el punto fuerte o débil principal.`
    }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error de Gemini');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error al analizar las fotos: ' + err.message });
  }
}
