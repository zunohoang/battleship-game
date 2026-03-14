import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BOARD_PRESETS, CONFIG_LIMITS } from "@/constants/gameDefaults";
import { Button } from "@/components/ui/Button";
import { ShipPlacementStage } from "@/components/game-setup/ShipPlacementStage";
import type { GameMode } from "@/types/game";
import { useGameSetupEngine } from "@/hooks/useGameSetupEngine";

type LocationState = { mode?: GameMode };

interface StepPillProps {
    number: number;
    label: string;
    status: "active" | "done" | "upcoming";
}

function StepPill({ number, label, status }: StepPillProps) {
    const pillCls =
        status === "active"
            ? "border-[#3f77b2] bg-[#3f77b2]/85 text-white"
            : status === "done"
              ? "border-[#7dbde0] bg-white/70 text-[#3f77b2]"
              : "border-white/40 bg-white/30 text-[#708aac]";
    const dotCls =
        status === "active"
            ? "bg-white/30 text-white"
            : status === "done"
              ? "bg-[#3f77b2] text-white"
              : "bg-white/30 text-[#708aac]";
    return (
        <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${pillCls}`}
        >
            <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${dotCls}`}
            >
                {status === "done" ? "" : number}
            </span>
            {label}
        </div>
    );
}

export function GameSetupPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const mode = (location.state as LocationState | null)?.mode ?? "bot";

    const {
        step,
        newShipName,
        newShipSize,
        newShipCount,
        state,
        boardConfig,
        ships,
        totalCells,
        boardCells,
        isConfigValid,
        allShipsPlaced,
        setNewShipName,
        setPlacements,
        removeShipDefinition,
        resetConfig,
        handleBoardPreset,
        handleBoardInput,
        handleAddShip,
        handleShipField,
        handleNewShipSizeInput,
        handleNewShipCountInput,
        handleNext,
        handleBackToConfig,
    } = useGameSetupEngine();

    const inputCls =
        "h-9 w-full rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]";
    const labelCls = "grid gap-1 text-xs font-semibold text-[#3d5472]";
    const sectionHeading =
        "text-sm font-black uppercase tracking-widest text-[#1c3658]";

    return (
        <main className="relative h-screen w-screen overflow-hidden p-3 text-[#1e3654]">
            {/* Background */}
            <div
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{
                    backgroundImage:
                        'linear-gradient(to bottom, rgba(228,238,249,0.65), rgba(241,246,252,0.78)), url("/theme-battleship.jpg")',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.26),transparent_55%)]" />

            <section className="mx-auto flex h-full max-w-400 flex-col rounded-2xl border border-white/55 bg-white/18 p-5 backdrop-blur-[2px]">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#708aac]">
                            Game Setup {mode.toUpperCase()}
                        </p>
                        <h1 className="mt-1 truncate text-2xl font-black italic text-[#1c3658]">
                            {step === 1
                                ? t("gameSetup.header.title_fleet")
                                : t("gameSetup.header.title_placement")}
                        </h1>
                    </div>

                    {/* Step pills */}
                    <div className="flex shrink-0 items-center gap-2">
                        <StepPill
                            number={1}
                            label={t("gameSetup.header.step1Label")}
                            status={step > 1 ? "done" : "active"}
                        />
                        <div className="h-px w-6 bg-[#7dbde0]" />
                        <StepPill
                            number={2}
                            label={t("gameSetup.header.step2Label")}
                            status={step === 2 ? "active" : "upcoming"}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/home")}
                        className="shrink-0 cursor-pointer rounded-xl border border-[#7dbde0] px-4 py-2 text-sm font-semibold text-[#3d5472] hover:bg-white/70"
                    >
                        {t("gameSetup.header.back")}
                    </button>
                </div>

                {/* Step content */}
                <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                    {/*  Step 1: Fleet & Map  */}
                    {step === 1 && (
                        <div className=" flex h-full flex-col gap-5 overflow-y-hidden rounded-xl border border-white/40 bg-white/20 p-5">
                            {/* Board size */}
                            <div>
                                <p className={sectionHeading}>
                                    {t("gameSetup.step1.boardSizeTitle")}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {BOARD_PRESETS.map((preset) => {
                                        const active =
                                            boardConfig.rows ===
                                                preset.value.rows &&
                                            boardConfig.cols ===
                                                preset.value.cols;
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() =>
                                                    handleBoardPreset(
                                                        preset.value.rows,
                                                        preset.value.cols,
                                                    )
                                                }
                                                className={`cursor-pointer rounded-xl border px-5 py-2.5 text-sm font-bold transition-colors ${
                                                    active
                                                        ? "border-[#3f77b2] bg-[#3f77b2]/85 text-white"
                                                        : "border-[#7dbde0] bg-white/70 text-[#3d5472] hover:bg-white"
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex gap-4">
                                    <label className={labelCls}>
                                        {t("gameSetup.step1.rowsLabel")}
                                        <input
                                            type="number"
                                            min={CONFIG_LIMITS.board.minRows}
                                            max={CONFIG_LIMITS.board.maxRows}
                                            value={boardConfig.rows}
                                            onChange={(e) =>
                                                handleBoardInput(
                                                    "rows",
                                                    e.target.value,
                                                )
                                            }
                                            className={`${inputCls} w-24`}
                                        />
                                    </label>
                                    <label className={labelCls}>
                                        {t("gameSetup.step1.columnsLabel")}
                                        <input
                                            type="number"
                                            min={CONFIG_LIMITS.board.minCols}
                                            max={CONFIG_LIMITS.board.maxCols}
                                            value={boardConfig.cols}
                                            onChange={(e) =>
                                                handleBoardInput(
                                                    "cols",
                                                    e.target.value,
                                                )
                                            }
                                            className={`${inputCls} w-24`}
                                        />
                                    </label>
                                </div>
                                <p className="mt-2 text-xs text-[#708aac]">
                                    {t("gameSetup.step1.boardInfo", {
                                        rows: boardConfig.rows,
                                        cols: boardConfig.cols,
                                        cells: boardCells,
                                    })}
                                </p>
                            </div>

                            {/* Fleet */}
                            <div className="flex min-h-0 flex-1 flex-col">
                                <p className={sectionHeading}>
                                    {t("gameSetup.step1.fleetTitle")}
                                </p>
                                <p className="mt-1 text-xs text-[#708aac]">
                                    {t("gameSetup.step1.totalCellsInfo", {
                                        used: totalCells,
                                        max: Math.floor(boardCells * 0.5),
                                    })}
                                </p>

                                {ships.length === 0 && (
                                    <p className="mt-3 text-sm text-[#8f2f2f]">
                                        {t("gameSetup.step1.noShips")}
                                    </p>
                                )}

                                <div className="themed-scrollbar mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                                    {ships.map((ship) => (
                                        <div
                                            key={ship.id}
                                            className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_auto] items-end gap-2 rounded-xl border border-[#b8d9f0] bg-white/70 px-4 py-2.5"
                                        >
                                            <label className={labelCls}>
                                                {t("gameSetup.step1.shipName")}
                                                <input
                                                    type="text"
                                                    value={ship.name}
                                                    onChange={(e) =>
                                                        handleShipField(
                                                            ship.id,
                                                            "name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm font-semibold text-[#24425f] outline-none focus:border-[#3f77b2]"
                                                />
                                            </label>
                                            <label className={labelCls}>
                                                {t("gameSetup.step1.size")}
                                                <input
                                                    type="number"
                                                    min={
                                                        CONFIG_LIMITS.ship
                                                            .minSize
                                                    }
                                                    max={
                                                        CONFIG_LIMITS.ship
                                                            .maxSize
                                                    }
                                                    value={ship.size}
                                                    onChange={(e) =>
                                                        handleShipField(
                                                            ship.id,
                                                            "size",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]"
                                                />
                                            </label>
                                            <label className={labelCls}>
                                                {t("gameSetup.step1.count")}
                                                <input
                                                    type="number"
                                                    min={
                                                        CONFIG_LIMITS.ship
                                                            .minCount
                                                    }
                                                    max={
                                                        CONFIG_LIMITS.ship
                                                            .maxCount
                                                    }
                                                    value={ship.count}
                                                    onChange={(e) =>
                                                        handleShipField(
                                                            ship.id,
                                                            "count",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeShipDefinition(
                                                        ship.id,
                                                    )
                                                }
                                                title={t(
                                                    "gameSetup.step1.removeTitle",
                                                )}
                                                className="h-9 min-w-16 cursor-pointer self-end rounded-lg border border-[#c67e7e] px-3 text-sm font-bold text-[#8f2f2f] hover:bg-[#ffeaea]"
                                            >
                                                {t(
                                                    "gameSetup.step1.removeButton",
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {ships.length <
                                    CONFIG_LIMITS.ship.maxShipTypes && (
                                    <div className="mt-3 grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2 rounded-xl border border-dashed border-[#7dbde0] bg-white/40 px-4 py-3">
                                        <label className={labelCls}>
                                            {t("gameSetup.step1.shipName")}
                                            <input
                                                type="text"
                                                placeholder={t(
                                                    "gameSetup.step1.namePlaceholder",
                                                )}
                                                value={newShipName}
                                                onChange={(e) =>
                                                    setNewShipName(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        handleAddShip();
                                                }}
                                                className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]"
                                            />
                                        </label>
                                        <label className={labelCls}>
                                            {t("gameSetup.step1.size")}
                                            <input
                                                type="number"
                                                min={CONFIG_LIMITS.ship.minSize}
                                                max={CONFIG_LIMITS.ship.maxSize}
                                                value={newShipSize}
                                                onChange={(e) =>
                                                    handleNewShipSizeInput(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]"
                                            />
                                        </label>
                                        <label className={labelCls}>
                                            {t("gameSetup.step1.count")}
                                            <input
                                                type="number"
                                                min={1}
                                                max={
                                                    CONFIG_LIMITS.ship.maxCount
                                                }
                                                value={newShipCount}
                                                onChange={(e) =>
                                                    handleNewShipCountInput(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-9 rounded-lg border border-[#7dbde0] bg-white/85 px-3 text-sm text-[#24425f] outline-none focus:border-[#3f77b2]"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAddShip}
                                            disabled={!newShipName.trim()}
                                            className="h-9 cursor-pointer rounded-lg border border-[#3f77b2] bg-[#3f77b2]/85 px-4 text-sm font-bold text-white hover:bg-[#3f77b2] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {t("gameSetup.step1.addButton")}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Step 1 footer */}
                            <div className="flex shrink-0 items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={resetConfig}
                                        className="border-[#c67e7e] text-[#8f2f2f] hover:bg-[#ffeaea]"
                                    >
                                        {t("gameSetup.step1.resetButton")}
                                    </Button>
                                    {!isConfigValid && ships.length > 0 && (
                                        <p className="text-xs text-[#8f2f2f]">
                                            {t(
                                                "gameSetup.step1.invalidFleetError",
                                            )}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="primary"
                                    disabled={!isConfigValid}
                                    onClick={handleNext}
                                >
                                    {t("gameSetup.header.nextStep")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/*  Step 2: Place Ships  */}
                    {step === 2 && (
                        <div className="themed-scrollbar flex h-full flex-col gap-4 overflow-y-auto rounded-xl border border-white/40 bg-white/20 p-5">
                            <p className="text-xs text-[#708aac]">
                                {t("gameSetup.step2.boardInfo", {
                                    rows: boardConfig.rows,
                                    cols: boardConfig.cols,
                                })}
                                {"  "}
                                {t("gameSetup.step2.fleetInfo", {
                                    ships: ships
                                        .map((s) => `${s.count} ${s.name}`)
                                        .join(", "),
                                })}
                            </p>
                            <ShipPlacementStage
                                boardConfig={boardConfig}
                                ships={ships}
                                placements={state.placements}
                                onPlacementsChange={setPlacements}
                            />
                            <div className="flex shrink-0 items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleBackToConfig}
                                    className="cursor-pointer rounded-xl border border-[#7dbde0] px-4 py-2 text-sm font-semibold text-[#3d5472] hover:bg-white/70"
                                >
                                    {t("gameSetup.header.backToConfig")}
                                </button>
                                <Button
                                    variant="primary"
                                    disabled={!allShipsPlaced}
                                    onClick={() =>
                                        navigate("/game/play", {
                                            state: {
                                                mode,
                                                config: state.config,
                                                placements: state.placements,
                                            },
                                        })
                                    }
                                >
                                    {t("gameSetup.header.startGame")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
