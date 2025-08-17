import playerUtils from "../../../utils/playerUtils";
import S02Event from "../server/S02Event";
import S32Event from "../server/S32Event";

/**
 * @typedef {Object} DeathTickEvent
 */
const listeners = [];

let ticks = 0;

const worldListener = register("worldLoad", () => ticks = 0).unregister();

const S32Listener = (packet, event, mcEvent) => {
    if (!playerUtils.inP3) return;
    ticks++;
    if (ticks % 60 == 60) for (let listener of listeners) listener();
}

/**
 * @param {() => void} listener 
 */
function addListener(listener) {
    if (listeners.length === 0) {
        S32Event.addListener(S32Listener);
        worldListener.register();
    }

    listeners.push(listener);
}

/**
 * @param {() => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
    if (listeners.length === 0) {
        S32Event.removeListener(S32Listener);
        worldListener.unregister();
    }
}

export default { addListener, removeListener };