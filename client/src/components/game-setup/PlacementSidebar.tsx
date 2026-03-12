import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { PlacedShip } from "@/types/game";
import type { ShipInstance } from "@/utils/placementUtils";
import { instanceKey } from "@/utils/placementUtils";

interface PlacementSidebarProps {
    shipInstances: ShipInstance[];
    placementsByInstanceKey: Map<string, PlacedShip>;
    selectedInstanceKey: string | null;
    onSelectInstance: (key: string) => void;
    onRemovePlaced: (definitionId: string, instanceIndex: number) => void;
    onRandomPlace: () => void;
    onClearBoard: () => void;
}

export function PlacementSidebar({
    shipInstances,
    placementsByInstanceKey,
    selectedInstanceKey,
    onSelectInstance,
    onRemovePlaced,
    onRandomPlace,
    onClearBoard,
}: PlacementSidebarProps) {
    const { t } = useTranslation();
    return (
        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-white/40 bg-white/35 p-3">
            <p className="text-xs font-black uppercase tracking-wider text-[#1c3658]">
                {t("gameSetup.placement.shipInstances")}
            </p>

            <div className="themed-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {shipInstances.map((instance) => {
                    const key = instanceKey(
                        instance.definitionId,
                        instance.instanceIndex,
                    );
                    const placement = placementsByInstanceKey.get(key);
                    const selected = selectedInstanceKey === key;

                    return (
                        <div
                            key={key}
                            className={`rounded-xl border p-2 text-xs ${
                                selected
                                    ? "border-[#3f77b2] bg-[#3f77b2]/10"
                                    : "border-[#b8d9f0] bg-white/65"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelectInstance(key)}
                                className="w-full text-left"
                            >
                                <p className="font-bold text-[#1f3b5b]">
                                    {instance.name} #
                                    {instance.instanceIndex + 1}
                                </p>
                                <p className="text-[#5f7f9f]">
                                    {t("gameSetup.placement.size")} {instance.size}{" "}
                                    {placement ? t("gameSetup.placement.placed") : t("gameSetup.placement.notPlaced")}
                                </p>
                            </button>

                            {placement && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemovePlaced(
                                            instance.definitionId,
                                            instance.instanceIndex,
                                        )
                                    }
                                    className="mt-2 rounded-md border border-[#c67e7e] px-2 py-1 text-[11px] font-bold text-[#8f2f2f] hover:bg-[#ffeaea]"
                                >
                                    {t("gameSetup.placement.remove")}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Button
                    onClick={onRandomPlace}
                    className="h-9 rounded-xl text-[11px] tracking-normal"
                >
                    {t("gameSetup.placement.random")}
                </Button>
                <Button
                    onClick={onClearBoard}
                    className="h-9 rounded-xl border-[#c67e7e] text-[11px] tracking-normal text-[#8f2f2f] hover:bg-[#ffeaea]"
                >
                    {t("gameSetup.placement.clear")}
                </Button>
            </div>
        </div>
    );
}
