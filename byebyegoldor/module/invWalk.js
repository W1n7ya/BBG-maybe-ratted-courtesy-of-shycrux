import config from "../config";
import { C0EPacketClickWindow } from "../utils/mappings";
import playerUtils from "../utils/playerUtils";

const allowedInventories = [
    "Spirit Leap",
    "Pets",
    "Your Equipment and Stats",
    "Skyblock Menu"
];

let delay = 0;

register("tick", () => {
    if (!config().invWalk || !allowedInventories.includes(Player?.getContainer()?.getName())) return;
    if (delay > 0) return delay--;
    playerUtils.handleKeys();
})

register("packetSent", (packet) => {
    if (!config().invWalk || !allowedInventories.includes(Player?.getContainer()?.getName())) return;

    const slot = packet.func_149544_d();

    if (slot == -999) {
        delay = 6;
        playerUtils.stopMovement();
        return;
    }
}).setFilteredClass(C0EPacketClickWindow)