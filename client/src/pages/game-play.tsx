import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { BoardCellContext } from "@/components/board/Board";
import {
    BattleBoard,
    ShotMarker,
    Sidebar,
    TurnTimerPanel,
} from "@/components/game-play";
import { Button } from "@/components/ui/Button";
import type { GameConfig, GameMode, PlacedShip } from "@/types/game";
import { useGamePlayEngine } from "../hooks/useGamePlayEngine";

type GamePlayLocationState = {
    mode?: GameMode;
    config?: GameConfig;
    placements?: PlacedShip[];
};

const TURN_DURATION_SECONDS = 30;

export function GamePlayPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState =
        (location.state as GamePlayLocationState | null) ?? null;

    const mode = locationState?.mode ?? "bot";
    const config = locationState?.config ?? null;
    const playerPlacements = locationState?.placements ?? null;

    const {
        ships,
        boardConfig,
        botPlacements,
        playerShots,
        botShots,
        turn,
        secondsLeft,
        winner,
        statusText,
        playerFleetStatuses,
        botFleetStatuses,
        destroyedBotShipKeys,
        handlePlayerShot,
    } = useGamePlayEngine({
        config,
        playerPlacements,
        t,
        turnDurationSeconds: TURN_DURATION_SECONDS,
    });

    if (!config || !boardConfig || !playerPlacements || !botPlacements) {
        return (
            <main className="relative min-h-screen overflow-hidden p-4 text-[#1e3654] sm:p-6">
                <div
                    className="absolute inset-0 -z-20 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'linear-gradient(to bottom, rgba(228,238,249,0.75), rgba(241,246,252,0.82)), url("/theme-battleship.jpg")',
                    }}
                />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_55%)]" />

                <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col items-center justify-center rounded-4xl border border-white/55 bg-white/18 p-6 text-center backdrop-blur-[2px] sm:p-8">
                    <h1 className="text-3xl font-black italic text-[#173251]">
                        {t("gamePlay.missingState.title")}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm text-[#5f7591]">
                        {t("gamePlay.missingState.description")}
                    </p>
                    <div className="mt-6 w-full max-w-sm">
                        <Button
                            variant="primary"
                            onClick={() =>
                                navigate("/game/setup", { state: { mode } })
                            }
                        >
                            {t("gamePlay.actions.backToSetup")}
                        </Button>
                    </div>
                </section>
            </main>
        );
    }

    const playerBoardCellProps = ({ key }: BoardCellContext) => {
        const shot = botShots.get(key);

        if (shot === "hit") {
            return {
                className: "border-[#89b7d8] bg-[#d8ecfb]/45",
                overlay: <ShotMarker result="hit" />,
            };
        }
        if (shot === "miss") {
            return {
                className: "border-[#89b7d8] bg-[#d8ecfb]/45",
                overlay: <ShotMarker result="miss" />,
            };
        }

        return { className: "border-[#89b7d8] bg-[#d8ecfb]/45" };
    };

    const botBoardCellProps = ({ key }: BoardCellContext) => {
        const shot = playerShots.get(key);

        if (shot === "hit") {
            return {
                className: "border-[#89b7d8] bg-white/72",
                overlay: <ShotMarker result="hit" />,
            };
        }
        if (shot === "miss") {
            return {
                className: "border-[#89b7d8] bg-white/72",
                overlay: <ShotMarker result="miss" />,
            };
        }

        return {
            className:
                turn === "player" && !winner
                    ? "border-[#89b7d8] bg-white/72 hover:bg-white"
                    : "border-[#89b7d8] bg-white/52",
            disabled: turn !== "player" || Boolean(winner),
        };
    };

    const timerClass =
        secondsLeft <= 5
            ? "border-red-300/80 bg-red-50/90 text-[#a53333]"
            : "border-[#91c4e5]/70 bg-white/70 text-[#234869]";
    const turnLabel = t("gamePlay.header.turnLabel");
    const turnTitle = winner
        ? winner === "player"
            ? t("gamePlay.header.playerWon")
            : t("gamePlay.header.botWon")
        : turn === "player"
          ? t("gamePlay.header.playerTurn")
          : t("gamePlay.header.botTurn");
    const turnHint = winner
        ? t("gamePlay.header.finished")
        : turn === "player"
          ? t("gamePlay.header.playerTurnHint")
          : t("gamePlay.header.botTurnHint");
    const timerLabel = t("gamePlay.header.timerLabel");
    const timerHint = t("gamePlay.header.timerHint", {
        seconds: TURN_DURATION_SECONDS,
    });
    const sharedTurnPanel = (
        <TurnTimerPanel
            timerClass={timerClass}
            secondsLeft={secondsLeft}
            turnLabel={turnLabel}
            turnTitle={turnTitle}
            turnHint={turnHint}
            timerLabel={timerLabel}
            timerHint={timerHint}
        />
    );

    const baseBoardClass =
        "mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-4xl p-3 sm:p-4 transition-all duration-300";
    const getBoardClass = (isActive: boolean) =>
        isActive
            ? `${baseBoardClass} border border-[#3f77b2]/70 bg-white/42 shadow-[0_24px_80px_rgba(28,54,88,0.16)]`
            : `${baseBoardClass} border border-white/45 bg-white/26 opacity-90`;
    const playerBoardClass = getBoardClass(turn === "player" && !winner);
    const botBoardClass = getBoardClass(turn === "bot" && !winner);

    return (
        <main className="relative min-h-screen overflow-hidden p-3 text-[#1e3654] sm:p-4 lg:p-5">
            <div
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{
                    backgroundImage:
                        'linear-gradient(to bottom, rgba(228,238,249,0.7), rgba(241,246,252,0.84)), url("/theme-battleship.jpg")',
                }}
            />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_55%)]" />

            <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-screen-3xl flex-col rounded-4xl border border-white/55 bg-white/18 p-4 backdrop-blur-[2px] sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#6e86a1]">
                            {t("gamePlay.header.modeLabel")}{" "}
                            {mode.toUpperCase()}
                        </p>
                        <h1 className="mt-2 text-3xl font-black italic text-[#173251] sm:text-4xl">
                            {t("gamePlay.header.title")}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-[#5f7591]">
                            {t("gamePlay.header.description")}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(12rem,16rem)] xl:items-start">
                    <Sidebar
                        title={t("gamePlay.fleet.playerLabel")}
                        items={playerFleetStatuses}
                        turnPanel={
                            turn === "player" ? sharedTurnPanel : undefined
                        }
                    />

                    <div className="flex min-h-0 flex-col gap-4">
                        <div className="grid min-h-0 gap-4 2xl:grid-cols-2">
                            <BattleBoard
                                turnLabel={t("gamePlay.boards.playerTurnLabel")}
                                title={t("gamePlay.boards.playerTitle")}
                                subtitle={t("gamePlay.boards.playerSubtitle", {
                                    destroyed: playerFleetStatuses.filter(
                                        (ship) => ship.destroyed,
                                    ).length,
                                    total: playerFleetStatuses.length,
                                })}
                                boardConfig={boardConfig}
                                ships={ships}
                                placements={playerPlacements}
                                getCellProps={playerBoardCellProps}
                                visibleShipKeys="all"
                                containerClassName={playerBoardClass}
                            />

                            <BattleBoard
                                turnLabel={t("gamePlay.boards.botTurnLabel")}
                                title={t("gamePlay.boards.botTitle")}
                                subtitle={t("gamePlay.boards.botSubtitle", {
                                    destroyed: botFleetStatuses.filter(
                                        (ship) => ship.destroyed,
                                    ).length,
                                    total: botFleetStatuses.length,
                                })}
                                boardConfig={boardConfig}
                                ships={ships}
                                placements={botPlacements}
                                onCellClick={handlePlayerShot}
                                getCellProps={botBoardCellProps}
                                visibleShipKeys={destroyedBotShipKeys}
                                containerClassName={botBoardClass}
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-3xl border border-white/55 bg-white/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6e86a1]">
                                    {t("gamePlay.status.label")}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-[#234869]">
                                    {statusText}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button
                                    className="px-6"
                                    onClick={() =>
                                        navigate("/game/setup", {
                                            state: { mode },
                                        })
                                    }
                                >
                                    {t("gamePlay.actions.backToSetup")}
                                </Button>
                                <Button
                                    variant="primary"
                                    className="px-6"
                                    onClick={() =>
                                        navigate("/game/play", {
                                            replace: true,
                                            state: {
                                                mode,
                                                config,
                                                placements: playerPlacements,
                                            },
                                        })
                                    }
                                >
                                    {t("gamePlay.actions.playAgain")}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Sidebar
                        title={t("gamePlay.fleet.botLabel")}
                        items={botFleetStatuses}
                        turnPanel={turn === "bot" ? sharedTurnPanel : undefined}
                    />
                </div>
            </section>
        </main>
    );
}
