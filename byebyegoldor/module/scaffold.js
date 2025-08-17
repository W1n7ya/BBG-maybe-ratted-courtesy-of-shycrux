import settings from "../config";
const data = settings();

let isScaffolding = false;
let offGroundTicks = 0;
let onGroundTicks = 0;
let ticksSinceJoin = 0;
let scaffoldRetryCount = 0;
const maxRetries = 10;

register("tick", () => {
    if (World.isLoaded()) {
        ticksSinceJoin++;
    } else {
        ticksSinceJoin = 0;
        debugMessage(`Tick: World.isLoaded() is false (ticksSinceJoin: ${ticksSinceJoin})`);
    }

    if (!data.scaffold) {
        debugMessage(`Tick: Scaffold is disabled (ticksSinceJoin: ${ticksSinceJoin})`);
        return;
    }

    if (ticksSinceJoin < 10) {
        debugMessage(`Tick: World not ready (ticksSinceJoin: ${ticksSinceJoin})`);
        return;
    }

    const player = Player.getPlayer();
    if (!player) {
        debugMessage("Tick: Player object is null");
        return;
    }

    try {
        debugMessage(`Tick: Player type: ${player.getClass().getName()}`);
        const serverData = Client.getMinecraft()?.func_147104_D();
        debugMessage(`Tick: Server: ${serverData ? serverData.serverIP || "singleplayer" : "unknown"}`);
    } catch (e) {
        debugMessage(`Tick: Failed to get server info: ${e.message}`);
    }

    try {
        if (player.onGround) {
            onGroundTicks++;
            offGroundTicks = 0;
        } else {
            offGroundTicks++;
            onGroundTicks = 0;
        }
    } catch (e) {
        debugMessage(`Tick: Error checking onGround: ${e.message}`);
    }

    try {
        debugMessage(`Tick: Player at ${Math.floor(player.posX)}, ${Math.floor(player.posY) - 1}, ${Math.floor(player.posZ)}, Block below: ${World.getBlockAt(Math.floor(player.posX), Math.floor(player.posY) - 1, Math.floor(player.posZ)).getType().getName() || "unknown"}`);
    } catch (e) {
        debugMessage(`Tick: Error getting player position: ${e.message}`);
    }

    scaffold();
});

register("step", () => {
    if (!data.scaffold || !data.safewalk) return;
    const player = Player.getPlayer();
    if (!player || !player.onGround) return;

    const x = Math.floor(player.posX);
    const y = Math.floor(player.posY) - 1;
    const z = Math.floor(player.posZ);
    const blockBelow = World.getBlockAt(x, y, z);

    if (blockBelow.getType().getID() === 0) {
        if (data.safewalkMode === "Strict") {
            player.motionX = 0;
            player.motionZ = 0;
            debugMessage("Safewalk (Strict): Stopped movement near edge");
        } else {
            player.motionX *= 0.05;
            player.motionZ *= 0.05;
            debugMessage("Safewalk (Normal): Slowed movement near edge");
        }
    }
}).setFps(100);

