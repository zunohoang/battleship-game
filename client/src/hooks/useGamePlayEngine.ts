import { useEffect, useMemo, useState } from "react";
import type {
    BoardConfig,
    GameConfig,
    PlacedShip,
    ShipDefinition,
} from "@/types/game";
import {
    buildRandomPlacements,
    buildShipInstances,
    cellKey,
    getShipCells,
    instanceKey,
} from "@/utils/placementUtils";
import type { FleetStatusItem } from "@/components/game-play";
import { createBot } from "@/services/bots";

export type ShotResult = "hit" | "miss";
export type TurnOwner = "player" | "bot";
export type Winner = TurnOwner | null;

interface UseGamePlayEngineParams {
    config: GameConfig | null;
    playerPlacements: PlacedShip[] | null;
    t: (key: string, options?: Record<string, unknown>) => string;
    turnDurationSeconds?: number;
}

interface UseGamePlayEngineResult {
    ships: ShipDefinition[];
    boardConfig: BoardConfig | null;
    botPlacements: PlacedShip[] | null;
    playerShots: Map<string, ShotResult>;
    botShots: Map<string, ShotResult>;
    turn: TurnOwner;
    secondsLeft: number;
    winner: Winner;
    statusText: string;
    playerFleetStatuses: FleetStatusItem[];
    botFleetStatuses: FleetStatusItem[];
    destroyedBotShipKeys: Set<string>;
    handlePlayerShot: (x: number, y: number) => void;
}

const DEFAULT_TURN_DURATION_SECONDS = 30;

function createShipsById(ships: ShipDefinition[]) {
    return new Map(ships.map((ship) => [ship.id, ship]));
}

function toColumnLabel(index: number): string {
    let value = index;
    let label = "";

    do {
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);

    return label;
}

function toCellLabel(x: number, y: number) {
    return `${toColumnLabel(x)}${y + 1}`;
}

function buildBotPlacements(
    config: GameConfig,
    fallbackPlacements: PlacedShip[],
): PlacedShip[] | null {
    const shipsById = createShipsById(config.ships);
    const shipInstances = buildShipInstances(config.ships);

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const placements = buildRandomPlacements(
            shipInstances,
            config.boardConfig,
            shipsById,
            800,
        );

        if (placements) return placements;
    }

    return fallbackPlacements.length > 0 ? [...fallbackPlacements] : null;
}

function getShotResult(
    x: number,
    y: number,
    placements: PlacedShip[],
    shipsById: Map<string, ShipDefinition>,
): ShotResult {
    const didHit = placements.some((placement) => {
        const ship = shipsById.get(placement.definitionId);
        if (!ship) return false;

        return getShipCells(placement, ship.size).some(
            (cell) => cell.x === x && cell.y === y,
        );
    });

    return didHit ? "hit" : "miss";
}

function isFleetDestroyed(
    placements: PlacedShip[],
    shots: Map<string, ShotResult>,
    shipsById: Map<string, ShipDefinition>,
) {
    return placements.every((placement) => {
        const ship = shipsById.get(placement.definitionId);
        if (!ship) return false;

        return getShipCells(placement, ship.size).every(
            (cell) => shots.get(cellKey(cell.x, cell.y)) === "hit",
        );
    });
}

function buildFleetStatuses(
    ships: ShipDefinition[],
    placements: PlacedShip[],
    shots: Map<string, ShotResult>,
): FleetStatusItem[] {
    const placementsByKey = new Map(
        placements.map((placement) => [
            instanceKey(placement.definitionId, placement.instanceIndex),
            placement,
        ]),
    );

    return buildShipInstances(ships).map((instance) => {
        const key = instanceKey(instance.definitionId, instance.instanceIndex);
        const placement = placementsByKey.get(key);

        if (!placement) {
            return {
                key,
                name: `${instance.name} #${instance.instanceIndex + 1}`,
                size: instance.size,
                hits: 0,
                destroyed: false,
            };
        }

        const hits = getShipCells(placement, instance.size).filter(
            (cell) => shots.get(cellKey(cell.x, cell.y)) === "hit",
        ).length;

        return {
            key,
            name: `${instance.name} #${instance.instanceIndex + 1}`,
            size: instance.size,
            hits,
            destroyed: hits === instance.size,
        };
    });
}

