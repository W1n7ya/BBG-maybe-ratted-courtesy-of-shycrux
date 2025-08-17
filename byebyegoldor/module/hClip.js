import { Keybind } from "../../KeybindFix";

import playerUtils from "../utils/playerUtils";

register("command", (yaw) => {
    if (Math.abs(yaw) > 180 || isNaN(yaw)) return;
    playerUtils.hClip(yaw, false);
}).setName("hclip")

new Keybind("HClip", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => playerUtils.hClip(Player.getYaw()));