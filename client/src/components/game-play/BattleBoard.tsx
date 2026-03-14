import type { ComponentProps } from "react";
import { Board } from "@/components/board/Board";

interface BattleBoardProps extends ComponentProps<typeof Board> {
    turnLabel: string;
    title: string;
    subtitle: string;
}

export function BattleBoard({
    turnLabel,
    title,
    subtitle,
    ...boardProps
}: BattleBoardProps) {
    return (
        <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-end justify-between gap-3 px-1">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6e86a1]">
                        {turnLabel}
                    </p>
                    <h2 className="mt-1 text-2xl font-black italic text-[#173251]">
                        {title}
                    </h2>
                </div>
                <p className="text-sm font-semibold text-[#58708d]">
                    {subtitle}
                </p>
            </div>

            <Board {...boardProps} />
        </div>
    );
}
