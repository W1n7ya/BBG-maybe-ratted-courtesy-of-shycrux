import { S2FPacketSetSlot, MCItemStack } from "../../../utils/mappings";

/**
 * @typedef {Object} S2FEvent
 * @property {Number} windowId - The ID of the window
 * @property {Number} slot - The slot index
 * @property {MCItemStack} itemStack - The item stack in the slot
 */
const listeners = [];

const S2FListener = register("packetReceived", (packet, mcEvent) => {
    const windowId = packet.func_149175_c();
    const slot = packet.func_149173_d();
    const itemStack = packet.func_149174_e();

    const event = {
        windowId,
        slot,
        itemStack
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S2FPacketSetSlot).unregister();

/**
 * @param {(packet: any, event: S2FEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S2FListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S2FEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S2FListener.unregister();
}

export default { addListener, removeListener };