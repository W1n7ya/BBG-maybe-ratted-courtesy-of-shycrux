import config from "../config";
import playerUtils from "../utils/playerUtils";
import leapUtils from "../utils/leapUtils";
import { MouseEvent } from "../utils/mappings";
import Dungeon from "../../BloomCore/dungeons/Dungeon";

let queued = false;

register(MouseEvent, (event) => {
    if (!config().autoLeap || !Dungeon.inDungeon) return;

    if (!event.buttonstate || event.button !== 0) return;
    if (!playerUtils.isHoldingLeap()) return;

    cancel(event);

    if (playerUtils.inTerminal) {
        queued = true;
        queueLeap.register();
        playerUtils.sendMessage("&eQueued leap!");
        World.playSound("random.wood_click", 3, 1);
        return;
    }

    leap();
})

const queueLeap = register("tick", () => {
    if (playerUtils.inTerminal) return;
    queueLeap.unregister();
    queued = false;
    leap();
}).unregister();

function leap() {
    let leapingTo = getLeap();
    if (!leapingTo || !leapingTo.length || !playerUtils.isHoldingLeap()) return playerUtils.sendMessage("&7Failed leap!");

    playerUtils.rightClick();
    playerUtils.sendMessage("&aLeaping to " + leapingTo);
    leapUtils.queueLeap(leapingTo);
    World.playSound("random.click", 3, 1);
}

function getLeap() {
    let leapString = "";

    if (playerUtils.isInBox(Player, 113, 160, 48, 89, 100, 122)) leapString = config().ee2Leap;
    if (playerUtils.isInBox(Player, 91, 160, 145, 19, 100, 121)) leapString = config().ee3Leap;
    if (playerUtils.isInBox(Player, -6, 160, 123, 19, 100, 50)) leapString = config().coreLeap;
    if (playerUtils.isInBox(Player, 17, 160, 27, 90, 100, 50)) leapString = config().inCoreLeap;

    return leapString;
}

register("renderWorld", () => {
    if (!config().autoLeap || !Dungeon.inDungeon) return;

    if (!leapUtils.inQueue() && !queued) {
        let player;
        let area;
    
        if (playerUtils.isInBox(Player, 113, 160, 48, 89, 100, 122)) {
            player = config().ee2Leap;
            area = "Early Enter 2";
        }
        
        if (playerUtils.isInBox(Player, 91, 160, 145, 19, 100, 121)) {
            player = config().ee3Leap;
            area = "Early Enter 3";
        }
    
        if (playerUtils.isInBox(Player, -6, 160, 123, 19, 100, 50)) {
            player = config().coreLeap;
            area = "Core";
        }
    
        if (playerUtils.isInBox(Player, 17, 160, 27, 90, 100, 50)) {
            player = config().inCoreLeap;
            area = "Inside Core";
        }
    
        if (!player || !area) return;
    
        ChatLib.actionBar(`&a${player} &8|&6 ${area}`);
    } else ChatLib.actionBar(`&aLeaping to ${getLeap()}...`);
})