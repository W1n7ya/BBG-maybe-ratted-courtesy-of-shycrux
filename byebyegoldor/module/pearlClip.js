import { C03PacketPlayer, C05PacketPlayerLook, C06PacketPlayerPosLook, S08PacketPlayerPosLook, S32PacketConfirmTransaction } from "../utils/mappings";
import playerUtils from "../utils/playerUtils";
import rotationUtils from "../utils/rotationUtils";

register("command", (distance) => pearlClip(distance)).setName("pearlclip");

export function pearlClip(distance) {
	if (!distance || isNaN(distance)) return;
    distance = parseFloat(distance);

    new Thread(() => {
        if (!Player.getHeldItem().getName().includes("Ender Pearl")) {
            playerUtils.swap("Ender Pearl");
            Thread.sleep(100);
        }

        rotate(Player.getYaw(), 90, () => {
            playerUtils.rightClick();
    
            const teleportTrigger = register("packetReceived", (packet) => {
                const [x, z] = [packet.func_148932_c(), packet.func_148933_e()];
				const [yaw, pitch] = [Player.getYaw(), Player.getPitch()];

				rotationUtils.rotate(yaw, pitch);

                Client.scheduleTask(0, () => {
					playerUtils.setPosition(x, Player.getY() + distance, z);
					rotationUtils.rotate(yaw, pitch);
				});
				
                teleportTrigger.unregister();
            }).setFilteredClass(S08PacketPlayerPosLook);
        });
    }).start();
}

let rotating = false;
let rotations = null;
let onRotate = null;

function rotate(yaw, pitch, func) {
	rotations = [yaw, pitch];
	onRotate = func;
	//rotationUtils.rotate(yaw ?? Player.getYaw(), pitch ?? Player.getPitch());
	rotateTrigger.register();
}

const rotateTrigger = register("packetSent", (packet, event) => {
	if (rotations == null || onRotate == null || rotating) return;
	rotating = true;

	cancel(event);
	
	const [x, y, z] = [packet.func_149464_c(), packet.func_149467_d(), packet.func_149472_e()];
	const [yaw, pitch] = [packet.func_149462_g(), packet.func_149470_h()];
	const onGround = packet.func_149465_i();
	const moving = packet.func_149466_j();

	if (moving) Client.sendPacket(new C06PacketPlayerPosLook(x, y, z, rotations[0] ?? yaw, rotations[1] ?? pitch, onGround));
	else Client.sendPacket(new C05PacketPlayerLook(rotations[0] ?? yaw, rotations[1] ?? pitch, onGround));

	confirmTrigger.register();
}).setFilteredClass(C03PacketPlayer).unregister();

const confirmTrigger = register("packetReceived", () => {
	onRotate();

	confirmTrigger.unregister();
	rotateTrigger.unregister();

	rotating = false;
	rotations = null;
	onRotate = null;
}).setFilteredClass(S32PacketConfirmTransaction).unregister();