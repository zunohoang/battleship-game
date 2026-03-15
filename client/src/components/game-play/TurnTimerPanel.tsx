interface TurnTimerPanelProps {
    turnLabel: string;
    turnTitle: string;
    turnHint: string;
    timerLabel: string;
    timerHint: string;
    secondsLeft: number;
    timerClass: string;
}

export function TurnTimerPanel({
    turnLabel,
    turnTitle,
    turnHint,
    timerLabel,
    timerHint,
    secondsLeft,
    timerClass,
}: TurnTimerPanelProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-1">
            <div className="rounded-3xl border border-[#91c4e5]/70 bg-white/65 px-5 py-4 shadow-[0_18px_60px_rgba(28,54,88,0.08)]">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6e86a1]">
                    {turnLabel}
                </p>
                <h2 className="mt-2 text-xl font-black text-[#173251]">
                    {turnTitle}
                </h2>
                <p className="mt-1 text-sm text-[#5f7591]">{turnHint}</p>
            </div>

            <div
                className={`rounded-3xl border px-5 py-4 text-center shadow-[0_18px_60px_rgba(28,54,88,0.08)] ${timerClass}`}
            >
                <p className="text-[11px] font-black uppercase tracking-[0.28em]">
                    {timerLabel}
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums">
                    {secondsLeft}s
                </p>
                <p className="mt-1 text-xs opacity-80">{timerHint}</p>
            </div>
        </div>
    );
}
