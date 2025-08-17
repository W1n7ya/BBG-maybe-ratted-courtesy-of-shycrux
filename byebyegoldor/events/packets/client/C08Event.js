import { C08PacketPlayerBlockPlacement, EnumFacing, MCBlock, MCBlockPos, MCItemStack } from "../../../utils/mappings";
import worldUtils from "../../../utils/worldUtils";

/**
 * @typedef {Object} C08Event
 * @property {MCBlockPos} blockPos
 * @property {MCBlock} block
 * @property {MCItemStack} itemStack
 * @property {EnumFacing} placedBlockDirection
 * @property {{x: Number, y: Number, z: Number}} facing
 */
const listeners = [];

const C08Listener = register("packetSent", (packet, mcEvent) => {
    const blockPos = packet.func_179724_a();
    const block = worldUtils.getBlock([blockPos.func_177958_n(), blockPos.func_177956_o(), blockPos.func_177952_p()]);
    const itemStack = packet.func_149574_g();
    const placedBlockDirection = packet.func_149568_f();

    const facing = {
        x: packet.func_149573_h(),
        y: packet.func_149569_i(),
        z: packet.func_149575_j()
    }

    const event = {
        blockPos,
        block,
        itemStack,
        placedBlockDirection,
        facing
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(C08PacketPlayerBlockPlacement).unregister();

/**
 * @param {(packet: any, event: C08Event, mcEvent: CancellableEvent) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) C08Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: C08Event, mcEvent: CancellableEvent) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) C08Listener.unregister();
}

export default { addListener, removeListener };