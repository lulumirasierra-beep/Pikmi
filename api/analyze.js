export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { photos } = req.body;

  if (!photos || photos.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 fotos' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clave de API no configurada' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pikmi.vercel.app',
        'X-Title': 'Pikmi'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free',
        messages: [{
          role: 'user',
          content: [
            ...photos.map(p => ({
              type: 'image_url',
              image_url: { url: p.src }
            })),
            {
              type: 'text',
              text: `Analiza estas ${photos.length} fotos de personas y elige cuál es la mejor estéticamente. Responde SOLO con un JSON válido sin backticks ni texto extra: {"winner":0,"reason":"explicación breve y amable en español de por qué esta foto es la mejor (2-3 frases)","scores":[{"score":85,"label":"buena luz"},{"score":72,"label":"algo movida"}]} El campo winner es el índice 0-based de la mejor foto. scores tiene una entrada por foto con puntuación 1-100 y etiqueta corta.`
            }
          ]
        }],
        max_tokens: 512
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error de OpenRouter');
    }

    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error al analizar: ' + err.message });
  }
}
