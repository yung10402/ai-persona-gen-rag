import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { translated: null, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const { text } = await req.json();

    const prompt = `
Translate the following text to Korean. Keep the style natural and professional.
Text: """${text}"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const translated = completion.choices[0].message?.content ?? text;

    return NextResponse.json({ translated });
  } catch (err) {
    console.error("Translate API Error:", err);
    return NextResponse.json(
      {
        translated: null,
        error: "Translation failed",
      },
      { status: 500 }
    );
  }
}