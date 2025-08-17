import { S02PacketChat, IChatComponent, StringUtils } from "../../../utils/mappings";

/**
 * @typedef {Object} S02Event
 * @property {IChatComponent} chatComponent - The chat component
 * @property {String} formatted - The formatted text
 * @property {String} unformatted - The unformatted text
 * @property {Number} type - The type of the packet (1: "Chat", 2: "Action bar")
 */
const listeners = [];

const S02Listener = register("packetReceived", (packet, mcEvent) => {
    const chatComponent = packet.func_148915_c();
    const formatted = chatComponent.func_150254_d();
    const unformatted = StringUtils.func_76338_a(chatComponent.func_150260_c()); 
    const type = packet.func_179841_c();

    const event = {
        chatComponent,
        formatted,
        unformatted,
        type
    }

    for (let listener of listeners) listener(packet, event, mcEvent);
}).setFilteredClass(S02PacketChat).unregister();

/**
 * @param {(packet: any, event: S02Event, mcEvent: any) => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) S02Listener.register();
    listeners.push(listener);
}

/**
 * @param {(packet: any, event: S02Event, mcEvent: any) => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) S02Listener.unregister();
}

export default { addListener, removeListener };