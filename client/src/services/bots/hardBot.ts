import type { BotTarget, BotTurnContext, GameBot } from "@/services/bots/types";
import { EasyBot } from "@/services/bots/easyBot";

export class HardBot implements GameBot {
    readonly name = "HardBot";
    private readonly fallbackBot = new EasyBot();

    pickTarget(context: BotTurnContext): BotTarget | null {
        return this.fallbackBot.pickTarget(context);
    }
}
