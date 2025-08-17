import request from "../../requestV2";
import config from "../config";
import mathUtils from "./mathUtils";
import rotationUtils from "./rotationUtils";
import timerUtils from "./timerUtils";

import {
    C06PacketPlayerPosLook,
    C08PacketPlayerBlockPlacement,
    C09PacketHeldItemChange,
    C0BPacketEntityAction,
    C0DPacketCloseWindow,
    C0EPacketClickWindow,
    S02PacketChat,
    S2DPacketOpenWindow,
    S2EPacketCloseWindow,
    KeyBinding,
    MathHelper,
} from "./mappings";
import S02Event from "../events/packets/server/S02Event";

class playerUtils {
    constructor() {
        this.coords = {};
        this.airTicks = 0;
        this.isSneaking = false;
        this.inTerminal = false;
        this.inP3 = false;

        this.ping = 0;
        this.pinging = false;
        this.pingTimer = new timerUtils();

        this.keybinds = [
            new KeyBind(Client.getMinecraft().field_71474_y.field_74351_w),
            new KeyBind(Client.getMinecraft().field_71474_y.field_74368_y),
            new KeyBind(Client.getMinecraft().field_71474_y.field_74370_x),
            new KeyBind(Client.getMinecraft().field_71474_y.field_74366_z)
        ];

        this.sneakKeybind = new KeyBind(Client.getMinecraft().field_71474_y.field_74311_E);

        this.blacklistedPackets = [
            "C0FPacketConfirmTransaction",
            "C00PacketKeepAlive",
            "C00Handshake",
            "C00PacketLoginStart",
            "C00PacketServerQuery",
            "C01PacketPing",
            "C09PacketHeldItemChange",
            "C0BPacketEntityAction",
            "C16PacketClientStatus"
        ];

        this.termNames = [
            /^Click in order!$/,
            /^Select all the (.+?) items!$/,
            /^What starts with: '(.+?)'\?$/,
            /^Change all to same color!$/,
            /^Correct all the panes!$/,
            /^Click the button on time!$/
        ];

        register("command", () => this.setPosition(Math.floor(Player.getX()) + 0.5, Player.getY(), Math.floor(Player.getZ()) + 0.5)).setName("align");
        register("command", (yaw, pitch) => rotationUtils.rotate(yaw, pitch)).setName("rotate");

        register("tick", () => {
            if (Server.getIP() == "localhost" && !global.inFreeCam) {
                global.balancePackets = 400;
                Player.getPlayer().field_71075_bZ.func_82877_b(0.5);
                Player.getPlayer().func_110148_a(net.minecraft.entity.SharedMonsterAttributes.field_111263_d).func_111128_a(0.5);
                const block = World.getBlockAt(Player.getX(), Player.getY(), Player.getZ());

                if (block.type.getID() == 66) {
                    this.setMotion(Player.getMotionX(), 3.5, Player.getMotionZ());
                    Client.scheduleTask(1, () => this.setMotion(Player.getMotionX(), 3.5, Player.getMotionZ()));
                } else if (Player.getPlayer().func_180799_ab()) this.setMotion(Player.getMotionX(), 3.5, Player.getMotionZ());
            }
        })

        register("packetSent", (packet, event) => {
            const action = packet.func_180764_b();
        
            if (action == C0BPacketEntityAction.Action.START_SNEAKING) {
                if (this.isSneaking) {
                    this.sendDebugMessage("Cancelled START_SNEAKING");
                    return cancel(event);
                }

                this.isSneaking = true;
            } else if (action == C0BPacketEntityAction.Action.STOP_SNEAKING) {
                if (!this.isSneaking) {
                    this.sendDebugMessage("Cancelled STOP_SNEAKING");
                    return cancel(event);
                }

                this.isSneaking = false;
            }
        }).setFilteredClass(C0BPacketEntityAction)

        register("packetSent", (packet, event) => {
            if (!event.isCancelled()) this.slot = packet.func_149614_c();
        }).setFilteredClass(C09PacketHeldItemChange);

        register("packetReceived", (packet, event) => {
            const message = ChatLib.removeFormatting(packet.func_148915_c().func_150260_c());

            if (this.pinging && message.includes("/@@@@@")) {
                cancel(event)
                this.ping = this.pingTimer.getTimePassed();
                this.pinging = false;
            }
        }).setFilteredClass(S02PacketChat)

        register("worldUnload", () => this.inTerminal = false);

        register("packetReceived", (packet) => {
            try {
                const windowName = packet.func_179840_c().func_150254_d().removeFormatting();
                if (this.termNames.some(regex => windowName.match(regex))) this.inTerminal = true;
                else this.inTerminal = false;
            } catch (e) {
                this.sendMessage("&7Please run /ct reload");
            }
        }).setFilteredClass(S2DPacketOpenWindow)
        
        register("packetReceived", () => this.inTerminal = false).setFilteredClass(S2EPacketCloseWindow);
        register("packetSent", () => this.inTerminal = false).setFilteredClass(C0DPacketCloseWindow);

        register("step", () => {
            if (!Server.getIP()?.includes("hypixel")) return;
            this.pinging = true;
            this.pingTimer.reset();
            ChatLib.command("/@@@@@");
        }).setDelay(3);

        S02Event.addListener((packet, event, mcEvent) => {
            if (event.unformatted === "[BOSS] Goldor: Who dares trespass into my domain?") this.inP3 = true;
            else if (event.unformatted === "The Core entrance is opening!") this.inP3 = false;
        })
    }