function scaffold() {
    if (isScaffolding) {
        debugMessage("Scaffold: Already scaffolding, skipping");
        return;
    }
    isScaffolding = true;

    const mc = Client.getMinecraft();
    if (!mc) {
        debugMessage("Scaffold: Minecraft client is null");
        isScaffolding = false;
        return;
    }

    let pe = mc.thePlayer;
    if (!pe) {
        pe = Player.getPlayer();
        if (!pe) {
            scaffoldRetryCount++;
            if (scaffoldRetryCount >= maxRetries) {
                debugMessage(`Scaffold: Player entity is null after ${maxRetries} retries, giving up`);
                scaffoldRetryCount = 0;
                isScaffolding = false;
                return;
            }
            debugMessage(`Scaffold: Player entity is null, retrying (${scaffoldRetryCount}/${maxRetries})`);
            isScaffolding = false;
            return;
        }
    }
    scaffoldRetryCount = 0;

    const world = mc.theWorld;
    if (!world && !World.isLoaded()) {
        scaffoldRetryCount++;
        if (scaffoldRetryCount >= maxRetries) {
            debugMessage(`Scaffold: World is null and World.isLoaded() is false after ${maxRetries} retries, giving up`);
            scaffoldRetryCount = 0;
            isScaffolding = false;
            return;
        }
        debugMessage(`Scaffold: World is null and World.isLoaded() is false, retrying (${scaffoldRetryCount}/${maxRetries})`);
        isScaffolding = false;
        return;
    } else if (!world && World.isLoaded()) {
        debugMessage("Scaffold: World is null but World.isLoaded() is true, proceeding with caution");
    }
    scaffoldRetryCount = 0;

    if (Client.currentGui !== null && Client.currentGui !== undefined) {
        try {
            debugMessage(`Scaffold: GUI detected (type: ${Client.currentGui?.getClass?.()?.getName?.() || "unknown"})`);
            debugMessage("Scaffold: Bypassing GUI check for testing, proceeding with caution");
        } catch (e) {
            debugMessage(`Scaffold: Error inspecting GUI: ${e.message}`);
        }
    }

    let held = pe.inventory?.getCurrentItem();
    if (!held) {
        held = Player.getHeldItem();
        if (!held) {
            debugMessage(`Scaffold: No item held in hand (inventory: ${pe.inventory ? "available" : "null"})`);
            isScaffolding = false;
            return;
        }
    }

    try {
        const item = held.getItem();
        const ItemBlock = Java.type("net.minecraft.item.ItemBlock");
        const isBlockItem = item instanceof ItemBlock;
        debugMessage(`Scaffold: Held item - Name: ${held.getUnlocalizedName?.() || "unknown"}, Class: ${item?.getClass?.()?.getName?.() || "unknown"}, Is ItemBlock: ${isBlockItem}, Item ID: ${item?.getRegistryName?.() || "unknown"}`);
        if (!isBlockItem) {
            debugMessage("Scaffold: Held item is not a valid block");
            isScaffolding = false;
            return;
        }
    } catch (e) {
        debugMessage(`Scaffold: Error checking held item: ${e.message}`);
        isScaffolding = false;
        return;
    }

    try {
        pe.func_70031_b(true); // setSprinting(true)
        debugMessage("Scaffold: Enabled sprinting");
    } catch (e) {
        debugMessage(`Scaffold: Error enabling sprinting: ${e.message}`);
    }

    const placement = findPlacement();
    if (!placement) {
        debugMessage("Scaffold: No valid placement found");
        isScaffolding = false;
        return;
    }

    const rot = calculateRotation(placement);
    try {
        Player.setYaw(rot.yaw);
        Player.setPitch(rot.pitch);
        debugMessage(`Scaffold: Set rotation - Yaw: ${rot.yaw}, Pitch: ${rot.pitch}`);
    } catch (e) {
        debugMessage(`Scaffold: Error setting rotation: ${e.message}`);
    }

    placeBlock(placement);
    isScaffolding = false;
}

function findPlacement() {
    const player = Player.getPlayer();
    const px = Math.floor(player?.posX || 0);
    const py = Math.floor(player?.posY || 0);
    const pz = Math.floor(player?.posZ || 0);
    const range = 3;
    const possibilities = [];

    debugMessage(`FindPlacement: Checking position ${px}, ${py - 1}, ${pz}`);
    try {
        const blockBelow = World.getBlockAt(px, py - 1, pz);
        debugMessage(`FindPlacement: Block below - Type: ${blockBelow.getType().getName() || "unknown"}, ID: ${blockBelow.getType().getID()}`);
        if (blockBelow.getType().getID() === 0) {
            const adj = getAdjacent(px, py - 1, pz);
            if (adj) {
                debugMessage(`FindPlacement: Found adjacent block at ${adj.pos.x}, ${adj.pos.y}, ${adj.pos.z}`);
                possibilities.push(adj);
            } else {
                debugMessage("FindPlacement: No adjacent block found for position below");
            }
        } else {
            debugMessage("FindPlacement: Block below is not air");
        }
    } catch (e) {
        debugMessage(`FindPlacement: Error checking block below: ${e.message}`);
    }

    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            for (let dz = -range; dz <= range; dz++) {
                if (dx === 0 && dy === -1 && dz === 0) continue;
                const x = px + dx, y = py + dy, z = pz + dz;
                try {
                    const block = World.getBlockAt(x, y, z);
                    if (block.getType().getID() === 0) {
                        const adj = getAdjacent(x, y, z);
                        if (adj) {
                            debugMessage(`FindPlacement: Found adjacent block at ${adj.pos.x}, ${adj.pos.y}, ${adj.pos.z} for air at ${x}, ${y}, ${z}`);
                            possibilities.push(adj);
                        }
                    }
                } catch (e) {
                    debugMessage(`FindPlacement: Error checking block at ${x}, ${y}, ${z}: ${e.message}`);
                }
            }
        }
    }

    if (!possibilities.length) {
        debugMessage("FindPlacement: No placement possibilities found");
        return null;
    }

    possibilities.sort((a, b) => {
        const px = Player.getPlayer()?.posX || 0;
        const py = Player.getPlayer()?.posY || 0;
        const pz = Player.getPlayer()?.posZ || 0;
        const da = distSq(px, py, pz, a.pos.x, a.pos.y, a.pos.z);
        const db = distSq(px, py, pz, b.pos.x, b.pos.y, b.pos.z);
        return da - db;
    });

    debugMessage(`FindPlacement: Found ${possibilities.length} placement possibilities, using closest at ${possibilities[0].pos.x}, ${possibilities[0].pos.y}, ${possibilities[0].pos.z}`);
    return possibilities[0];
}

