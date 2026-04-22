import { corsHeaders } from '../_shared/cors.ts';

// Expects env var GROQ_API_KEY (set via Supabase secrets).
// Uses Llama 3.3 70B via Groq's OpenAI-compatible API.
//
// Body: {
//   topic: string,
//   subject_name?: string,
//   count: number (1..10),
//   difficulty: 'easy' | 'medium' | 'hard',
//   bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create',
//   type?: 'mcq' | 'true_false',
//   marks_per_question?: number
// }
//
// Returns: { questions: [...] }

interface GenRequest {
  topic: string;
  subject_name?: string;
  count?: number;
  difficulty?: string;
  bloom_level?: string;
  type?: 'mcq' | 'true_false';
  marks_per_question?: number;
}

interface GenOption { key: string; text: string; }

interface GenQuestion {
  text: string;
  type: 'mcq' | 'true_false';
  options?: GenOption[];
  correct_answer: string;
  marks: number;
  explanation: string;
  topic: string;
  difficulty: string;
  bloom_level: string;
}

const MODEL = 'llama-3.3-70b-versatile';

function buildPrompt(input: GenRequest): string {
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const type = input.type ?? 'mcq';
  const subject = input.subject_name ? `the subject "${input.subject_name}"` : 'the topic';
  const bloom = input.bloom_level ?? 'understand';
  const difficulty = input.difficulty ?? 'medium';

  if (type === 'true_false') {
    return `Generate ${count} True/False questions for ${subject}, on the topic "${input.topic}".
Difficulty: ${difficulty}. Bloom level: ${bloom}.

Respond with ONLY valid JSON in this exact shape, no markdown, no commentary:
{
  "questions": [
    {
      "text": "statement that can be judged true or false",
      "correct_answer": "true",
      "explanation": "1-2 sentence justification"
    }
  ]
}`;
  }

  return `Generate ${count} high-quality multiple-choice questions for ${subject}, on the topic "${input.topic}".
Difficulty: ${difficulty}. Bloom's taxonomy level: ${bloom}.
Each question must have exactly 4 options labelled A, B, C, D and exactly one correct option.

Respond with ONLY valid JSON in this exact shape, no markdown, no commentary, no trailing text:
{
  "questions": [
    {
      "text": "question text",
      "options": [
        {"key": "A", "text": "option A"},
        {"key": "B", "text": "option B"},
        {"key": "C", "text": "option C"},
        {"key": "D", "text": "option D"}
      ],
      "correct_answer": "B",
      "explanation": "why the correct answer is right"
    }
  ]
}`;
}

function extractJson(raw: string): unknown {
  // Strip markdown fences if the model ignored our instruction
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  return JSON.parse(candidate.trim());
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert exam setter. Always respond with strictly valid JSON matching the requested schema. No prose, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return text;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GROQ_API_KEY is not set. Add it as a Supabase secret to enable AI question generation.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as GenRequest;
    if (!body.topic || typeof body.topic !== 'string') {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(body);
    const raw = await callGroq(apiKey, prompt);

    let parsed: { questions?: Array<Partial<GenQuestion>> };
    try {
      parsed = extractJson(raw) as { questions?: Array<Partial<GenQuestion>> };
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const marks = body.marks_per_question ?? 1;
    const type = body.type ?? 'mcq';
    const questions: GenQuestion[] = (parsed.questions || []).map((q) => ({
      text: q.text || '',
      type,
      options: type === 'mcq' ? q.options : undefined,
      correct_answer: String(q.correct_answer || ''),
      marks,
      explanation: q.explanation || '',
      topic: body.topic,
      difficulty: body.difficulty ?? 'medium',
      bloom_level: body.bloom_level ?? 'understand',
    }));

    return new Response(JSON.stringify({ questions, model: MODEL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI question generator error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
