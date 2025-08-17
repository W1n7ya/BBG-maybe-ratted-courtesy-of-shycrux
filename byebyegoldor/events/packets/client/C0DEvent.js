import { C0DPacketCloseWindow } from "../../../utils/mappings";

/**
 * @typedef {Object} C0DEvent
 * @property {number} windowId - The ID of the window
 */
const listeners = [];

const C0DListener = register("packetSent", (packet, mcEvent) => {
    const windowId = packet.field_149556_a;

    const event = {
        windowId
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C0DPacketCloseWindow).unregister();

/**
 * @param {(packet: any, event: C0DEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C0DListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C0DEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C0DListener.unregister();
}

export default { addListener, removeListener };