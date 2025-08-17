import config from "../config"

export function leftClick() {
    const leftClickMethod = Client.getMinecraft().getClass().getDeclaredMethod("func_147116_af", null);
    leftClickMethod.setAccessible(true);
    leftClickMethod.invoke(Client.getMinecraft(), null);
}
let swapping = false; // Fix: should be false initially

export function swaptoName(items) {
    const index = Player?.getInventory()?.getItems()?.findIndex(item => item?.getName()?.toLowerCase()?.includes(items));
    if (index < 0 || index > 8) {
        return false;
    }
    Player.setHeldItemIndex(index);
    swapping = true;
    return true;
}

let lastClick = 0;
let lClicking = true;
let inP3 = false;

register("chat", (message) => {
    inP3 = true;
}).setCriteria("[BOSS] Storm: I should have known that I stood no chance.");

register("chat", (message) => {
    inP3 = false;
}).setCriteria("The Core entrance is opening!");

register("worldUnload", () => {
    inP3 = false;
});

register("tick", () => {
    const settings = config();
    if (!settings.autoTnt) return;

    let lookingAt = Player.lookingAt()?.toString() || "";
    if (lookingAt.includes("double_plant") || lookingAt.toLowerCase().includes("lilac", "rose", "tallgrass", "fern", "tallgrass")) {
        const heldItem = Player.getHeldItem();
        // Always try to switch if not holding infinityboom
        if (!heldItem || !heldItem.getName()?.toLowerCase().includes("tnt")) {
            // Only set swapping true if swaptoName succeeds
            if (swaptoName("infinityboom")) {
                // Wait for next tick to left click after switching
                return;
            } else {
                // If not found, do not block future attempts
                return;
            }
        }
        // Now holding infinityboom, proceed to click
        const currentTime = Date.now();
        const cps = settings.autoTntCPS || 5;
        const delay = 1000 / cps;
        if (currentTime - lastClick >= delay) {
            leftClick();
            lastClick = currentTime;
        }
    }
});