import { S0DPacketCollectItem, MCEntity, MCItemStack } from "../../../utils/mappings";

/**
 * @typedef {Object} S0DEvent
 * @property {Number} entityId
 * @property {Number} itemEntityId
 * @property {MCEntity} entityItem
 * @property {MCItemStack} item
 * @property {String} itemName
 */
const listeners = [];

const S0DListener = register("packetReceived", (packet, mcEvent) => {
    const entityId = packet.func_149353_d();
    const itemEntityId = packet.func_149354_c();
    const entityItem = World.getWorld().func_73045_a(itemEntityId);
    const item = entityItem?.func_92059_d();
    const itemName = ChatLib.removeFormatting(entityItem?.func_92059_d()?.func_82833_r());

    const event = {
        entityId,
        itemEntityId,
        entityItem,
        item,
        itemName
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S0DPacketCollectItem).unregister();

/**
 * @param {(packet: any, event: S0DEvent, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S0DListener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S0DEvent, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S0DListener.unregister();
}

export default { addListener, removeListener };