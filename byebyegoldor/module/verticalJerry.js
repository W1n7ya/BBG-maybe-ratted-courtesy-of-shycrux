import config from "../config";
import { S12PacketEntityVelocity } from "../utils/mappings";
import playerUtils from "../utils/playerUtils";

register("packetReceived", (packet, event) => {
    if (!config().vertJerry || playerUtils.getHeldItemID() != "JERRY_STAFF") return;

    const entityID = Player.getPlayer().func_145782_y();
    const motionY = packet.func_149410_e();
    if (packet.func_149412_c() !== entityID || motionY !== 4800) return;

    cancel(event);
    try {new S12PacketEntityVelocity(entityID, Player.getMotionX(), motionY / 8000, Player.getMotionZ()).func_148833_a(Client.getConnection())} catch (e) {};
}).setFilteredClass(S12PacketEntityVelocity)