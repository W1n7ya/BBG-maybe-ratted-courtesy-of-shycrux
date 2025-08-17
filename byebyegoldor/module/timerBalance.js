import config from "../config";
import { C03PacketPlayer, S08PacketPlayerPosLook } from "../utils/mappings";

let lastPacket;
let lastRemove = 0;
let delay = 0;
let inBoss = false;

register("packetSent", (packet, event) => {
    if (Player.asPlayerMP().getTicksExisted() <= 100) return;
    if (Player.getPlayer().field_70154_o) return delay = 50;

    if (delay > 0) delay--;
    if (config().balanceBoss && !inBoss) return;

    if (config().timerBalance && lastPacket != null && global.balancePackets < 400 && delay == 0) {
        const posX = packet.func_149464_c();
        const posY = packet.func_149467_d();
        const posZ = packet.func_149472_e();
        const yaw = packet.func_149462_g();
        const pitch = packet.func_149470_h();

        const lastPosX = lastPacket.func_149464_c();
        const lastPosY = lastPacket.func_149467_d();
        const lastPosZ = lastPacket.func_149472_e();
        const lastYaw = lastPacket.func_149462_g();
        const lastPitch = lastPacket.func_149470_h();

        if (posX == lastPosX
            && posY == lastPosY
            && posZ == lastPosZ
            && yaw == lastYaw
            && pitch == lastPitch
        ) {
            cancel(event);
            global.balancePackets++;
        }
    }

    lastPacket = packet;
}).setFilteredClasses([C03PacketPlayer])

register("packetReceived", (packet) => {
    if (Math.floor(packet.func_148932_c()) == 73 && Math.floor(packet.func_148928_d()) == 221 && Math.floor(packet.func_148933_e()) == 14) delay = 50;
}).setFilteredClass(S08PacketPlayerPosLook)

register("renderOverlay", () => {
    if (!config().timerBalance || !config().displayPackets) return;
    const scale = 2;
    Renderer.scale(scale);
    Renderer.drawStringWithShadow(global.balancePackets, (Renderer.screen.getWidth() / scale - Renderer.getStringWidth(global.balancePackets)) / 2, Renderer.screen.getHeight() / scale / 2 + 30);
})

register("worldUnload", () => {
    inBoss = false;
    lastPacket = null;
    global.balancePackets = 0;
    delay = 50;
})

register("worldLoad", () => {
    inBoss = false;
    lastPacket = null;
    global.balancePackets = 0;
    delay = 50;
})

register("tick", () => {
    if (global.balancePackets >= config().removeAmount && Date.now() - lastRemove >= config().removeInterval * 1000 && Server.getIP() != "localhost") {
        global.balancePackets -= config().removeAmount;
        lastRemove = Date.now();
    }
})

register("chat", () => inBoss = true).setCriteria("[BOSS] Maxor: WELL! WELL! WELL! LOOK WHO'S HERE!");