type SectionStatusProps = {
    leftText: string;
    rightText: string;
    className?: string;
};

export function SectionStatus({ leftText, rightText, className = "" }: SectionStatusProps) {
    return (
        <div
            className={`flex items-center justify-between text-[10px] font-semibold tracking-[0.18em] text-[#7ea3ce] uppercase ${className}`.trim()}
        >
            <p>{leftText}</p>
            <p>{rightText}</p>
        </div>
    );
}
