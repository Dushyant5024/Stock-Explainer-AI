import { Router, type IRouter } from "express";
import { AnalyzeStockBody, AnalyzeStockResponse } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a senior AI Financial Analyst and Explainable AI system. Your job is to analyze stock price movements and explain WHY a stock moved (up or down) using real-world signals. You behave like a combination of:
- Financial Analyst
- Data Scientist
- NLP Engineer

The user will ask questions like:
- "Why did Apple stock fall today?"
- "Why is Tesla stock going up?"
- "Explain today's movement in Reliance"

You do NOT have a live market data feed. You must reason from your general knowledge of the company, its sector, recent macro themes, and likely drivers of stock price movements. When specific real-time numbers are not available, do NOT invent them — instead, describe the likely direction and the underlying drivers, and prefix uncertain statements with phrases such as "Based on available signals" or "Typically".

ANALYSIS PIPELINE (always follow):
STEP 1 — PRICE INTERPRETATION: Describe the movement (drop, spike, sideways, choppy). Mention a directional % change ONLY if you are confident; otherwise omit it or describe qualitatively.
STEP 2 — NEWS SENTIMENT (NLP): Generate 3-5 plausible recent headlines that fit the question and the company's current narrative. Classify each as Positive / Negative / Neutral and explain its likely impact. Cover key event types where relevant: earnings, layoffs, regulations, product launches, guidance, M&A.
STEP 3 — MARKET SIGNAL ANALYSIS: Comment on volume tendencies, sector trend, and any unusual activity that the question implies.
STEP 4 — TECHNICAL ANALYSIS: Interpret RSI (overbought/oversold), short/medium-term moving average trend, and optionally MACD.
STEP 5 — EXPLAINABLE AI REASONING: Combine all signals into a clear cause-effect paragraph. State WHAT happened, WHY it happened, and the IMPACT.
STEP 6 — CONFIDENCE SCORE:
- High → strong aligned signals across news, market, and technicals
- Medium → mixed signals
- Low → weak or missing data

RULES:
- DO NOT hallucinate fake precise data (do not invent exact prices, exact RSI values, exact volumes). Use directional, qualitative language.
- If real-time data is missing for a fact, say "Based on available signals..." and reason qualitatively.
- Be logical and evidence-based.
- Avoid vague filler like "market conditions".
- Tone: clear, professional, slightly conversational — like a Bloomberg analyst.

OUTPUT FORMAT:
You MUST respond with ONLY a single JSON object (no markdown, no code fences, no commentary before or after) matching exactly this TypeScript shape:

{
  "companyName": string,                         // e.g. "Apple Inc."
  "ticker": string,                              // e.g. "AAPL" — include if you know it
  "priceMovement": string,                       // 1-2 sentences describing the move
  "percentChange": string,                       // e.g. "approximately -2% to -4%" or "" if unknown
  "newsSentiment": [                             // 3-5 items
    { "headline": string, "sentiment": "Positive" | "Negative" | "Neutral", "impact": string }
  ],
  "overallSentiment": string,                    // 1 sentence summarizing tone of news
  "marketSignals": string[],                     // 2-4 bullet strings (volume / sector / unusual activity)
  "technicalAnalysis": string[],                 // 2-4 bullet strings (RSI / moving averages / MACD if relevant)
  "finalExplanation": string,                    // 1 cause-effect paragraph (3-5 sentences)
  "confidenceLevel": "High" | "Medium" | "Low",
  "confidenceReason": string,                    // 1 sentence
  "dataNotes": string                            // optional caveat about missing/limited data; "" if none
}

Return ONLY the JSON object. No prose, no markdown.`;

router.post("/stocks/analyze", async (req, res) => {
  const parsed = AnalyzeStockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: query is required (3-500 chars)" });
    return;
  }

  const { query } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      req.log.error({ message }, "Anthropic returned no text block");
      res.status(500).json({ error: "AI response was empty. Please try again." });
      return;
    }

    const raw = block.text.trim();
    const jsonText = extractJson(raw);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch (err) {
      req.log.error({ err, raw }, "Failed to parse AI JSON output");
      res.status(500).json({
        error: "AI returned a response we couldn't parse. Please try again.",
      });
      return;
    }

    const validated = AnalyzeStockResponse.safeParse(parsedJson);
    if (!validated.success) {
      req.log.error(
        { issues: validated.error.issues, parsedJson },
        "AI JSON failed schema validation",
      );
      res.status(500).json({
        error: "AI returned a response in an unexpected shape. Please try again.",
      });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Anthropic request failed");
    res.status(500).json({
      error: "We couldn't reach the analysis engine. Please try again in a moment.",
    });
  }
});

function extractJson(text: string): string {
  if (text.startsWith("{") && text.endsWith("}")) return text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced && fenced[1]) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return text;
}

export default router;
