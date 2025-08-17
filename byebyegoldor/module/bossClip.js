import config from "../config";
import { S08PacketPlayerPosLook, S32PacketConfirmTransaction } from "../utils/mappings";
import playerUtils from "../utils/playerUtils";

const spawnPos = [73, 221, 14];

let delay = 0;

register("packetReceived", (packet) => {
    if (!config().bossClip || delay !== 0 || !isBossS08(packet)) return;
    Client.scheduleTask(0, () => {
        playerUtils.setPosition(Player.getX(), Player.getY() - 40, Player.getZ());
        delay = 10;
    });
}).setFilteredClass(S08PacketPlayerPosLook);

register("packetReceived", () => {
    if (delay > 0) delay--;
}).setFilteredClass(S32PacketConfirmTransaction)

const isBossS08 = (packet) => {
    const pos = [Math.floor(packet.func_148932_c()), Math.floor(packet.func_148928_d()), Math.floor(packet.func_148933_e())];
    return pos.every((c, i) => c === spawnPos[i]);
}