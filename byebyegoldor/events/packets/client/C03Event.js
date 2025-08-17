import { C03PacketPlayer, Vec3 } from "../../../utils/mappings";

/**
 * @typedef {Object} C03Event
 * @property {{ x: Number, y: Number, z: Number }} position - The player's position
 * @property {Vec3} vector - The player's position as a MC Vec3 object
 * @property {{ yaw: Number, pitch: Number }} rotation - The player's rotation
 * @property {Boolean} moving - Whether the player is moving or not (C04, C06)
 * @property {Boolean} rotating - Whether the player is rotating or not (C05, C06)
 * @property {Boolean} ground - Whether the player is on the ground or not
 */
const listeners = [];

const C03Listener = register("packetSent", (packet, mcEvent) => {
    const position = {
        x: packet.func_149464_c(),
        y: packet.func_149467_d(),
        z: packet.func_149472_e()
    }

    const vector = new Vec3(position.x, position.y, position.z);

    const rotation = {
        yaw: packet.func_149462_g(),
        pitch: packet.func_149470_h()
    }

    const moving = packet.func_149466_j();
    const rotating = packet.func_149463_k();
    const ground = packet.func_149465_i();

    const event = {
        position,
        vector,
        rotation,
        moving,
        rotating,
        ground
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C03PacketPlayer).unregister();

/**
 * @param {(packet: any, event: C03Event, mcEvent: CancellableEvent) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C03Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C03Event, mcEvent: CancellableEvent) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C03Listener.unregister();
}

export default { addListener, removeListener };