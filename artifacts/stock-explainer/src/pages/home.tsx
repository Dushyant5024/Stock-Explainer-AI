import { useState } from "react";
import { useAnalyzeStock } from "@workspace/api-client-react";
import { Search, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const SUGGESTIONS = [
  "Why did Apple stock fall today?",
  "Why is Tesla going up?",
  "Explain today's movement in NVIDIA",
  "What caused the drop in Microsoft?",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const mutation = useAnalyzeStock();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    mutation.mutate({ data: { query } });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    mutation.mutate({ data: { query: suggestion } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <header className="w-full max-w-4xl px-6 py-12 flex flex-col items-center text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Stock Explanation AI
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Professional, AI-generated analysis of daily stock movements. Ask a question to get a structured analyst report.
        </p>
      </header>

      <main className="w-full max-w-3xl px-6 pb-20 flex-1 flex flex-col gap-8">
        <form onSubmit={handleSubmit} className="relative w-full flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why did Tesla stock go up today?"
            className="w-full h-16 pl-12 pr-32 text-lg bg-card border-border rounded-xl shadow-sm focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            disabled={!query.trim() || mutation.isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 rounded-lg font-medium"
          >
            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
          </Button>
        </form>

        {!mutation.data && !mutation.isPending && !mutation.isError && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Suggested Queries</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full transition-colors border border-border/50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {mutation.isPending && (
          <div className="w-full mt-8 animate-pulse flex flex-col gap-4">
            <div className="h-48 bg-card rounded-xl border border-border"></div>
            <div className="h-32 bg-card rounded-xl border border-border"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        )}

        {mutation.isError && (
          <Card className="w-full border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6 flex items-start gap-4 text-destructive-foreground">
              <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-destructive">Analysis Failed</h3>
                <p className="text-destructive/80 mt-1">
                  {mutation.error?.error || "An unexpected error occurred while analyzing the stock."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {mutation.data && !mutation.isPending && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card className="border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-secondary/30 pb-6 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold flex items-baseline gap-3">
                      {mutation.data.companyName}
                      {mutation.data.ticker && (
                        <span className="text-xl text-muted-foreground font-medium">
                          {mutation.data.ticker}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Analyst Report
                    </CardDescription>
                  </div>
                  {mutation.data.percentChange && (
                    <div className={`text-2xl font-bold flex items-center gap-2 ${
                      mutation.data.percentChange.startsWith("-") 
                        ? "text-destructive" 
                        : mutation.data.percentChange.startsWith("+") || parseFloat(mutation.data.percentChange) > 0
                          ? "text-green-500"
                          : "text-muted-foreground"
                    }`}>
                      {mutation.data.percentChange.startsWith("-") ? (
                        <TrendingDown className="w-6 h-6" />
                      ) : mutation.data.percentChange.startsWith("+") || parseFloat(mutation.data.percentChange) > 0 ? (
                        <TrendingUp className="w-6 h-6" />
                      ) : (
                        <Minus className="w-6 h-6" />
                      )}
                      {mutation.data.percentChange}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 space-y-8">
                  {/* Price Movement */}
                  <section>
                    <h3 className="text-lg font-semibold text-primary/80 mb-3 uppercase tracking-wider text-sm">Price Movement</h3>
                    <p className="text-foreground leading-relaxed text-lg">{mutation.data.priceMovement}</p>
                  </section>

                  <Separator />

                  {/* News Sentiment */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-primary/80 uppercase tracking-wider text-sm">News Sentiment</h3>
                      <Badge variant="outline" className="font-mono bg-background">
                        Overall: {mutation.data.overallSentiment}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {mutation.data.newsSentiment.map((news, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-start p-4 rounded-lg bg-secondary/20 border border-border/50">
                          <Badge 
                            className={`shrink-0 w-fit ${
                              news.sentiment === "Positive" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/30" :
                              news.sentiment === "Negative" ? "bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30" :
                              "bg-muted text-muted-foreground"
                            }`}
                            variant="secondary"
                          >
                            {news.sentiment}
                          </Badge>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{news.headline}</p>
                            <p className="text-sm text-muted-foreground">{news.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Market Signals */}
                    <section>
                      <h3 className="text-lg font-semibold text-primary/80 mb-3 uppercase tracking-wider text-sm">Market Signals</h3>
                      <ul className="space-y-2">
                        {mutation.data.marketSignals.map((signal, idx) => (
                          <li key={idx} className="flex gap-2 items-start text-foreground">
                            <span className="text-primary mt-1 shrink-0">•</span>
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Technical Analysis */}
                    <section>
                      <h3 className="text-lg font-semibold text-primary/80 mb-3 uppercase tracking-wider text-sm">Technical Analysis</h3>
                      <ul className="space-y-2">
                        {mutation.data.technicalAnalysis.map((tech, idx) => (
                          <li key={idx} className="flex gap-2 items-start text-foreground">
                            <span className="text-primary mt-1 shrink-0">•</span>
                            <span>{tech}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <Separator />

                  {/* Final Explanation */}
                  <section className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                    <h3 className="text-lg font-semibold text-primary/80 mb-3 uppercase tracking-wider text-sm">Final Explanation</h3>
                    <p className="text-foreground leading-relaxed text-lg">
                      {mutation.data.finalExplanation}
                    </p>
                  </section>

                  {/* Confidence & Notes */}
                  <section className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-primary/80 uppercase tracking-wider text-xs">Confidence Level</h3>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${mutation.data.confidenceLevel === "High" ? "border-green-500/50 text-green-500" :
                              mutation.data.confidenceLevel === "Medium" ? "border-yellow-500/50 text-yellow-500" :
                              "border-destructive/50 text-destructive"}
                          `}
                        >
                          {mutation.data.confidenceLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{mutation.data.confidenceReason}</p>
                    </div>
                    
                    {mutation.data.dataNotes && (
                      <div className="text-sm text-muted-foreground italic max-w-xs text-right">
                        * {mutation.data.dataNotes}
                      </div>
                    )}
                  </section>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center text-sm text-muted-foreground/60">
        Powered by AI — for educational purposes, not financial advice
      </footer>
    </div>
  );
}
