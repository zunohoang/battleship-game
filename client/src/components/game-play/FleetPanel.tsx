export interface FleetStatusItem {
    key: string;
    name: string;
    size: number;
    hits: number;
    destroyed: boolean;
}

interface FleetPanelProps {
    title: string;
    items: FleetStatusItem[];
}

export function FleetPanel({ title, items }: FleetPanelProps) {
    return (
        <div className="rounded-3xl border border-white/45 bg-white/38 p-4 xl:sticky xl:top-4">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b83a0]">
                {title}
            </p>
            <div className="mt-3 grid gap-2">
                {items.map((item) => (
                    <div
                        key={item.key}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                            item.destroyed
                                ? "border-red-300/80 bg-red-50/90 text-[#8c2e2e]"
                                : "border-[#b8d9f0] bg-white/80 text-[#24425f]"
                        }`}
                    >
                        <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-xs opacity-75">
                                {item.hits}/{item.size}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                item.destroyed
                                    ? "bg-red-100 text-[#8c2e2e]"
                                    : "bg-[#e7f3fb] text-[#2b5e8f]"
                            }`}
                        >
                            {item.destroyed ? "Destroyed" : `Size ${item.size}`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
