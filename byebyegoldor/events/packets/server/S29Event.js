import { S29PacketSoundEffect, Vec3 } from "../../../utils/mappings";

/**
 * @typedef {Object} S29Event
 * @property {String} name - The sound name
 * @property {Number} volume - The sound volume
 * @property {Number} pitch - The sound pitch
 * @property {{ x: Number, y: Number, z: Number }} position - The sound position
 * @property {Vec3} vector - The sound position as a MC Vec3 object
 */
const listeners = [];

const S29Listener = register("packetReceived", (packet, mcEvent) => {
    const position = {
        x: packet.func_149207_d(),
        y: packet.func_149211_e(),
        z: packet.func_149210_f()
    }

    const vector = new Vec3(...position);

    const name = packet.func_149212_c();
    const volume = packet.func_149208_g();
    const pitch = packet.func_149209_h();

    const event = {
        name,
        volume,
        pitch,
        position,
        vector
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S29PacketSoundEffect).unregister();

/**
 * @param {(packet: any, event: S29Event, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S29Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S29Event, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S29Listener.unregister();
}

export default { addListener, removeListener };