    /**
     * Gets the player's render pos distance from the coordinates
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
    */
    getRenderDistance(x, y, z) {
        const renderManager = Client.getMinecraft().func_175598_ae();
        return Math.pow(renderManager.field_78730_l - x, 2) + Math.pow(renderManager.field_78731_m - 1 - y, 2) + Math.pow(renderManager.field_78728_n - z, 2);
    }

    /**
     * Gets the player's actual pos distance from the coordinates
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
    */
    getDistance(x, y, z) {
        return Math.pow(Player.getX() - x, 2) + Math.pow(Player.getY() - 1 - y, 2) + Math.pow(Player.getZ() - z, 2);
    }

    /**
     * Sends a C08PacketPlayerBlockPlacement
    */
    rightClick() {
        if (Player.getHeldItemIndex() !== this.slot) {
            this.sendMessage("Prevented a 0 tick swap");
            Client.scheduleTask(1, () => this.rightClick());
            return;
        }

        Client.sendPacket(new C08PacketPlayerBlockPlacement(Player.getHeldItem().getItemStack()));
    }

    /**
     * Makes the player left click
    */
    leftClick() {
        const method = Client.getMinecraft().getClass().getDeclaredMethod("func_147116_af");
        method.setAccessible(true);
        method.invoke(Client.getMinecraft());
    }

    /**
     * Makes the player sneak
     * @param {Boolean} boolean
    */
    setSneaking(boolean) {
        this.sneakKeybind.setState(boolean)
        KeyBinding.func_74510_a(this.sneakKeybind.getKeyCode(), boolean)
    }

    /**
     * Sets the player's position
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
    */
    setPosition(x, y, z) {
        Player.getPlayer().func_70107_b(x, y, z);
    }

    /**
     * Sets the player's motion
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
    */
    setMotion(x, y, z) {
        Player.getPlayer().func_70016_h(x, y, z);
    }

    /**
     * Swaps to an item with the provided name
     * @param {String} name
    */
    swap(name) {
        const item = Player?.getInventory()?.getItems()?.findIndex(item => item?.getName()?.toLowerCase()?.includes(name?.toLowerCase()));
        if (item <= 8 && item >= 0) {
            this.sendDebugMessage(`&7Swapping to ${name}`);
            Player.setHeldItemIndex(item);
        }
    }

    /**
     * Sets every movement keybind to be un-pressed
    */
    stopMovement() {
        this.keybinds.forEach(keybind => keybind.setState(false));
    }

    /**
     * Re-handles the keybinds
    */
    handleKeys() {
        this.keybinds.forEach(keybind => keybind.setState(Keyboard.isKeyDown(keybind.getKeyCode())));
    }

    /**
     * Makes the player jump
    */
    jump() {
        KeyBinding.func_74510_a(Client.getMinecraft().field_71474_y.field_74314_A.func_151463_i(), true);
        Client.scheduleTask(1, () => KeyBinding.func_74510_a(Client.getMinecraft().field_71474_y.field_74314_A.func_151463_i(), false));
    }

    /**
     * Sets the player's motion to sprint speed at a yaw
     * @param {Number} yaw
    */
    hClip(yaw, boost = true) {
        this.stopMovement();
        this.setMotion(0, Player.getMotionY(), 0);

        Client.scheduleTask(0, () => this.setSpeed(boost ? this.getWatchdogSpeed() : this.getSprintSpeed(), yaw));
        Client.scheduleTask(1, () => this.handleKeys());
    }
    
    /**
     * Sets the player's motion at a yaw
     * @param {Number} speed 
     * @param {Number} yaw
    */
    setSpeed(speed, yaw) {
        const radians = mathUtils.toRadians(yaw);

        let sin = -Math.sin(radians) * speed;
        let cos = Math.cos(radians) * speed;

        this.setMotion(sin, Player.getMotionY(), cos);
    }

    /**
     * Returns the max speed watchdog allows
    */
    getWatchdogSpeed() {
        return ((5.6121 + 5.6121 * config().hClipBoost / 100) / 20) * (Player.getPlayer().field_71075_bZ.func_75094_b() * 10);
    }

