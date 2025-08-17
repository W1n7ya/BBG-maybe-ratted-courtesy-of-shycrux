import { S08PacketPlayerPosLook, Vec3 } from "../../../utils/mappings";

/**
 * @typedef {Object} S08Event
 * @property {{ x: Number, y: Number, z: Number }} position - The packet's position
 * @property {Vec3} vector - The packet position as a MC Vec3 object
 * @property {{ yaw: Number, pitch, Number }} rotation - The packet's rotation
 * @property {number} enumFlags - The enum flags of the packet
 */
const listeners = [];

const S08Listener = register("packetReceived", (packet, mcEvent) => {
    const position = {
        x: packet.func_148932_c(),
        y: packet.func_148928_d(),
        z: packet.func_148933_e()
    }

    const vector = new Vec3(position.x, position.y, position.z);

    const rotation = {
        yaw: packet.func_148931_f(),
        pitch: packet.func_148930_g()
    }

    const enumFlags = packet.func_179834_f();

    const event = {
        position,
        vector,
        rotation,
        enumFlags
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S08PacketPlayerPosLook).unregister();

/**
 * @param {(packet: any, event: S08Event, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S08Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S08Event, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S08Listener.unregister();
}

export default { addListener, removeListener };