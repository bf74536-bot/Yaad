import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { question, context, lang } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const langName =
      lang === 'hi'
        ? 'Hindi (Devanagari script)'
        : lang === 'te'
          ? 'Telugu (Telugu script)'
          : lang === 'hinglish'
            ? 'Hinglish (Hindi-English mix in Roman script)'
            : 'English';

    const contextText = context && context.trim().length > 0
      ? context.slice(0, 50000)
      : 'NO CONTEXT AVAILABLE';

    const prompt = `You are YAAD, an AI Voice Memory Assistant for Indian students. Answer ONLY from the CONTEXT provided below. If the answer is not found in the context, reply exactly: "Yaad mein yeh nahi hai, please upload notes".

CONTEXT:
${contextText}

QUESTION: ${question}

Instructions:
- Reply in ${langName}.
- If Hinglish selected, reply in natural Hinglish mix (Roman script Hindi + English).
- Keep answers concise but informative.
- If you reference information from the context, add citation like [Source: filename] at the end.
- If no context is available, say: "Yaad mein yeh nahi hai, please upload notes"
- Do NOT make up information outside the context.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
