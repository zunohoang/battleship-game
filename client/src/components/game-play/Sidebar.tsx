import type { ReactNode } from "react";
import { FleetPanel, type FleetStatusItem } from "@/components/game-play/FleetPanel";

interface SidebarProps {
    title: string;
    items: FleetStatusItem[];
    turnPanel?: ReactNode;
}

export function Sidebar({ title, items, turnPanel }: SidebarProps) {
    return (
        <div className="flex flex-col gap-3">
            <FleetPanel title={title} items={items} />
            {turnPanel ?? null}
        </div>
    );
}
