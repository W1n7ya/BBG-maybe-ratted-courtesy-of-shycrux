import { EntityPlayer, C03PacketPlayer, C04PacketPlayerPosition, C05PacketPlayerLook, C06PacketPlayerPosLook, S08PacketPlayerPosLook } from "./Doorlessutils"

export default new class serverRotations {
    constructor() {
        this.yaw = null;
        this.pitch = null;
        this.inProgress = false;
        this.shouldRotate = false;
        this.fakePacketSent = false;
        this.callback = null;

        register("packetSent", (packet, event) => {
            if (!this.shouldRotate) return;
            if (this.inProgress) return;
            if (isNaN(this.yaw) || isNaN(this.pitch) || Player.getPlayer().field_70154_o) return;
            if (this.yaw == packet.func_149462_g() && this.pitch == packet.func_149470_h()) return;

            cancel(event);
            this.inProgress = true;

            const packetData = {
                x: packet.func_149464_c(),
                y: packet.func_149467_d(),
                z: packet.func_149472_e(),
                yaw: packet.func_149462_g(),
                pitch: packet.func_149470_h(),
                onGround: packet.func_149465_i()
            }

            const simpleName = packet.class.getSimpleName();

            if (!this.fakePacketSent) {
                if (simpleName == 'C03PacketPlayer' || simpleName == 'C05PacketPlayerLook') {
                    Client.sendPacket(new C05PacketPlayerLook(this.yaw, this.pitch, packetData.onGround));
                } else if (simpleName == 'C04PacketPlayerPosition' || simpleName == 'C06PacketPlayerPosLook') {
                    Client.sendPacket(new C06PacketPlayerPosLook(packetData.x, packetData.y, packetData.z, this.yaw, this.pitch, packetData.onGround));
                }
                
                this.fakePacketSent = true;
            } else if (this.fakePacketSent) {
                if (simpleName == 'C03PacketPlayer' || simpleName == 'C05PacketPlayerLook') {
                    Client.sendPacket(new C03PacketPlayer(packetData.onGround));
                } else if (simpleName == 'C04PacketPlayerPosition' || simpleName == 'C06PacketPlayerPosLook') {
                    Client.sendPacket(new C04PacketPlayerPosition(packetData.x, packetData.y, packetData.z, packetData.onGround));
                }
            }

            if (this.callback != null) {
                this.callback();
                this.callback = null;
            }

            this.inProgress = false;
        }).setFilteredClass(C03PacketPlayer)

        this.renderRotate = register("renderEntity", (entity) => {
            if (!this.shouldRotate) return;
            if (entity.getEntity() != Player.getPlayer() || isNaN(this.yaw) || isNaN(this.pitch) || Player.getPlayer().field_70154_o) return;
            Player.getPlayer().field_70761_aq = this.yaw;
            Player.getPlayer().field_70759_as = this.yaw;
        }).setFilteredClass(EntityPlayer).unregister()

        register("packetReceived", () => {
            if (!this.shouldRotate) return;
            this.resetRotation();
        }).setFilteredClass(S08PacketPlayerPosLook)

        register('worldLoad', () => {
            if (!this.shouldRotate) return;
            this.resetRotation();
        })
    }

    setRotation(yaw, pitch, callback = null) {
        if (pitch < -90 || pitch > 90 || isNaN(yaw) || isNaN(pitch)) return;
        
        if ((Player.getRawYaw() + (yaw - Player.getYaw()) == this.yaw && pitch == this.pitch) && this.shouldRotate) {
            return
        };

        this.fakePacketSent = false;
        
        this.yaw = Player.getRawYaw() + (yaw - Player.getYaw());
        this.pitch = pitch;

        if (callback != null) {
            this.callback = callback;
        }

        this.shouldRotate = true;
        this.renderRotate.register()
    }
    
    resetRotation() {
        this.setRotation(Player.getRawYaw(), Player.getPitch());
        this.fakePacketSent = false;
        this.shouldRotate = false;
        this.callback = null;
        this.renderRotate.unregister()
        if (!Player.getPlayer()) return;
        Player.getPlayer().field_70177_z = Player.getRawYaw() + 0.001; 
    }
}