import { C0EPacketClickWindow, MCItemStack } from "../../../utils/mappings";

/**
 * @typedef {Object} C0EEvent
 * @property {Number} windowId - The ID of the window
 * @property {Number} slot - The slot clicked
 * @property {MCItemStack} clickedItem - The itemstack clicked
 * @property {Number} usedButton - The mouse button used
 * @property {Number} mode - The mode of the click
 * @property {Number} actionNumber - The action number of the click
 */
const listeners = [];

const C0EListener = register("packetSent", (packet, mcEvent) => {
    const windowId = packet.func_149548_c();
    const slot = packet.func_149544_d();
    const clickedItem = packet.func_149546_g();
    const usedButton = packet.func_149543_e();
    const mode = packet.func_149542_h();
    const actionNumber = packet.func_149547_f();

    const event = {
        windowId,
        slot,
        clickedItem ,
        usedButton,
        mode,
        actionNumber
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C0EPacketClickWindow).unregister();

/**
 * @param {(packet: any, event: C0EEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C0EListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C0EEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C0EListener.unregister();
}

export default { addListener, removeListener };