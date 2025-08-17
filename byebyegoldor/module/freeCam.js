import { Keybind } from "../../KeybindFix";
import RenderLibV2 from "../../RenderLibV2";

import playerUtils from "../utils/playerUtils";
import rotationUtils from "../utils/rotationUtils";

global.inFreeCam = false;

let position = [];
let motion = [];

new Keybind("FreeCam", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => {
    global.inFreeCam = !global.inFreeCam
    global.inFreeCam ? enable() : disable();
});

function enable() {
    position = [Player.getX(), Player.getY(), Player.getZ()];
    motion = [Player.getMotionX(), Player.getMotionY(), Player.getMotionZ()];

    Player.getPlayer().field_71075_bZ.field_75100_b = true;

    playerUtils.setMotion(0, 0, 0);
    Client.scheduleTask(0, () => playerUtils.setMotion(0, 0, 0));
    playerUtils.stopMovement();

    fieldHandler.register();
    packetHandler.register();
    renderHandler.register();
}

function disable() {
    Player.getPlayer().field_71075_bZ.field_75100_b = false;
    Player.getPlayer().field_70145_X = false;

    playerUtils.setPosition(...position);
    playerUtils.setMotion(...motion);

    fieldHandler.unregister();
    packetHandler.unregister();
    renderHandler.unregister();

    rotationUtils.resetServerRotations();
}

register("gameUnload", () => {
    if (global.inFreeCam) disable();
});

register("worldUnload", () => {
    if (global.inFreeCam) disable();
})

const fieldHandler = register("renderWorld", () => {
    Player.getPlayer().field_71075_bZ.field_75101_c = true;
    Player.getPlayer().field_70145_X = true;
}).unregister();

const renderHandler = register("renderWorld", () => {
    const width = Player.getPlayer().field_70130_N;
    const height = Player.getPlayer().field_70131_O;

    RenderLibV2.drawEspBoxV2(...position, width, height, width, 1, 1, 1, 1, true, 2.5);
    RenderLibV2.drawInnerEspBoxV2(...position, width, height, width, 1, 1, 1, 0.25, true);
}).unregister();

const packetHandler = register("packetSent", (packet, event) => {
    if (!playerUtils.blacklistedPackets.includes(packet.class.getSimpleName())) cancel(event);
}).unregister();