    /**
     * Returns the sprint speed of the player
    */
    getSprintSpeed() {
        return (5.6121 / 20) * (Player.getPlayer().field_71075_bZ.func_75094_b() * 10);
    }

    /**
     * Gets the air decay for the player
    */
    getAirDecay(dir) {
        const player = Player.getPlayer();

        const lastTickPos = [player.field_70142_S, player.field_70137_T, player.field_70136_U];
        const lastTickMotion = [Player.getX() - lastTickPos[0], Player.getZ() - lastTickPos[2]];

        const motionX = lastTickMotion[0] * 1 * 0.91 + 0.02 * 1.3 * Math.sin(dir);
        const motionZ = lastTickMotion[1] * 1 * 0.91 + 0.02 * 1.3 * Math.cos(dir);

        return [motionX, motionZ];
    }

    /**
     * Prints a message in chat
     * @param {String} message
    */
    sendMessage(message) {
        ChatLib.chat(`&6[&8byebyegoldor&6]&r ${message}`);
    }

    /**
     * Prints a debug message in chat
     * @param {String} message
    */
    sendDebugMessage(message) {
        if (config().debugMessages) ChatLib.chat(`&6[&8byebyegoldor&6]&r ${message}`);
    }

    /**
     * Returns the player's held item id
    */
    getHeldItemID() {
        return Player?.getHeldItem()?.getNBT()?.get("tag")?.get("ExtraAttributes")?.getString("id");
    }

    /**
     * Sends a click window packet to the server
     * @param {Number} windowId
     * @param {Number} slot
     * @param {Number} clickType
     * @param {Number} actionNumber
    */
    sendWindowClick(windowId, slot, clickType, actionNumber = 0) {
        Client.sendPacket(new C0EPacketClickWindow(windowId ?? Player.getContainer().getWindowId(), slot, clickType ?? 0, 0, null, actionNumber));
    }

    /**
     * @param {Entity} entity
     * 
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} z1
     * 
     * @param {Number} x2
     * @param {Number} y2
     * @param {Number} z2
     * 
     * @returns {Boolean} Whether the entities coordinates are inside of the box
    */
    isInBox(entity, x1, y1, z1, x2, y2, z2) {
        const x = entity.getX();
        const y = entity.getY();
        const z = entity.getZ();
    
        return (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) &&
                y >= Math.min(y1, y2) && y <= Math.max(y1, y2) &&
                z >= Math.min(z1, z2) && z <= Math.max(z1, z2));
    }

    isHoldingLeap() {
        return ["SPIRIT_LEAP", "INFINITE_SPIRIT_LEAP"].includes(this.getHeldItemID());
    }

    /**
     * Returns the player's max walk speed
    */
    getWalkCapabilities() {
        return Player.getPlayer().field_71075_bZ.func_75094_b();
    }

    /**
     * Swaps to an item, rotates, and uses it
     * @param {String} item - the name of the item being used
     * @param {Array} rotation - [yaw, pitch] being used
     * @param {Boolean} sneak - sneak before using the item, and unsneak after using the item
     * @param {Boolean} oneTick - whether to use a balanced packet to rotate instantly
     * @param {Function} onRotate - task to run after rotated
    */
    useItem(item, rotation, sneak, oneTick=false, onRotate, coords=[Player.getX(), Player.getZ()]) {
        this.sendDebugMessage(`&7${item}, sneak:${sneak}, yaw:${rotation[0]}, pitch:${rotation[1]}, onetick:${oneTick}`);

        new Thread(() => {
            if (sneak && !Player.isSneaking()) {
                this.setSneaking(true);
                Thread.sleep(50);
            } else {
                this.setSneaking(false);
                Thread.sleep(50);
            }

            if (!Player?.getHeldItem()?.getName()?.includes(item)) {
                this.swap(item);
                Thread.sleep(100);
            }

            if (global.balancePackets > 5 && oneTick) {
                global.balancePackets--;
                this.setPosition(coords[0], Player.getY(), coords[1]);
                Client.sendPacket(new C06PacketPlayerPosLook(Player.getX(), Player.getPlayer().func_174813_aQ().field_72338_b, Player.getZ(), rotation[0], rotation[1], Player.asPlayerMP().isOnGround()))
                
                onRotate;
            } else {
                this.setPosition(coords[0], Player.getY(), coords[1]);

                rotationUtils.rotate(MathHelper.func_76142_g(rotation[0] + 2.5), rotation[1]);
                Client.scheduleTask(0, () => {
                    rotationUtils.rotate(...rotation);
                    onRotate;
                });
            }
        }).start();
    }
}

export default new playerUtils();
