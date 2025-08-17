import { S2EPacketCloseWindow } from "../../../utils/mappings";

/**
 * @typedef {Object} S2EEvent
 * @property {Number} windowId - The ID of the window
 */
const listeners = [];

const S2EListener = register("packetReceived", (packet, mcEvent) => {
    const windowId = packet.field_148896_a;

    const event = {
        windowId
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S2EPacketCloseWindow).unregister();

/**
 * @param {(packet: any, event: S2EEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S2EListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S2EEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S2EListener.unregister();
}

export default { addListener, removeListener };