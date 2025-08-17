import { C0FPacketConfirmTransaction } from "../../../utils/mappings";

/**
 * @typedef {Object} C0FEvent
 * @property {Boolean} accepted - Whether the transaction was accepted or not
 * @property {Number} id - The ID of the transaction
 * @property {Number} windowId - The client window ID
 */
const listeners = [];

const C0FListener = register("packetSent", (packet, mcEvent) => {
    const accepted = packet.field_149535_c;
    const id = packet.func_149533_d();
    const windowId = packet.func_149532_c();

    const event = {
        accepted,
        id,
        windowId
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C0FPacketConfirmTransaction).unregister();

/**
 * @param {(packet: any, event: C0FEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C0FListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C0FEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C0FListener.unregister();
}

export default { addListener, removeListener };