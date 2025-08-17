// thanks cyan cutie

import { S2DPacketOpenWindow, S2FPacketSetSlot } from "./mappings";
import playerUtils from "./playerUtils"

class leapHelper {
    constructor() {
        this.leapQueue = [];
        this.menuOpened = false;
        this.shouldLeap = false;
        this.inProgress = false;
        this.clickedLeap = false;

        register("packetReceived", (packet, event) => {
            if (!this.inQueue() || !this.menuOpened) return;

            const itemStack = packet.func_149174_e();
            const slot = packet.func_149173_d();
            const windowID = packet.func_149175_c();

            if (!windowID || !itemStack || !slot) return;

            if (slot > 35) {
                this.reloadGUI();
                playerUtils.sendMessage(`&cCouldn't find ${this.currentLeap()}`);
                return;
            }

            cancel(event);
            
            const item = new Item(itemStack);
            const itemName = item.getName().removeFormatting().toLowerCase();
            if (itemName !== this.currentLeap().toLowerCase()) return;
            playerUtils.sendWindowClick(windowID, slot, 0, 0);
            this.reloadGUI();
        }).setFilteredClass(S2FPacketSetSlot)

        register("packetReceived", (packet, event) => {
            if (!this.inQueue()) return;

            const title = ChatLib.removeFormatting(packet.func_179840_c().func_150254_d());
            this.WindowID = packet.func_148901_c();
    
            if (title !== "Spirit Leap") return;

            this.menuOpened = true;
            this.clickedLeap = false;
            cancel(event);
        }).setFilteredClass(S2DPacketOpenWindow)

        register("chat", () => {
            this.clickedLeap = false
            this.inProgress = false
            this.leapQueue.pop()
        }).setChatCriteria(/^This ability is on cooldown for (\d+)s\.$/)
    }

    inQueue() {
        return this.leapQueue.length > 0;
    }

    currentLeap() {
        return this.leapQueue[0];
    }

    reloadGUI () {
        this.menuOpened = false;
        this.leapQueue.shift();
        this.inProgress = false
    }

    queueLeap(name) {
        this.leapQueue.push(name);
    }

    autoLeap(name) {
        if (this.clickedLeap || this.inProgress) return;

        const leapID = Player.getInventory()?.getItems()?.find(a => a?.getName()?.removeFormatting() == "Infinileap")?.getID();
        if (!leapID) return;

        const leapSlot = parseInt(Player.getInventory().indexOf(leapID));
        if (leapSlot > 7 || leapSlot < 0) return;

        this.inProgress = true;
        Player.setHeldItemIndex(leapSlot);

        Client.scheduleTask(1, () => {
            playerUtils.rightClick();
            this.clickedLeap = true;
        })

        this.leapQueue.push(name);
    }
}

export default new leapHelper();