function getAdjacent(x, y, z) {
    const BlockPos = Java.type("net.minecraft.util.BlockPos");
    const EnumFacing = Java.type("net.minecraft.util.EnumFacing");
    const dirs = [
        { dx: 1, dy: 0, dz: 0, face: EnumFacing.WEST },
        { dx: -1, dy: 0, dz: 0, face: EnumFacing.EAST },
        { dx: 0, dy: 1, dz: 0, face: EnumFacing.DOWN },
        { dx: 0, dy: -1, dz: 0, face: EnumFacing.UP },
        { dx: 0, dy: 0, dz: 1, face: EnumFacing.NORTH },
        { dx: 0, dy: 0, dz: -1, face: EnumFacing.SOUTH },
    ];

    for (const { dx, dy, dz, face } of dirs) {
        try {
            const b = World.getBlockAt(x + dx, y + dy, z + dz);
            debugMessage(`GetAdjacent: Checking ${x + dx}, ${y + dy}, ${z + dz} - Type: ${b.getType().getName() || "unknown"}, ID: ${b.getType().getID()}`);
            if (b.getType().getID() !== 0) {
                return {
                    pos: new BlockPos(x + dx, y + dy, z + dz),
                    face
                };
            }
        } catch (e) {
            debugMessage(`GetAdjacent: Error checking block at ${x + dx}, ${y + dy}, ${z + dz}: ${e.message}`);
        }
    }
    return null;
}

function calculateRotation({ pos }) {
    const player = Player.getPlayer();
    const px = player?.posX || 0;
    const py = (player?.posY || 0) + (player?.getEyeHeight?.() || 1.62);
    const pz = player?.posZ || 0;
    const dx = pos.x + 0.5 - px;
    const dy = pos.y + 0.5 - py;
    const dz = pos.z + 0.5 - pz;
    const distance = Math.sqrt(dx * dx + dz * dz);
    let yaw = (Math.atan2(dz, dx) * 180 / Math.PI) - 90;
    if (yaw < 0) yaw += 360;
    const pitch = (-Math.atan2(dy, distance) * 180 / Math.PI);
    return { yaw, pitch };
}

function placeBlock({ pos, face }) {
    const C08 = Java.type("net.minecraft.network.play.client.C08PacketPlayerBlockPlacement");
    const C0A = Java.type("net.minecraft.network.play.client.C0APacketAnimation");
    const BlockPos = Java.type("net.minecraft.util.BlockPos");

    const mc = Client.getMinecraft();
    const pe = mc?.thePlayer || Player.getPlayer();
    const held = pe?.inventory?.getCurrentItem() || Player.getHeldItem();

    if (!pe || !held) {
        debugMessage("PlaceBlock: Player or item not available");
        return;
    }

    try {
        const packet = new C08(
            new BlockPos(pos.x, pos.y, pos.z),
            face.getIndex(),
            held,
            0.5, 0.5, 0.5
        );
        debugMessage(`PlaceBlock: Sending packet for ${pos.x}, ${pos.y}, ${pos.z}, Face: ${face.getName()}`);
        Client.sendPacket(packet);
        Client.sendPacket(new C0A());
        debugMessage(`Placed block at ${pos.x}, ${pos.y}, ${pos.z}`);
    } catch (e) {
        debugMessage(`Failed to place block: ${e.message}`);
    }
}

function debugMessage(msg) {
    if (data.debug) ChatLib.chat(`&7[DEBUG] ${msg}`);
}

function distSq(x1, y1, z1, x2, y2, z2) {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2;
}