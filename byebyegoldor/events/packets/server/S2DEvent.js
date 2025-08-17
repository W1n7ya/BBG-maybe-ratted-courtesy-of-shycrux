import { S2DPacketOpenWindow } from "../../../utils/mappings";
import playerUtils from "../../../utils/playerUtils";

/**
 * @typedef {Object} S2DEvent
 * @property {Number} windowId - The ID of the window
 * @property {String} title - The title of the window
 * @property {Number} slotCount - The number of slots in the window
 * @property {Boolean} hasSlots - Whether the window has slots or not
 * @property {Number} entityId
 * @property {Boolean} isTerminal - Whether this window is a terminal
 */
const listeners = [];

const S2DListener = register("packetReceived", (packet, mcEvent) => {
    const windowId = packet.func_148901_c();
    const title = packet.func_179840_c().func_150254_d().removeFormatting();
    const slotCount = packet.func_148898_f();
    const hasSlots = packet.func_148900_g();
    const entityId = packet.func_148897_h();
    const isTerminal = playerUtils.termNames.some(regex => title.match(regex));

    const event = {
        windowId,
        title,
        slotCount,
        hasSlots,
        entityId,
        isTerminal
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S2DPacketOpenWindow).unregister();

/**
 * @param {(packet: any, event: S2DEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S2DListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S2DEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S2DListener.unregister();
}

export default { addListener, removeListener };