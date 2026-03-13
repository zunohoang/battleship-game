type SectionStatusProps = {
    leftText: string;
    rightText: string;
    className?: string;
};

export function SectionStatus({
  leftText,
  rightText,
  className = '',
}: SectionStatusProps) {
  return (
    <div
      className={`ui-statusbar rounded-sm px-4 py-3 ${className}`}
    >
      <div className='relative z-10 flex items-center justify-between gap-4 text-[10px] font-semibold tracking-[0.22em] text-(--text-subtle) uppercase'>
        <p>{leftText}</p>
        <p>{rightText}</p>
      </div>
    </div>
  );
}