export function useGamePlayEngine({
    config,
    playerPlacements,
    t,
    turnDurationSeconds = DEFAULT_TURN_DURATION_SECONDS,
}: UseGamePlayEngineParams): UseGamePlayEngineResult {
    const ships = config?.ships ?? [];
    const boardConfig = config?.boardConfig ?? null;
    const shipsById = useMemo(() => createShipsById(ships), [ships]);
    const bot = useMemo(() => createBot("easy"), []);

    const [botPlacements, setBotPlacements] = useState<PlacedShip[] | null>(
        null,
    );
    const [playerShots, setPlayerShots] = useState<Map<string, ShotResult>>(
        () => new Map(),
    );
    const [botShots, setBotShots] = useState<Map<string, ShotResult>>(
        () => new Map(),
    );
    const [turn, setTurn] = useState<TurnOwner>("player");
    const [secondsLeft, setSecondsLeft] = useState(turnDurationSeconds);
    const [winner, setWinner] = useState<Winner>(null);
    const [statusText, setStatusText] = useState("");

    useEffect(() => {
        if (!config || !playerPlacements) {
            setBotPlacements(null);
            setPlayerShots(new Map());
            setBotShots(new Map());
            setTurn("player");
            setSecondsLeft(turnDurationSeconds);
            setWinner(null);
            setStatusText("");
            return;
        }

        setBotPlacements(buildBotPlacements(config, playerPlacements));
        setPlayerShots(new Map());
        setBotShots(new Map());
        setTurn("player");
        setSecondsLeft(turnDurationSeconds);
        setWinner(null);
        setStatusText(t("gamePlay.status.ready"));
    }, [config, playerPlacements, t, turnDurationSeconds]);

    useEffect(() => {
        if (!boardConfig || winner) return;

        const timer = window.setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [boardConfig, turn, winner]);

    useEffect(() => {
        if (winner || secondsLeft > 0) return;
        if (turn !== "player") return;

        setStatusText(t("gamePlay.status.playerTimeout"));
        setTurn("bot");
        setSecondsLeft(turnDurationSeconds);
    }, [secondsLeft, t, turn, turnDurationSeconds, winner]);

    const playerFleetStatuses = useMemo(
        () =>
            playerPlacements
                ? buildFleetStatuses(ships, playerPlacements, botShots)
                : [],
        [botShots, playerPlacements, ships],
    );
    const botFleetStatuses = useMemo(
        () =>
            botPlacements
                ? buildFleetStatuses(ships, botPlacements, playerShots)
                : [],
        [botPlacements, playerShots, ships],
    );

    const destroyedBotShipKeys = useMemo(
        () =>
            new Set(
                botFleetStatuses
                    .filter((ship) => ship.destroyed)
                    .map((ship) => ship.key),
            ),
        [botFleetStatuses],
    );

    useEffect(() => {
        if (turn !== "bot" || winner || !boardConfig || !playerPlacements) {
            return;
        }

        const timeout = window.setTimeout(() => {
            const choice = bot.pickTarget({
                boardConfig,
                attemptedShots: new Set(botShots.keys()),
            });
            if (!choice) return;

            const key = cellKey(choice.x, choice.y);
            const result = getShotResult(
                choice.x,
                choice.y,
                playerPlacements,
                shipsById,
            );
            const nextShots = new Map(botShots);
            nextShots.set(key, result);
            setBotShots(nextShots);

            if (isFleetDestroyed(playerPlacements, nextShots, shipsById)) {
                setWinner("bot");
                setStatusText(
                    t("gamePlay.status.botWins", {
                        cell: toCellLabel(choice.x, choice.y),
                    }),
                );
                return;
            }

            setStatusText(
                result === "hit"
                    ? t("gamePlay.status.botHit", {
                          cell: toCellLabel(choice.x, choice.y),
                      })
                    : t("gamePlay.status.botMiss", {
                          cell: toCellLabel(choice.x, choice.y),
                      }),
            );
            setTurn("player");
            setSecondsLeft(turnDurationSeconds);
        }, 900);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [
        bot,
        boardConfig,
        botShots,
        playerPlacements,
        shipsById,
        t,
        turn,
        turnDurationSeconds,
        winner,
    ]);

    const handlePlayerShot = (x: number, y: number) => {
        if (turn !== "player" || winner || !botPlacements) return;

        const key = cellKey(x, y);
        if (playerShots.has(key)) return;

        const result = getShotResult(x, y, botPlacements, shipsById);
        const nextShots = new Map(playerShots);
        nextShots.set(key, result);
        setPlayerShots(nextShots);

        if (isFleetDestroyed(botPlacements, nextShots, shipsById)) {
            setWinner("player");
            setStatusText(
                t("gamePlay.status.playerWins", {
                    cell: toCellLabel(x, y),
                }),
            );
            return;
        }

        setStatusText(
            result === "hit"
                ? t("gamePlay.status.playerHit", {
                      cell: toCellLabel(x, y),
                  })
                : t("gamePlay.status.playerMiss", {
                      cell: toCellLabel(x, y),
                  }),
        );
        setTurn("bot");
        setSecondsLeft(turnDurationSeconds);
    };

    return {
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
    };
}
