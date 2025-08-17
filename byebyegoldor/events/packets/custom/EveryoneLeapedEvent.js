/**
 * @typedef {Object} EveryoneLeapedEvent
 */
const listeners = [];

function post() {
    for (let listener of listeners) listener();
}

/**
 * @param {() => void} listener 
 */
function addListener(listener) {
    listeners.push(listener);
}

/**
 * @param {() => void} listener 
 */
function removeListener(listener) {
    const index = listeners.indexOf(listener);
    if (index === -1) return;
    listeners.splice(index, 1);
}

export default { addListener, removeListener, post };