import { useState } from "react";
import { useAnswerTrivia, useGetTrivia, type TriviaResult } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { useInvalidate, useProfile } from "@/hooks/use-personal";
import { SignInPrompt, ErrorState } from "@/components/bw";
import { cn } from "@/lib/utils";

export function TriviaCard() {
  const q = useGetTrivia();
  const { isSignedIn, profile } = useProfile();
  const answer = useAnswerTrivia();
  const invalidate = useInvalidate();
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<TriviaResult | null>(null);
  const t = q.data;
  const todayScore = t ? profile?.triviaScores.find((s) => s.date === t.date) : undefined;
  const history = [...(profile?.triviaScores ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const correctCount = (profile?.triviaScores ?? []).filter((s) => s.correct).length;

  const submit = (i: number) => {
    if (!t || result || answer.isPending) return;
    setPicked(i);
    answer.mutate({ data: { id: t.id, answer: i } }, {
      onSuccess: (r) => { setResult(r); invalidate(["profile"]); },
      onError: () => setPicked(null),
    });
  };

  return (
    <section className="hud-corner rounded-lg border border-card-border bg-card p-5" data-testid="card-trivia">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Brain className="h-5 w-5 text-cyan-300" /> Daily trivia</h2>
        {t && <span className="font-mono text-xs text-muted-foreground">{t.date}</span>}
      </div>
      {q.isLoading && <div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}</div>}
      {q.isError && <div className="mt-4"><ErrorState onRetry={() => q.refetch()} what="trivia" /></div>}
      {t && (
        <>
          <p className="mt-3 font-semibold" data-testid="text-trivia-question">{t.question}</p>
          <div className="mt-3 grid gap-2">
            {t.options.map((o, i) => {
              const isCorrect = result && result.correctAnswer === i;
              const isWrongPick = result && picked === i && !result.correct;
              return (
                <button key={i} type="button" disabled={!isSignedIn || !!result || !!todayScore || answer.isPending}
                  onClick={() => submit(i)} data-testid={`button-trivia-option-${i}`}
                  className={cn("flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-all",
                    "border-border hover:enabled:border-primary/60 hover:enabled:translate-x-0.5 disabled:cursor-default",
                    isCorrect && "border-green-500/70 bg-green-500/15",
                    isWrongPick && "shake border-red-500/70 bg-red-500/15")}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-muted font-mono text-xs">{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0">{o}</span>
                </button>
              );
            })}
          </div>
          {result && (
            <div className={cn("rise mt-3 rounded-md p-3 text-sm", result.correct ? "bg-green-500/10 text-green-200" : "bg-red-500/10 text-red-200")} data-testid="text-trivia-result">
              <p className="flex items-center gap-1.5 font-bold">
                {result.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {result.correct ? "Correct. Logged to your history." : `Not quite. Answer: ${String.fromCharCode(65 + result.correctAnswer)}. Logged to your history.`}
              </p>
              <p className="mt-1 text-foreground/80">{result.explanation}</p>
            </div>
          )}
          {!result && todayScore && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="text-trivia-done">
              Already answered today: {todayScore.correct ? "correct" : "incorrect"}. Come back tomorrow.
            </p>
          )}
          {answer.isError && <p className="mt-2 text-sm text-red-300">Could not submit that answer. Try again.</p>}
          {!isSignedIn && <div className="mt-3"><SignInPrompt action="answer and track your trivia score" /></div>}
        </>
      )}
      {isSignedIn && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground" data-testid="text-trivia-score">
            Score history: <span className="font-mono text-foreground">{correctCount}/{profile?.triviaScores.length ?? 0}</span> correct
          </p>
          {history.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {history.map((s) => (
                <span key={s.date} title={`${s.date}: ${s.correct ? "correct" : "wrong"}`}
                  className={cn("h-4 w-4 rounded-sm", s.correct ? "bg-green-500" : "bg-red-500/70")} />
              ))}
            </div>
          ) : <p className="mt-1 text-xs text-muted-foreground">No answers yet.</p>}
        </div>
      )}
    </section>
  );
}
