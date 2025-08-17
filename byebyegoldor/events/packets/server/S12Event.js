import { S12PacketEntityVelocity } from "../../../utils/mappings";

/**
 * @typedef {Object} S12Event
 * @property {Number} entityId - The entity ID of the packet
 * @property {{ x: Number, y: Number, z: Number }} motion - The velocity of the packet
 */
const listeners = [];

const S12Listener = register("packetReceived", (packet, mcEvent) => {
    const entityId = packet.func_149412_c();
    if (entityId !== Player.getPlayer().func_145782_y()) return;

    const motion = {
        x: packet.func_149411_d(),
        y: packet.func_149410_e(),
        z: packet.func_149409_f()
    }

    const event = {
        entityId,
        motion
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S12PacketEntityVelocity).unregister();

/**
 * @param {(packet: any, event: S12Event, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S12Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S12Event, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S12Listener.unregister();
}

export default { addListener, removeListener };