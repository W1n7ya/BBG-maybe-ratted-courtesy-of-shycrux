import { S32PacketConfirmTransaction } from "../../../utils/mappings";

/**
 * @typedef {Object} S32Event
 * @property {Number} actionNumber - The server action number
 * @property {Number} windowId - The server window ID
 */
const listeners = [];

const S32Listener = register("packetReceived", (packet, mcEvent) => {
    const actionNumber = packet.func_148890_d(); // why does s32 have these?
    const windowId = packet.func_148889_c();

    const event = {
        actionNumber,
        windowId
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S32PacketConfirmTransaction).unregister();

/**
 * @param {(packet: any, event: S32Event, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S32Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S32Event, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S32Listener.unregister();
}

export default { addListener, removeListener };