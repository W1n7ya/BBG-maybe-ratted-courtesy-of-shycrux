import { Keybind } from "../../KeybindFix";

import { S12PacketEntityVelocity } from "../utils/mappings";
import config from "../config";
import playerUtils from "../utils/playerUtils";

let enabled = false;

register("command", () => enabled = !enabled).setName("lavaclip")
new Keybind("LavaClip", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => enabled = !enabled);

register("step", () => {
    if (!enabled || global.inFreeCam) return;
    const block = World.getBlockAt(Player.getX(), Math.floor(Player.getY() - Player.getMotionY()), Player.getZ());
    if (block.type.getID() == 11) playerUtils.setPosition(Player.getX(), Player.getY() - config().lavaClipBlocks, Player.getZ());
})

register("packetReceived", (packet, event) => {
    if (packet.func_149412_c() != Player.getPlayer().func_145782_y() || !enabled) return;
    const packetMotion = packet.func_149410_e();
    const lavaMotion = 28000.0;
    if (packetMotion == lavaMotion) {
        cancel(event);
        enabled = false;
    }
}).setFilteredClass(S12PacketEntityVelocity)

register("renderOverlay", () => {
    if (enabled) Renderer.drawStringWithShadow("&4LAVA CLIPPING", Renderer.screen.getWidth() / 2 - Renderer.getStringWidth("LAVA CLIPPING") / 2, Renderer.screen.getHeight() / 2 + 15);
})

export const lavaClip = (b = false) => enabled = b;