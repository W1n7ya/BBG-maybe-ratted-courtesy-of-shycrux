import Vector3 from "../../BloomCore/utils/Vector3";
import { C03PacketPlayer, C05PacketPlayerLook, C06PacketPlayerPosLook } from "./mappings";

class rotationUtils {
    constructor() {
        this.yaw = null;
        this.pitch = null;
        this.sending = false;
        this.resetting = false;

        register("packetSent", (packet, event) => {
            if (this.sending || !this.yaw || !this.pitch) return;
            if (this.yaw == packet.func_149462_g() && this.pitch == packet.func_149470_h()) return;

            this.sending = true;
            cancel(event);

            const onGround = packet.func_149465_i();

            if (packet.class.getSimpleName() == "C05PacketPlayerLook") Client.sendPacket(new C05PacketPlayerLook(this.yaw, this.pitch, onGround));
            else Client.sendPacket(new C06PacketPlayerPosLook(Player.getX(), Player.getPlayer().func_174813_aQ().field_72338_b, Player.getZ(), this.yaw, this.pitch, onGround));

            if (this.resetting) {
                this.resetting = false;
                this.yaw = null;
                this.pitch = null;
            }

            this.sending = false;
        }).setFilteredClass(C03PacketPlayer)

        register("gameUnload", () => this.resetServerRotations());
    }

    /**
     * Rotates the player client-side
     * @param {Number} yaw
     * @param {Number} pitch
    */
    rotate(yaw, pitch) {
        yaw = parseFloat(yaw);
        pitch = parseFloat(pitch);

        if (yaw == null || pitch == null) return;
        if (isNaN(yaw) || isNaN(pitch)) return;
        if (Math.abs(yaw) > 180 || Math.abs(pitch) > 90) return;

        Player.getPlayer().field_70177_z = yaw;
        Player.getPlayer().field_70125_A = pitch;
    }

    /**
     * Rotates the player server-side
     * @param {Number} yaw
     * @param {Number} pitch
    */
    serverRotate(yaw, pitch) {
        if (Math.abs(yaw) > 180 || Math.abs(pitch) > 90) return;
        this.yaw = yaw;
        this.pitch = pitch;
    }

    /**
     * Resets the server-side rotations
    */
    resetServerRotations() {
        this.serverRotate(Player.getYaw(), Player.getPitch());
        this.resetting = true;
    }

    /**
     * Raytraces where the player is looking
    */
    rayTrace() {
        let rt = Player.getPlayer().func_174822_a(100, 1)
        if (!rt) return null;

        let posString = rt.toString().match(/pos=\(([^)]+)\)/);
        if (!posString || posString.length < 2) return null;

        return posString[1].split(', ').map(Number);
    }

    getYaw(x, y, z) {
        const difference = new Vector3(x, y, z).subtract(new Vector3(Player.getX(), Player.getY() + Player.asPlayerMP().getEyeHeight(), Player.getZ()));
        return difference.getYaw();
    }
}

export default new rotationUtils();