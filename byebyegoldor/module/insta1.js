import playerUtils from "../utils/playerUtils";
import S02Event from "../events/packets/server/S02Event";
import config from "../config";
import { C08PacketPlayerBlockPlacement, MCBlockPos } from "../utils/mappings";

// (' - ')⊃━☆ﾟ.*･｡ﾟ

const startButton = [110, 121, 91];

S02Event.addListener((packet, event, mcEvent) => {
    if (!config().insta1) return;
    if (event.unformatted !== "[BOSS] Goldor: Who dares trespass into my domain?" && !event.unformatted.includes("!starti1")) return;
    if (!atSS()) return playerUtils.sendMessage("&cNot at SS!");

    ChatLib.say("/pc we will finish this device...");
    Client.scheduleTask(10, () => ChatLib.say("/pc (' - ')⊃━☆ﾟ.*･｡ﾟ with the power of friendship!"));

    setTimeout(() => {
        for (let i = 0; i < config().insta1Clicks; i++) setTimeout(() => clickButton(), config().insta1Delay * (i + 1));
    }, 300 - config().insta1Ping === 0 ? playerUtils.ping : config().insta1Ping);
})

const atSS = () => {
    const distance = playerUtils.getDistance(...startButton);
    return Math.sqrt(distance) < 5;
}

function clickButton() {
    Client.sendPacket(new C08PacketPlayerBlockPlacement(new MCBlockPos(...startButton), 4, Player.getHeldItem()?.getItemStack(), 0.875, 0.5, 0.5));
	if (!Player.isSneaking()) Player.getPlayer().func_71038_i();
}