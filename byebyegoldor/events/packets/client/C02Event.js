import { C02PacketUseEntity, Vec3 } from "../../../utils/mappings";

/**
 * @typedef {Object} C02Event
 * @property {C02Event.Action} action
 * @property {Entity} entity
 * @property {Vec3} hitVec
 */
const listeners = [];

const C02Listener = register("packetSent", (packet, mcEvent) => {
    const action = packet.func_149565_c();
    const entity = new Entity(World.getWorld().func_73045_a(packet.field_149567_a));
    const hitVec = packet.func_179712_b();

    const event = {
        action,
        entity,
        hitVec
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C02PacketUseEntity).unregister();

/**
 * @param {(packet: any, event: C02Event, mcEvent: CancellableEvent) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C02Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C02Event, mcEvent: CancellableEvent) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C02Listener.unregister();
}

export default { addListener, removeListener };