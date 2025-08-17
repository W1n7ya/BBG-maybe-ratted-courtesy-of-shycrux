import config from "../config";
import playerUtils from "../utils/playerUtils";
import Dungeon from "../../BloomCore/dungeons/Dungeon";

let notified = false;

register("renderWorld", () => {
    if (!config().leapNotifier || !Dungeon.inDungeon) return;

    const currentSection = getSection(Player);
    if (currentSection == -1) return;

    const partyMembers = [...Dungeon.party];
    const waitingFor = [];

    const sameSection = partyMembers.every(member => {
        const player = World.getPlayerByName(member);
        if (!player) return;
        if (player.isInvisible()) return true;

        const section = getSection(player);
        if (section == -1) return;

        if (section != currentSection) waitingFor.push(member);
        return currentSection == section;
    })

    if (sameSection && !notified) {
        notified = true;
        for (let i = 0; i < 5; i++) World.playSound("random.anvil_land", 2.5, 1.5);
        Client.showTitle("", "", 0, 1, 0); // sometimes titles dont work so i have to use a blank one first ??
        Client.showTitle("&aEveryone leaped!", "", 1, 30, 1);
        playerUtils.sendMessage("&aEveryone leaped!");
    }

    if (!sameSection) notified = false;
})

function getSection(entity) {
    let section = -1;

    if (playerUtils.isInBox(entity, 113, 160, 48, 89, 100, 122)) section = 1;
    if (playerUtils.isInBox(entity, 91, 160, 145, 19, 100, 121)) section = 2;
    if (playerUtils.isInBox(entity, -6, 160, 123, 19, 100, 50)) section = 3;
    if (playerUtils.isInBox(entity, 17, 160, 27, 90, 100, 50)) section = 4;

    return section;
}