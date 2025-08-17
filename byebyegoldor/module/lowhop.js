// Sico: Advanced movement and combat module for Minecraft 1.8.9
// Updated to fix StackOverflowError in mayu scaffold mode with recursion prevention

let lowhopEnabled = false;
let speedEnabled = false;
let bpsEnabled = false;
let scaffoldEnabled = false;
let aimAssistEnabled = false;
let killAuraEnabled = false;
let velocityEnabled = false;
let activeLowhopMode = null;
let activeSpeedMode = null;
let activeScaffoldMode = "godbridge";
let scaffoldOverlay = false;
let scaffoldKeybind = null;
let offGroundTicks = 0;
let lastJump = 0;
let lastScaffoldPlace = 0;
let blinkActive = false;
let storedPackets = [];
let debugMode = true;
let adjustableMode = false;
let lastYaw = 0;
let speedReduction = 1.0;
let yawChangeRate = 0;
let lastDirection = 0;
let motionSmoothing = 0.95;
let lagBackMitigation = 0.99;
let bpsX = 10;
let bpsY = 10;
let scaffoldOverlayX = 10;
let scaffoldOverlayY = 30;
let bpsDisplay = true;
let lastPosition = null;
let bpsValue = 0;
let lastTickTime = Date.now();
let wasSneaking = false;
let lastKeyPressTime = 0;
let isKeybindPressed = false;
let lastDebugTime = 0;
let debugCooldown = 500;
let slotErrors = [];
let isScaffolding = false; // New flag to prevent recursion

// Adjustable settings
let speedMultiplier = 1.05;
let jumpHeight = 0.001;
let turnSpeed = 0.08;
let forwardBoost = 1.10;
let directionChangeBoost = 1.15;
let predictMotionScale = 0.95;
let predictTurnDamp = 0.1;
let predictDescentSpeed = 0.98;
let groundstrafeSpeed = 1.10;
let groundstrafeTurnSpeed = 0.02;
let groundstrafeJumpFreq = 300;
let groundSpeed = 1.05;
let groundBlinkFreq = 6;
let groundFriction = 0.995;
let airspeedJump = 0.5;
let airspeedMotion = 1.01;
let airspeedDecay = 0.998;
let groundstrafeBaseSpeed = 0.38;
let groundstrafeJumpHeight = 0.5;
let airspeedBaseSpeed = 0.34;
let airspeedJumpHeight = 0.55;
let predictBaseSpeed = 0.38;
let predictJumpHeight = 0.5;
let bhopBaseSpeed = 0.42;
let bhopJumpHeight = 0.54;
let longjumpBoost = 0.5;
let longjumpJumpHeight = 0.8;
let longjumpBlinkTicks = 8;
let longjumpGlideDecay = 0.99;
let eightTickMotionAdjust = 0.38;
let eightTickReduction1 = 0.10;
let eightTickReduction2 = 0.15;
let godbridgeDelay = 100;
let godbridgeJumpFreq = 200;
let telebridgeRange = 1;
let crouchDelay = 150;
let crouchStrict = false;
let ravenDelay = 80;
let ravenJumpFreq = 180;
let mayuDelay = 90;
let mayuJumpFreq = 190;
let mayuPredictRange = 1; // Reduced to minimize scanning
let upwardBridgeEnabled = true;
let aimAssistStrength = 0.5;
let killAuraRange = 4.5;
let velocityReduction = 0.6;
let strafeSmoothing = 0.92;

// Utility functions
function debugMessage(message) {
    if (!debugMode) return;
    const now = Date.now();
    if (now - lastDebugTime < debugCooldown) return;
    ChatLib.chat(`&4[&6Sico Debug&7] ${message}`);
    lastDebugTime = now;
}

function isMoving() {
    const player = Player.getPlayer();
    if (!player) return false;
    const backward = new KeyBind(Client.getMinecraft().field_71474_y.field_74368_y).isKeyDown();
    return backward || Math.abs(player.field_70159_w) > 0.005 || Math.abs(player.field_70179_y) > 0.005;
}

function jumpDown() {
    return new KeyBind(Client.getMinecraft().field_71474_y.field_74314_A).isKeyDown();
}

function isSneaking() {
    return new KeyBind(Client.getMinecraft().field_71474_y.field_74311_E).isKeyDown();
}

function toggleSneak(state) {
    const sneakKey = new KeyBind(Client.getMinecraft().field_71474_y.field_74311_E);
    sneakKey.setState(state);
    wasSneaking = state;
    debugMessage(`Sneak state: ${state}`);
}

function getAllowedHorizontalDistance() {
    return 0.2873;
}

function strafe(speed = null) {
    const player = Player.getPlayer();
    if (!player) return;
    if (speed === null) speed = Math.sqrt(player.field_70159_w ** 2 + player.field_70179_y ** 2);
    
    const forward = new KeyBind(Client.getMinecraft().field_71474_y.field_74351_w).isKeyDown() ? 1 : 
                    new KeyBind(Client.getMinecraft().field_71474_y.field_74368_y).isKeyDown() ? -1 : 0;
    const strafe = new KeyBind(Client.getMinecraft().field_71474_y.field_74366_z).isKeyDown() ? 1 :
                   new KeyBind(Client.getMinecraft().field_71474_y.field_74370_x).isKeyDown() ? -1 : 0;
    
    if (forward === 0 && strafe === 0) return;
    
    const yaw = player.field_70177_z * Math.PI / 180;
    const magnitude = Math.sqrt(forward * forward + strafe * strafe);
    const normForward = forward / (magnitude || 1);
    const normStrafe = strafe / (magnitude || 1);
    
    const moveAngle = Math.atan2(normStrafe, normForward);
    const finalAngle = yaw + moveAngle;
    
    const newSpeedX = -speed * Math.sin(finalAngle);
    const newSpeedZ = speed * Math.cos(finalAngle);
    
    player.field_70159_w = player.field_70159_w * strafeSmoothing + newSpeedX * (1 - strafeSmoothing);
    player.field_70179_y = player.field_70179_y * strafeSmoothing + newSpeedZ * (1 - strafeSmoothing);
}

function predictedMotion(motionY, ticks) {
    let y = motionY * predictMotionScale;
    for (let i = 0; i < ticks; i++) {
        y -= 0.08 * predictDescentSpeed;
        y *= 0.98;
    }
    return y;
}

function noAction() {
    const player = Player.getPlayer();
    return !player || player.field_70737_aN > 0 || Client.getMinecraft().field_71462_r !== null || player.field_71439_g < 20;
}

function calculateBPS() {
    const player = Player.getPlayer();
    if (!player) return 0;
    
    const currentPos = { x: player.field_70165_t, y: player.field_70163_u, z: player.field_70161_v };
    if (!lastPosition) {
        lastPosition = currentPos;
        return 0;
    }
    
    const dx = currentPos.x - lastPosition.x;
    const dz = currentPos.z - lastPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const bps = distance * 20;
    
    lastPosition = currentPos;
    return bps;
}

function getPreferredBlockSlot() {
    const player = Player.getPlayer();
    if (!player || !player.field_71071_by) {
        debugMessage("No player or inventory!");
        return -1;
    }
    let bestSlot = -1;
    slotErrors = [];
    
    const validBlockNames = [
        "minecraft:stone",
        "minecraft:dirt",
        "minecraft:cobblestone",
        "minecraft:planks",
        "minecraft:glass",
        "minecraft:stone_slab",
        "minecraft:brick_block",
        "minecraft:wool",
        "minecraft:sandstone",
        "minecraft:quartz_block"
    ];
    
    for (let i = 0; i < 9; i++) {
        try {
            const itemStack = player.field_71071_by.func_70301_a(i);
            if (!itemStack) {
                debugMessage(`Slot ${i}: Empty`);
                continue;
            }
            const item = itemStack.func_77973_b();
            if (!item) {
                debugMessage(`Slot ${i}: Invalid item`);
                continue;
            }
            const itemName = item.func_77658_a() || "unknown";
            const BlockClass = Java.type("net.minecraft.block.Block");
            const block = BlockClass.func_149634_a(item);
            if (!block) {
                debugMessage(`Slot ${i}: Item ${itemName} is not a block`);
                continue;
            }
            const blockName = block.func_149739_a() || "unknown";
            const blockId = BlockClass.func_149682_b(block);
            if (blockId === 0) {
                debugMessage(`Slot ${i}: Block ${blockName} is air (ID 0)`);
                continue;
            }
            if (validBlockNames.includes(blockName.replace("tile.", "minecraft:")) || blockId > 0) {
                bestSlot = i;
                debugMessage(`Slot ${i}: Found valid block ${blockName} (ID ${blockId})`);
                break;
            } else {
                debugMessage(`Slot ${i}: Block ${blockName} (ID ${blockId}) not in whitelist`);
                continue;
            }
        } catch (e) {
            slotErrors.push(i);
            debugMessage(`Slot ${i}: Error - ${e.message}`);
        }
    }
    
    if (slotErrors.length > 0) {
        debugMessage(`Errors accessing slots: ${slotErrors.join(",")}`);
    }
    if (bestSlot === -1) {
        debugMessage("No valid block found in hotbar!");
    }
    return bestSlot;
}

function aimAssist() {
    if (!aimAssistEnabled) return;
    const player = Player.getPlayer();
    if (!player) return;
    
    const entities = World.getAllEntities();
    let nearest = null;
    let minDist = Infinity;
    entities.forEach(entity => {
        if (entity.getClass().getSimpleName().includes("EntityPlayer") && entity !== Player.getPlayer()) {
            const dist = player.getDistanceToEntity(entity);
            if (dist < 6 && dist < minDist) {
                minDist = dist;
                nearest = entity;
            }
        }
    });
    if (nearest) {
        const dx = nearest.field_70165_t - player.field_70165_t;
        const dz = nearest.field_70161_v - player.field_70161_v;
        const targetYaw = Math.atan2(dz, dx) * 180 / Math.PI - 90;
        const currentYaw = player.field_70177_z;
        let yawDiff = targetYaw - currentYaw;
        if (yawDiff > 180) yawDiff -= 360;
        if (yawDiff < -180) yawDiff += 360;
        player.field_70177_z += yawDiff * aimAssistStrength * (1 + (Math.random() * 0.1));
    }
}

function killAura() {
    if (!killAuraEnabled) return;
    const player = Player.getPlayer();
    if (!player) return;
    
    const entities = World.getAllEntities();
    entities.forEach(entity => {
        if (entity.getClass().getSimpleName().includes("EntityPlayer") && entity !== Player.getPlayer()) {
            const dist = player.getDistanceToEntity(entity);
            if (dist < killAuraRange) {
                Client.getMinecraft().playerController.attackEntity(Player.getPlayer(), entity);
            }
        }
    });
}

function lookAtBlockFace(targetPos, face) {
    const player = Player.getPlayer();
    if (!player) return;
    
    const playerX = player.field_70165_t;
    const playerY = player.field_70163_u + player.func_70047_e();
    const playerZ = player.field_70161_v;
    
    let x = targetPos.x + 0.5;
    let y = targetPos.y + 0.5;
    let z = targetPos.z + 0.5;
    if (face === 0) y -= 0.5; // Bottom
    else if (face === 1) y += 0.5; // Top
    else if (face === 2) z -= 0.5; // North
    else if (face === 3) z += 0.5; // South
    else if (face === 4) x -= 0.5; // West
    else if (face === 5) x += 0.5; // East
    
    const dx = x - playerX;
    const dy = y - playerY;
    const dz = z - playerZ;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < 0.1) return;
    
    const yaw = (Math.atan2(dz, dx) * 180 / Math.PI) - 90;
    const pitch = (-Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180 / Math.PI);
    
    player.field_70177_z = yaw;
    player.field_70125_A = pitch;
    debugMessage(`Aiming at block ${targetPos.x}, ${targetPos.y}, ${targetPos.z}, Face ${face}: Yaw=${yaw.toFixed(2)}, Pitch=${pitch.toFixed(2)}`);
}

function scaffold() {
    if (!scaffoldEnabled) {
        debugMessage("Scaffold disabled!");
        return;
    }
    if (isScaffolding) {
        debugMessage("Scaffold: Preventing recursive call!");
        return;
    }
    isScaffolding = true;
    debugMessage("Entering scaffold function");
    
    const player = Player.getPlayer();
    if (!player) {
        debugMessage("No player!");
        isScaffolding = false;
        return;
    }
    
    const now = Date.now();
    const delay = activeScaffoldMode === "godbridge" ? godbridgeDelay : 
                  activeScaffoldMode === "telebridge" ? 0 : 
                  activeScaffoldMode === "crouch" ? crouchDelay : 
                  activeScaffoldMode === "raven" ? ravenDelay : mayuDelay;
    if (now - lastScaffoldPlace < delay + (Math.random() * 10)) {
        debugMessage(`Scaffold: Waiting for placement delay (${delay}ms)`);
        isScaffolding = false;
        return;
    }
    
    const blockSlot = getPreferredBlockSlot();
    if (blockSlot === -1) {
        debugMessage("Scaffold: No blocks in hotbar!");
        isScaffolding = false;
        return;
    }
    
    let originalSlot;
    try {
        originalSlot = player.field_71071_by.field_70461_c;
        player.field_71071_by.func_70453_c(blockSlot);
        debugMessage(`Switched to slot: ${blockSlot} (was ${originalSlot})`);
    } catch (e) {
        debugMessage(`Error switching to slot ${blockSlot}: ${e.message}`);
        isScaffolding = false;
        return;
    }
    
    let currentItem;
    try {
        currentItem = player.field_71071_by.func_70301_a(blockSlot);
        if (currentItem) {
            const itemName = currentItem.func_77973_b()?.func_77658_a() || "unknown";
            debugMessage(`Current item in slot ${blockSlot}: ${itemName}`);
        } else {
            debugMessage(`No item in slot ${blockSlot}`);
        }
    } catch (e) {
        debugMessage(`Error checking item in slot ${blockSlot}: ${e.message}`);
    }
    
    const isUpward = upwardBridgeEnabled && player.field_70125_A < -30;
    const blockX = Math.floor(player.field_70165_t);
    const blockY = Math.floor(player.field_70163_u + (isUpward ? 1 : -1));
    const blockZ = Math.floor(player.field_70161_v);
    const blockBelow = World.getBlockAt(blockX, blockY, blockZ);
    if (blockBelow.getType().getID() !== 0) {
        debugMessage(`Block exists at ${blockX}, ${blockY}, ${blockZ} (ID ${blockBelow.getType().getID()})`);
        try {
            player.field_71071_by.func_70453_c(originalSlot);
            debugMessage(`Restored slot: ${originalSlot}`);
        } catch (e) {
            debugMessage(`Error restoring slot ${originalSlot}: ${e.message}`);
        }
        isScaffolding = false;
        return;
    }
    
    if (activeScaffoldMode === "mayu") {
        let foundAir = false;
        for (let y = blockY; y >= blockY - mayuPredictRange; y--) {
            const checkBlock = World.getBlockAt(blockX, y, blockZ);
            if (checkBlock.getType().getID() === 0) {
                debugMessage(`Mayu: Found air at ${blockX}, ${y}, ${blockZ}`);
                foundAir = true;
                break;
            }
        }
        if (!foundAir) {
            debugMessage("Mayu: No air block found in predict range!");
            try {
                player.field_71071_by.func_70453_c(originalSlot);
                debugMessage(`Restored slot: ${originalSlot}`);
            } catch (e) {
                debugMessage(`Error restoring slot ${originalSlot}: ${e.message}`);
            }
            isScaffolding = false;
            return;
        }
    }
    
    const yaw = player.field_70177_z % 360;
    let direction = yaw < 0 ? yaw + 360 : yaw;
    const offsets = isUpward ? [
        { x: 0, y: 1, z: 0, face: 0 },
        { x: 1, y: 0, z: 0, face: 4 },
        { x: -1, y: 0, z: 0, face: 5 },
        { x: 0, y: 0, z: 1, face: 2 },
        { x: 0, y: 0, z: -1, face: 3 }
    ] : [
        { x: 0, y: -1, z: 0, face: 1 },
        { x: direction >= 45 && direction < 135 ? 1 : 0, y: 0, z: 0, face: 4 },
        { x: direction >= 225 && direction < 315 ? -1 : 0, y: 0, z: 0, face: 5 },
        { x: 0, y: 0, z: direction >= 135 && direction < 225 ? 1 : 0, face: 2 },
        { x: 0, y: 0, z: direction >= 315 || direction < 45 ? -1 : 0, face: 3 }
    ];
    
    let targetPos = null;
    let targetFace = 0;
    let isEdgePlacement = false;
    for (const offset of offsets) {
        const checkX = blockX + offset.x;
        const checkY = blockY + offset.y;
        const checkZ = blockZ + offset.z;
        const checkBlock = World.getBlockAt(checkX, checkY, checkZ);
        const blockId = checkBlock.getType().getID();
        if (blockId !== 0) {
            targetPos = { x: checkX, y: checkY, z: checkZ };
            targetFace = offset.face;
            isEdgePlacement = offset.x !== 0 || offset.z !== 0;
            debugMessage(`Found target block at ${checkX}, ${checkY}, ${checkZ} (ID ${blockId}), Face: ${targetFace}`);
            break;
        }
    }
    
    if (!targetPos) {
        debugMessage("Scaffold: No valid target block found!");
        try {
            player.field_71071_by.func_70453_c(originalSlot);
            debugMessage(`Restored slot: ${originalSlot}`);
        } catch (e) {
            debugMessage(`Error restoring slot ${originalSlot}: ${e.message}`);
        }
        isScaffolding = false;
        return;
    }
    
    let shouldCrouch = activeScaffoldMode === "crouch" && isEdgePlacement;
    if (shouldCrouch && !crouchStrict) {
        toggleSneak(true);
        debugMessage("Crouching for edge placement");
    }
    
    try {
        const Vec3 = Java.type("net.minecraft.util.Vec3");
        const BlockPos = Java.type("net.minecraft.util.BlockPos");
        const EnumFacing = Java.type("net.minecraft.util.EnumFacing");
        const C08PacketPlayerBlockPlacement = Java.type("net.minecraft.network.play.client.C08PacketPlayerBlockPlacement");
        
        lookAtBlockFace(targetPos, targetFace);
        Thread.sleep(10);
        
        const blockPos = new BlockPos(targetPos.x, targetPos.y, targetPos.z);
        const facing = [EnumFacing.UP, EnumFacing.DOWN, EnumFacing.NORTH, EnumFacing.SOUTH, EnumFacing.WEST, EnumFacing.EAST][targetFace];
        const hitVec = new Vec3(targetPos.x + 0.5, targetPos.y + 0.5, targetPos.z + 0.5);
        
        debugMessage(`Attempting placement at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}, Face: ${targetFace}`);
        
        const packet = new C08PacketPlayerBlockPlacement(
            blockPos,
            facing.func_176745_a(),
            currentItem,
            0.5, 0.5, 0.5
        );
        Client.getMinecraft().field_71439_g.field_71174_a.func_147297_a(packet);
        debugMessage("Sent C08PacketPlayerBlockPlacement");
        
    } catch (e) {
        debugMessage(`Error during block placement: ${e.message}`);
        try {
            player.field_71071_by.func_70453_c(originalSlot);
            debugMessage(`Restored slot: ${originalSlot}`);
        } catch (e2) {
            debugMessage(`Error restoring slot ${originalSlot}: ${e2.message}`);
        }
        isScaffolding = false;
        return;
    }
    
    lastScaffoldPlace = now;
    debugMessage(`Scaffold: Placement completed at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}, Face: ${targetFace}, Mode: ${activeScaffoldMode}, Edge: ${isEdgePlacement}`);
    
    try {
        player.field_71071_by.func_70453_c(originalSlot);
        debugMessage(`Restored slot: ${originalSlot}`);
    } catch (e) {
        debugMessage(`Error restoring slot ${originalSlot}: ${e.message}`);
    }
    
    if (shouldCrouch && wasSneaking && !crouchStrict) {
        toggleSneak(false);
        debugMessage("Stopped crouching");
    }
    
    if (["godbridge", "raven", "mayu"].includes(activeScaffoldMode) && player.field_70122_E) {
        const jumpFreq = activeScaffoldMode === "godbridge" ? godbridgeJumpFreq : 
                         activeScaffoldMode === "raven" ? ravenJumpFreq : mayuJumpFreq;
        if (now - lastJump > jumpFreq) {
            if (!jumpDown()) {
                new KeyBind(Client.getMinecraft().field_71474_y.field_74314_A).setState(true);
            }
            player.field_70181_x = activeScaffoldMode === "mayu" ? 0.42 : 0.4;
            lastJump = now;
            debugMessage(`Jump triggered for ${activeScaffoldMode}`);
        }
    }
    
    isScaffolding = false;
    debugMessage("Exiting scaffold function");
}

// Command handler
register("command", (...args) => {
    if (args.length < 1) {
        ChatLib.chat("&4[&6Sico&7] Usage: /Sico [lowhop|speed|bps|scaffold|aimassist|killaura|velocity|keybind|adjustable|debug|help] [type|edit]");
        return;
    }

    const command = args[0].toLowerCase();
    if (command === "lowhop") {
        if (args.length >= 2) {
            const type = args[1].toLowerCase();
            if (type === "predict" || type === "8tick" || type === "longjump" || type === "bhop") {
                lowhopEnabled = true;
                activeLowhopMode = type;
                offGroundTicks = 999;
                const player = Player.getPlayer();
                if (player) {
                    player.field_70159_w = 0;
                    player.field_70179_y = 0;
                    lastYaw = player.field_70177_z;
                    lastDirection = player.field_70177_z;
                }
                ChatLib.chat(`&4[&6Sico&7] Lowhop enabled with type ${type}.`);
            } else if (type === "help") {
                ChatLib.chat("&4[&6Sico&7] Lowhop Commands:");
                ChatLib.chat("&7/Sico lowhop predict - Predictive lowhop (~7.6 bps)");
                ChatLib.chat("&7/Sico lowhop 8tick - RavenB4-style 8 tick lowhop (~7.2 bps)");
                ChatLib.chat("&7/Sico lowhop longjump - Longjump mode");
                ChatLib.chat("&7/Sico lowhop bhop - Bunny hop mode (~8.4 bps)");
                ChatLib.chat("&7/Sico lowhop - Disable lowhop");
            } else {
                lowhopEnabled = false;
                activeLowhopMode = null;
                ChatLib.chat(`&4[&6Sico&7] Invalid type. Lowhop disabled.`);
            }
        } else {
            lowhopEnabled = false;
            activeLowhopMode = null;
            ChatLib.chat(`&4[&6Sico&7] Lowhop disabled.`);
        }
    } else if (command === "speed") {
        if (args.length >= 2) {
            const type = args[1].toLowerCase();
            if (["ground", "groundstrafe", "airspeed"].includes(type)) {
                speedEnabled = true;
                activeSpeedMode = type;
                offGroundTicks = 999;
                const player = Player.getPlayer();
                if (player) {
                    player.field_70159_w = 0;
                    player.field_70179_y = 0;
                    lastYaw = player.field_70177_z;
                    lastDirection = player.field_70177_z;
                }
                ChatLib.chat(`&4[&6Sico&7] Speed enabled with type ${type}.`);
            } else if (type === "help") {
                ChatLib.chat("&4[&6Sico&7] Speed Commands:");
                ChatLib.chat("&7/Sico speed ground - Ground speed");
                ChatLib.chat("&7/Sico speed groundstrafe - Ground strafe speed (~7.6 bps)");
                ChatLib.chat("&7/Sico speed airspeed - Air speed (~6.8 bps)");
                ChatLib.chat("&7/Sico speed - Disable speed");
            } else {
                speedEnabled = false;
                activeSpeedMode = null;
                ChatLib.chat(`&4[&6Sico&7] Invalid type. Speed disabled.`);
            }
        } else {
            speedEnabled = false;
            activeSpeedMode = null;
            ChatLib.chat(`&4[&6Sico&7] Speed disabled.`);
        }
    } else if (command === "bps") {
        if (args.length >= 2) {
            const subcommand = args[1].toLowerCase();
            if (subcommand === "toggle") {
                bpsEnabled = !bpsEnabled;
                ChatLib.chat(`&4[&6Sico&7] BPS display ${bpsEnabled ? "enabled" : "disabled"}.`);
            } else if (subcommand === "pos") {
                if (args.length >= 4) {
                    bpsX = parseInt(args[2]);
                    bpsY = parseInt(args[3]);
                    if (isNaN(bpsX) || isNaN(bpsY)) {
                        ChatLib.chat("&4[&6Sico&7] Invalid coordinates.");
                    } else {
                        ChatLib.chat(`&4[&6Sico&7] BPS display set to X: ${bpsX}, Y: ${bpsY}.`);
                    }
                } else {
                    ChatLib.chat("&4[&6Sico&7] Usage: /Sico bps pos [x] [y]");
                }
            } else if (subcommand === "help") {
                ChatLib.chat("&4[&6Sico&7] BPS Commands:");
                ChatLib.chat("&7/Sico bps toggle - Toggle BPS display");
                ChatLib.chat("&7/Sico bps pos [x] [y] - Set BPS display position");
            } else {
                ChatLib.chat("&4[&6Sico&7] Usage: /Sico bps [toggle|pos|help]");
            }
        } else {
            ChatLib.chat("&4[&6Sico&7] Usage: /Sico bps [toggle|pos|help]");
        }
    } else if (command === "scaffold") {
        if (args.length >= 2) {
            const subcommand = args[1].toLowerCase();
            if (["godbridge", "telebridge", "crouch", "raven", "mayu"].includes(subcommand)) {
                scaffoldEnabled = true;
                activeScaffoldMode = subcommand;
                ChatLib.chat(`&4[&6Sico&7] Scaffold enabled with ${subcommand} mode.`);
            } else if (subcommand === "overlay") {
                scaffoldOverlay = !scaffoldOverlay;
                ChatLib.chat(`&4[&6Sico&7] Scaffold overlay ${scaffoldOverlay ? "enabled" : "disabled"}.`);
            } else if (subcommand === "overlaypos") {
                if (args.length >= 4) {
                    scaffoldOverlayX = parseInt(args[2]);
                    scaffoldOverlayY = parseInt(args[3]);
                    if (isNaN(scaffoldOverlayX) || isNaN(scaffoldOverlayY)) {
                        ChatLib.chat("&4[&6Sico&7] Invalid coordinates.");
                    } else {
                        ChatLib.chat(`&4[&6Sico&7] Scaffold overlay set to X: ${scaffoldOverlayX}, Y: ${scaffoldOverlayY}.`);
                    }
                } else {
                    ChatLib.chat("&4[&6Sico&7] Usage: /Sico scaffold overlaypos [x] [y]");
                }
            } else if (subcommand === "help") {
                ChatLib.chat("&4[&6Sico&7] Scaffold Commands:");
                ChatLib.chat("&7/Sico scaffold godbridge - Fast diagonal bridging");
                ChatLib.chat("&7/Sico scaffold telebridge - Instant straight-line bridging");
                ChatLib.chat("&7/Sico scaffold crouch - Safe crouch bridging");
                ChatLib.chat("&7/Sico scaffold raven - RavenB4-style precise bridging");
                ChatLib.chat("&7/Sico scaffold mayu - Mayu-style smooth bridging");
                ChatLib.chat("&7/Sico scaffold overlay - Toggle scaffold status overlay");
                ChatLib.chat("&7/Sico scaffold overlaypos [x] [y] - Set overlay position");
                ChatLib.chat("&7/Sico scaffold - Disable scaffold");
            } else {
                scaffoldEnabled = false;
                activeScaffoldMode = "godbridge";
                toggleSneak(false);
                ChatLib.chat(`&4[&6Sico&7] Scaffold disabled.`);
            }
        } else {
            scaffoldEnabled = false;
            activeScaffoldMode = "godbridge";
            toggleSneak(false);
            ChatLib.chat(`&4[&6Sico&7] Scaffold disabled.`);
        }
    } else if (command === "keybind") {
        if (args.length >= 3 && args[1].toLowerCase() === "scaffold") {
            scaffoldKeybind = args[2].toUpperCase();
            ChatLib.chat(`&4[&6Sico&7] Scaffold keybind set to ${scaffoldKeybind}.`);
        } else {
            ChatLib.chat("&4[&6Sico&7] Usage: /Sico keybind scaffold [key]");
        }
    } else if (command === "aimassist") {
        aimAssistEnabled = !aimAssistEnabled;
        ChatLib.chat(`&4[&6Sico&7] AimAssist ${aimAssistEnabled ? "enabled" : "disabled"}.`);
    } else if (command === "killaura") {
        killAuraEnabled = !killAuraEnabled;
        ChatLib.chat(`&4[&6Sico&7] KillAura ${killAuraEnabled ? "enabled" : "disabled"}.`);
    } else if (command === "velocity") {
        velocityEnabled = !velocityEnabled;
        ChatLib.chat(`&4[&6Sico&7] Velocity ${velocityEnabled ? "enabled" : "disabled"}.`);
    } else if (command === "adjustable") {
        adjustableMode = !adjustableMode;
        ChatLib.chat(`&4[&6Sico&7] Adjustable mode ${adjustableMode ? "enabled" : "disabled"}.`);
        if (adjustableMode) {
            ChatLib.chat("&4[&6Sico&7] Use /Sico set [setting] [value] to adjust settings.");
            ChatLib.chat("&4[&6Sico&7] Run /Sico help edit for settings list.");
        }
    } else if (command === "set" && adjustableMode) {
        if (args.length < 3) {
            ChatLib.chat("&4[&6Sico&7] Usage: /Sico set [setting] [value]");
            return;
        }
        const setting = args[1].toLowerCase();
        const value = parseFloat(args[2]);
        if (isNaN(value) && !["crouchstrict", "upwardbridgeenabled"].includes(setting)) {
            ChatLib.chat("&4[&6Sico&7] Invalid value.");
            return;
        }
        switch (setting) {
            case "speedmultiplier": speedMultiplier = Math.max(1.0, Math.min(1.5, value)); ChatLib.chat(`&4[&6Sico&7] Speed multiplier set to ${speedMultiplier}.`); break;
            case "jumpheight": jumpHeight = Math.max(0.0, Math.min(0.1, value)); ChatLib.chat(`&4[&6Sico&7] Jump height set to ${jumpHeight}.`); break;
            case "turnspeed": turnSpeed = Math.max(0.03, Math.min(0.5, value)); ChatLib.chat(`&4[&6Sico&7] Turn speed set to ${turnSpeed}.`); break;
            case "forwardboost": forwardBoost = Math.max(1.0, Math.min(1.3, value)); ChatLib.chat(`&4[&6Sico&7] Forward boost set to ${forwardBoost}.`); break;
            case "directionchangeboost": directionChangeBoost = Math.max(1.0, Math.min(1.4, value)); ChatLib.chat(`&4[&6Sico&7] Direction change boost set to ${directionChangeBoost}.`); break;
            case "predictmotionscale": predictMotionScale = Math.max(0.8, Math.min(1.2, value)); ChatLib.chat(`&4[&6Sico&7] Predict motion scale set to ${predictMotionScale}.`); break;
            case "predictturndamp": predictTurnDamp = Math.max(0.05, Math.min(0.3, value)); ChatLib.chat(`&4[&6Sico&7] Predict turn damp set to ${predictTurnDamp}.`); break;
            case "predictdescentspeed": predictDescentSpeed = Math.max(0.9, Math.min(1.1, value)); ChatLib.chat(`&4[&6Sico&7] Predict descent speed set to ${predictDescentSpeed}.`); break;
            case "groundstrafespeed": groundstrafeSpeed = Math.max(1.0, Math.min(1.3, value)); ChatLib.chat(`&4[&6Sico&7] Groundstrafe speed set to ${groundstrafeSpeed}.`); break;
            case "groundstrafeturnspeed": groundstrafeTurnSpeed = Math.max(0.01, Math.min(0.1, value)); ChatLib.chat(`&4[&6Sico&7] Groundstrafe turn speed set to ${groundstrafeTurnSpeed}.`); break;
            case "groundstrafejumpfreq": groundstrafeJumpFreq = Math.max(100, Math.min(300, value)); ChatLib.chat(`&4[&6Sico&7] Groundstrafe jump frequency set to ${groundstrafeJumpFreq}.`); break;
            case "groundspeed": groundSpeed = Math.max(1.0, Math.min(1.3, value)); ChatLib.chat(`&4[&6Sico&7] Ground speed set to ${groundSpeed}.`); break;
            case "groundblinkfreq": groundBlinkFreq = Math.max(2, Math.min(10, value)); ChatLib.chat(`&4[&6Sico&7] Ground blink frequency set to ${groundBlinkFreq}.`); break;
            case "groundfriction": groundFriction = Math.max(0.95, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] Ground friction set to ${groundFriction}.`); break;
            case "airspeedjump": airspeedJump = Math.max(0.3, Math.min(0.7, value)); ChatLib.chat(`&4[&6Sico&7] Airspeed jump set to ${airspeedJump}.`); break;
            case "airspeedmotion": airspeedMotion = Math.max(1.0, Math.min(1.05, value)); ChatLib.chat(`&4[&6Sico&7] Airspeed motion set to ${airspeedMotion}.`); break;
            case "airspeeddecay": airspeedDecay = Math.max(0.98, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] Airspeed decay set to ${airspeedDecay}.`); break;
            case "groundstrafebasespeed": groundstrafeBaseSpeed = Math.max(0.3, Math.min(0.4, value)); ChatLib.chat(`&4[&6Sico&7] Groundstrafe base speed set to ${groundstrafeBaseSpeed}.`); break;
            case "groundstrafejumpheight": groundstrafeJumpHeight = Math.max(0.4, Math.min(0.6, value)); ChatLib.chat(`&4[&6Sico&7] Groundstrafe jump height set to ${groundstrafeJumpHeight}.`); break;
            case "airspeedbasespeed": airspeedBaseSpeed = Math.max(0.3, Math.min(0.36, value)); ChatLib.chat(`&4[&6Sico&7] Airspeed base speed set to ${airspeedBaseSpeed}.`); break;
            case "airspeedjumpheight": airspeedJumpHeight = Math.max(0.4, Math.min(0.65, value)); ChatLib.chat(`&4[&6Sico&7] Airspeed jump height set to ${airspeedJumpHeight}.`); break;
            case "predictbasespeed": predictBaseSpeed = Math.max(0.3, Math.min(0.4, value)); ChatLib.chat(`&4[&6Sico&7] Predict base speed set to ${predictBaseSpeed}.`); break;
            case "predictjumpheight": predictJumpHeight = Math.max(0.4, Math.min(0.6, value)); ChatLib.chat(`&4[&6Sico&7] Predict jump height set to ${predictJumpHeight}.`); break;
            case "bhopbasespeed": bhopBaseSpeed = Math.max(0.38, Math.min(0.45, value)); ChatLib.chat(`&4[&6Sico&7] Bhop base speed set to ${bhopBaseSpeed}.`); break;
            case "bhopjumpheight": bhopJumpHeight = Math.max(0.45, Math.min(0.6, value)); ChatLib.chat(`&4[&6Sico&7] Bhop jump height set to ${bhopJumpHeight}.`); break;
            case "longjumpboost": longjumpBoost = Math.max(0.4, Math.min(0.6, value)); ChatLib.chat(`&4[&6Sico&7] Longjump boost set to ${longjumpBoost}.`); break;
            case "longjumpjumpheight": longjumpJumpHeight = Math.max(0.6, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] Longjump jump height set to ${longjumpJumpHeight}.`); break;
            case "longjumpblinkticks": longjumpBlinkTicks = Math.max(5, Math.min(12, value)); ChatLib.chat(`&4[&6Sico&7] Longjump blink ticks set to ${longjumpBlinkTicks}.`); break;
            case "longjumpglidedecay": longjumpGlideDecay = Math.max(0.98, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] Longjump glide decay set to ${longjumpGlideDecay}.`); break;
            case "eighttickmotionadjust": eightTickMotionAdjust = Math.max(0.35, Math.min(0.4, value)); ChatLib.chat(`&4[&6Sico&7] 8 tick motion adjust set to ${eightTickMotionAdjust}.`); break;
            case "eighttickreduction1": eightTickReduction1 = Math.max(0.05, Math.min(0.12, value)); ChatLib.chat(`&4[&6Sico&7] 8 tick reduction 1 set to ${eightTickReduction1}.`); break;
            case "eighttickreduction2": eightTickReduction2 = Math.max(0.1, Math.min(0.18, value)); ChatLib.chat(`&4[&6Sico&7] 8 tick reduction 2 set to ${eightTickReduction2}.`); break;
            case "godbridgedelay": godbridgeDelay = Math.max(20, Math.min(200, value)); ChatLib.chat(`&4[&6Sico&7] Godbridge delay set to ${godbridgeDelay}ms.`); break;
            case "godbridgejumpfreq": godbridgeJumpFreq = Math.max(100, Math.min(300, value)); ChatLib.chat(`&4[&6Sico&7] Godbridge jump frequency set to ${godbridgeJumpFreq}ms.`); break;
            case "telebridgerange": telebridgeRange = Math.max(1, Math.min(3, value)); ChatLib.chat(`&4[&6Sico&7] Telebridge range set to ${telebridgeRange} blocks.`); break;
            case "crouchdelay": crouchDelay = Math.max(50, Math.min(300, value)); ChatLib.chat(`&4[&6Sico&7] Crouch delay set to ${crouchDelay}ms.`); break;
            case "crouchstrict": 
                crouchStrict = args[2].toLowerCase() === "true" || args[2] === "1"; 
                ChatLib.chat(`&4[&6Sico&7] Crouch strict set to ${crouchStrict}.`); 
                break;
            case "ravendelay": ravenDelay = Math.max(20, Math.min(150, value)); ChatLib.chat(`&4[&6Sico&7] Raven delay set to ${ravenDelay}ms.`); break;
            case "ravenjumpfreq": ravenJumpFreq = Math.max(100, Math.min(300, value)); ChatLib.chat(`&4[&6Sico&7] Raven jump frequency set to ${ravenJumpFreq}ms.`); break;
            case "mayudelay": mayuDelay = Math.max(20, Math.min(150, value)); ChatLib.chat(`&4[&6Sico&7] Mayu delay set to ${mayuDelay}ms.`); break;
            case "mayujumpfreq": mayuJumpFreq = Math.max(100, Math.min(300, value)); ChatLib.chat(`&4[&6Sico&7] Mayu jump frequency set to ${mayuJumpFreq}ms.`); break;
            case "mayupredictrange": mayuPredictRange = Math.max(1, Math.min(4, value)); ChatLib.chat(`&4[&6Sico&7] Mayu predict range set to ${mayuPredictRange} blocks.`); break;
            case "upwardbridgeenabled": 
                upwardBridgeEnabled = args[2].toLowerCase() === "true" || args[2] === "1"; 
                ChatLib.chat(`&4[&6Sico&7] Upward bridge enabled set to ${upwardBridgeEnabled}.`); 
                break;
            case "strafesmoothing": strafeSmoothing = Math.max(0.8, Math.min(0.98, value)); ChatLib.chat(`&4[&6Sico&7] Strafe smoothing set to ${strafeSmoothing}.`); break;
            case "aimassiststrength": aimAssistStrength = Math.max(0.0, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] AimAssist strength set to ${aimAssistStrength}.`); break;
            case "killaura": killAuraRange = Math.max(3.0, Math.min(6.0, value)); ChatLib.chat(`&4[&6Sico&7] KillAura range set to ${killAuraRange}.`); break;
            case "velocityreduction": velocityReduction = Math.max(0.0, Math.min(1.0, value)); ChatLib.chat(`&4[&6Sico&7] Velocity reduction set to ${velocityReduction}.`); break;
            default: ChatLib.chat("&4[&6Sico&7] Invalid setting.");
        }
    } else if (command === "help") {
        if (args.length >= 2 && args[1].toLowerCase() === "edit") {
            ChatLib.chat("&4[&6Sico&7] Editable Settings (use /Sico set [setting] [value]):");
            ChatLib.chat("&7speedmultiplier: Overall speed multiplier (1.0-1.5, default 1.05)");
            ChatLib.chat("&7jumpheight: Base jump height (0.0-0.1, default 0.001)");
            ChatLib.chat("&7turnspeed: General turn speed penalty (0.03-0.5, default 0.08)");
            ChatLib.chat("&7forwardboost: Forward speed boost (1.0-1.3, default 1.10)");
            ChatLib.chat("&7directionchangeboost: Boost on direction change (1.0-1.4, default 1.15)");
            ChatLib.chat("&7predictmotionscale: Predict mode motion scaling (0.8-1.2, default 0.95)");
            ChatLib.chat("&7predictturndamp: Predict mode turn responsiveness (0.05-0.3, default 0.1)");
            ChatLib.chat("&7predictdescentspeed: Predict mode descent rate (0.9-1.1, default 0.98)");
            ChatLib.chat("&7groundstrafespeed: Groundstrafe speed multiplier (1.0-1.3, default 1.10)");
            ChatLib.chat("&7groundstrafeturnspeed: Groundstrafe turn responsiveness (0.01-0.1, default 0.02)");
            ChatLib.chat("&7groundstrafejumpfreq: Groundstrafe jump frequency in ms (100-300, default 300)");
            ChatLib.chat("&7groundspeed: Ground mode speed multiplier (1.0-1.3, default 1.05)");
            ChatLib.chat("&7groundblinkfreq: Ground mode blink frequency in ticks (2-10, default 6)");
            ChatLib.chat("&7groundfriction: Ground mode motion resistance (0.95-1.0, default 0.995)");
            ChatLib.chat("&7airspeedjump: Airspeed jump strength (0.3-0.7, default 0.5)");
            ChatLib.chat("&7airspeedmotion: Airspeed air motion multiplier (1.0-1.05, default 1.01)");
            ChatLib.chat("&7airspeeddecay: Airspeed speed decay in air (0.98-1.0, default 0.998)");
            ChatLib.chat("&7groundstrafebasespeed: Groundstrafe base speed (0.3-0.4, default 0.38)");
            ChatLib.chat("&7groundstrafejumpheight: Groundstrafe jump height (0.4-0.6, default 0.5)");
            ChatLib.chat("&7airspeedbasespeed: Airspeed base speed (0.3-0.36, default 0.34)");
            ChatLib.chat("&7airspeedjumpheight: Airspeed jump height (0.4-0.65, default 0.55)");
            ChatLib.chat("&7predictbasespeed: Predict base speed (0.3-0.4, default 0.38)");
            ChatLib.chat("&7predictjumpheight: Predict jump height (0.4-0.6, default 0.5)");
            ChatLib.chat("&7bhopbasespeed: Bhop base speed (0.38-0.45, default 0.42)");
            ChatLib.chat("&7bhopjumpheight: Bhop jump height (0.45-0.6, default 0.54)");
            ChatLib.chat("&7longjumpboost: Longjump horizontal boost (0.4-0.6, default 0.5)");
            ChatLib.chat("&7longjumpjumpheight: Longjump vertical boost (0.6-1.0, default 0.8)");
            ChatLib.chat("&7longjumpblinkticks: Longjump packet suppression ticks (5-12, default 8)");
            ChatLib.chat("&7longjumpglidedecay: Longjump glide decay (0.98-1.0, default 0.99)");
            ChatLib.chat("&7eighttickmotionadjust: 8 tick jump height (0.35-0.4, default 0.38)");
            ChatLib.chat("&7eighttickreduction1: 8 tick motion reduction 1 (0.05-0.12, default 0.10)");
            ChatLib.chat("&7eighttickreduction2: 8 tick motion reduction 2 (0.1-0.18, default 0.15)");
            ChatLib.chat("&7godbridgedelay: Godbridge placement delay in ms (20-200, default 100)");
            ChatLib.chat("&7godbridgejumpfreq: Godbridge jump frequency in ms (100-300, default 200)");
            ChatLib.chat("&7telebridgerange: Telebridge air check range in blocks (1-3, default 1)");
            ChatLib.chat("&7crouchdelay: Crouch bridge placement delay in ms (50-300, default 150)");
            ChatLib.chat("&7crouchstrict: Require manual sneaking for crouch bridge (true/false, default false)");
            ChatLib.chat("&7ravendelay: RavenB4 bridge placement delay in ms (20-150, default 80)");
            ChatLib.chat("&7ravenjumpfreq: RavenB4 jump frequency in ms (100-300, default 180)");
            ChatLib.chat("&7mayudelay: Mayu bridge placement delay in ms (20-150, default 90)");
            ChatLib.chat("&7mayujumpfreq: Mayu jump frequency in ms (100-300, default 190)");
            ChatLib.chat("&7mayupredictrange: Mayu predictive air check range in blocks (1-4, default 1)");
            ChatLib.chat("&7upwardbridgeenabled: Enable upward bridging (true/false, default true)");
            ChatLib.chat("&7strafesmoothing: Strafing smoothness (0.8-0.98, default 0.92)");
            ChatLib.chat("&7aimassiststrength: AimAssist strength (0.0-1.0, default 0.5)");
            ChatLib.chat("&7killaura: KillAura range (3.0-6.0, default 4.5)");
            ChatLib.chat("&7velocityreduction: Knockback reduction (0.0-1.0, default 0.6)");
        } else {
            ChatLib.chat("&4[&6Sico&7] Commands:");
            ChatLib.chat("&7/Sico lowhop [predict|8tick|longjump|bhop] - Enable lowhop mode");
            ChatLib.chat("&7/Sico speed [ground|groundstrafe|airspeed] - Enable speed mode");
            ChatLib.chat("&7/Sico bps [toggle|pos|help] - Manage BPS display");
            ChatLib.chat("&7/Sico scaffold [godbridge|telebridge|crouch|raven|mayu] - Enable scaffold mode");
            ChatLib.chat("&7/Sico scaffold overlay - Toggle scaffold status overlay");
            ChatLib.chat("&7/Sico scaffold overlaypos [x] [y] - Set overlay position");
            ChatLib.chat("&7/Sico keybind scaffold [key] - Set scaffold toggle keybind");
            ChatLib.chat("&7/Sico aimassist - Toggle aimassist");
            ChatLib.chat("&7/Sico killaura - Toggle killaura");
            ChatLib.chat("&7/Sico velocity - Toggle velocity reduction");
            ChatLib.chat("&7/Sico adjustable - Toggle adjustable mode");
            ChatLib.chat("&7/Sico set [setting] [value] - Adjust settings");
            ChatLib.chat("&7/Sico debug - Toggle debug mode");
            ChatLib.chat("&7/Sico help [edit] - Show help or settings");
        }
    } else if (command === "debug") {
        debugMode = !debugMode;
        ChatLib.chat(`&4[&6Sico&7] Debug mode ${debugMode ? "enabled" : "disabled"}.`);
    } else {
        ChatLib.chat("&4[&6Sico&7] Usage: /Sico [lowhop|speed|bps|scaffold|aimassist|killaura|velocity|keybind|adjustable|debug|help] [type|edit]");
    }
}).setName("Sico");

// Tick handler
register("tick", () => {
    const player = Player.getPlayer();
    const jumpKey = new KeyBind(Client.getMinecraft().field_71474_y.field_74314_A);
    const now = Date.now();
    
    const tickTime = Date.now();
    const latency = Math.min(100, tickTime - lastTickTime);
    lastTickTime = tickTime;

    if (!player || !Client.getMinecraft().field_71441_e) {
        if (!jumpDown()) jumpKey.setState(false);
        if (wasSneaking) toggleSneak(false);
        return;
    }

    if (scaffoldKeybind) {
        const keyCode = Keyboard.getKeyFromName(scaffoldKeybind);
        if (keyCode !== -1) {
            const isPressed = Keyboard.isKeyDown(keyCode);
            if (isPressed && !isKeybindPressed && now - lastKeyPressTime > 200) {
                scaffoldEnabled = !scaffoldEnabled;
                if (!scaffoldEnabled) toggleSneak(false);
                ChatLib.chat(`&4[&6Sico&7] Scaffold ${scaffoldEnabled ? "enabled" : "disabled"} (${activeScaffoldMode} mode).`);
                lastKeyPressTime = now;
                isKeybindPressed = true;
            } else if (!isPressed) {
                isKeybindPressed = false;
            }
        }
    }

    if (player.field_70122_E) {
        offGroundTicks = 0;
        if (lowhopEnabled || speedEnabled) {
            player.field_70181_x += 0.01;
        }
    } else {
        offGroundTicks++;
    }

    if (lowhopEnabled || speedEnabled || scaffoldEnabled) {
        const currentYaw = player.field_70177_z;
        if (lastYaw !== 0) {
            let yawDelta = currentYaw - lastYaw;
            if (yawDelta > 180) yawDelta -= 360;
            if (yawDelta < -180) yawDelta += 360;
            yawChangeRate = Math.abs(yawDelta);
            if (lowhopEnabled && activeLowhopMode === "predict") {
                speedReduction = Math.max(0.7, 1 - (yawChangeRate / 180) * predictTurnDamp) * lagBackMitigation;
            } else if (speedEnabled && activeSpeedMode === "groundstrafe") {
                const predictedSpeed = getAllowedHorizontalDistance() * (1 - Math.min(yawChangeRate / 180, groundstrafeTurnSpeed));
                speedReduction = Math.max(0.9, predictedSpeed / getAllowedHorizontalDistance()) * lagBackMitigation;
            } else {
                speedReduction = lagBackMitigation * (1 - latency / 1000);
            }
        }
        lastYaw = currentYaw;

        if (lowhopEnabled && (activeLowhopMode === "predict" || activeLowhopMode === "8tick" || activeLowhopMode === "longjump" || activeLowhopMode === "bhop")) {
            const directionDelta = Math.abs(currentYaw - lastDirection);
            if (directionDelta > 15) {
                speedReduction *= directionChangeBoost;
                lastDirection = currentYaw;
            }
        }
    }

    if (bpsEnabled) {
        bpsValue = calculateBPS();
        if (debugMode) debugMessage(`BPS: ${bpsValue.toFixed(2)}, Latency: ${latency}ms`);
    }

    if (scaffoldEnabled) scaffold();
    if (aimAssistEnabled) aimAssist();
    if (killAuraEnabled) killAura();
    
    if (lowhopEnabled && isMoving() && !noAction()) {
        if (activeLowhopMode === "predict") {
            if (offGroundTicks === 0) {
                if (now - lastJump > groundstrafeJumpFreq) {
                    const baseSpeed = predictBaseSpeed * speedReduction * forwardBoost * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(baseSpeed);
                    if (!jumpDown()) jumpKey.setState(true);
                    player.field_70181_x = predictJumpHeight;
                    lastJump = now;
                }
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                if (offGroundTicks === 5) {
                    player.field_70181_x = predictedMotion(player.field_70181_x, 2);
                }
                const airSpeed = predictBaseSpeed * speedReduction * 0.95 * speedMultiplier * (1 + (Math.random() * 0.02));
                strafe(airSpeed);
            }
        } else if (activeLowhopMode === "8tick") {
            if (offGroundTicks === 0) {
                if (now - lastJump > groundstrafeJumpFreq) {
                    const baseSpeed = predictBaseSpeed * speedReduction * forwardBoost * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(baseSpeed);
                    if (!jumpDown()) jumpKey.setState(true);
                    player.field_70181_x = eightTickMotionAdjust;
                    lastJump = now;
                }
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                if (offGroundTicks % 8 === 0) {
                    player.field_70181_x -= eightTickReduction1;
                } else if (offGroundTicks % 8 === 4) {
                    player.field_70181_x -= eightTickReduction2;
                }
                const airSpeed = predictBaseSpeed * speedReduction * 0.95 * speedMultiplier * (1 + (Math.random() * 0.02));
                strafe(airSpeed);
            }
        } else if (activeLowhopMode === "longjump") {
            if (offGroundTicks === 0) {
                if (now - lastJump > groundstrafeJumpFreq * 2) {
                    const baseSpeed = longjumpBoost * speedReduction * forwardBoost * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(baseSpeed);
                    if (!jumpDown()) jumpKey.setState(true);
                    player.field_70181_x = longjumpJumpHeight;
                    blinkActive = true;
                    lastJump = now;
                }
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                if (offGroundTicks <= longjumpBlinkTicks) {
                    const glideSpeed = longjumpBoost * speedReduction * longjumpGlideDecay * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(glideSpeed);
                } else {
                    blinkActive = false;
                    storedPackets.forEach(packet => Client.getMinecraft().field_71439_g.field_71174_a.func_147297_a(packet));
                    storedPackets = [];
                    const airSpeed = longjumpBoost * speedReduction * 0.85 * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(airSpeed);
                }
            }
        } else if (activeLowhopMode === "bhop") {
            if (offGroundTicks === 0) {
                if (now - lastJump > groundstrafeJumpFreq / 2) {
                    const baseSpeed = bhopBaseSpeed * speedReduction * forwardBoost * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(baseSpeed);
                    if (!jumpDown()) jumpKey.setState(true);
                    player.field_70181_x = bhopJumpHeight;
                    lastJump = now;
                }
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                const airSpeed = bhopBaseSpeed * speedReduction * 0.98 * speedMultiplier * (1 + (Math.random() * 0.02));
                strafe(airSpeed);
            }
        }
    } else if (speedEnabled && isMoving() && !noAction()) {
        if (activeSpeedMode === "groundstrafe") {
            if (player.field_70122_E && now - lastJump > groundstrafeJumpFreq) {
                const baseSpeed = groundstrafeBaseSpeed * groundstrafeSpeed * speedReduction * forwardBoost * speedMultiplier * (1 + (Math.random() * 0.02));
                strafe(baseSpeed);
                if (!jumpDown()) jumpKey.setState(true);
                player.field_70181_x = groundstrafeJumpHeight;
                lastJump = now;
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                const airSpeed = groundstrafeBaseSpeed * speedReduction * 0.95 * speedMultiplier * (1 + (Math.random() * 0.02));
                strafe(airSpeed);
            }
        } else if (activeSpeedMode === "ground") {
            if (player.field_70122_E) {
                player.field_70159_w *= groundSpeed * speedReduction * forwardBoost * groundFriction * speedMultiplier;
                player.field_70179_y *= groundSpeed * speedReduction * forwardBoost * groundFriction * speedMultiplier;
            }
            if (player.field_70122_E && player.field_71439_g % groundBlinkFreq === 0) {
                blinkActive = true;
            } else {
                blinkActive = false;
                storedPackets.forEach(packet => Client.getMinecraft().field_71439_g.field_71174_a.func_147297_a(packet));
                storedPackets = [];
            }
        } else if (activeSpeedMode === "airspeed") {
            if (player.field_70122_E && now - lastJump > groundstrafeJumpFreq) {
                if (!jumpDown()) jumpKey.setState(true);
                player.field_70181_x = airspeedJumpHeight;
                lastJump = now;
            } else {
                if (!jumpDown()) jumpKey.setState(false);
                if (!player.field_70122_E) {
                    const currentSpeed = Math.sqrt(player.field_70159_w ** 2 + player.field_70179_y ** 2);
                    const targetSpeed = airspeedBaseSpeed * airspeedMotion * speedReduction * airspeedDecay * speedMultiplier * (1 + (Math.random() * 0.02));
                    strafe(targetSpeed);
                }
            }
        }
    } else {
        if (!jumpDown()) jumpKey.setState(false);
        if (blinkActive) {
            blinkActive = false;
            storedPackets.forEach(packet => Client.getMinecraft().field_71439_g.field_71174_a.func_147297_a(packet));
            storedPackets = [];
        }
    }
});

// Packet handler
register("packetSent", (packet, event) => {
    if (!blinkActive || activeSpeedMode === "airspeed") return;
    const packetName = packet.class.getSimpleName();
    if (!packetName.includes("C0F") && !packetName.includes("C03") && !packetName.includes("C13")) {
        storedPackets.push(packet);
        cancel(event);
    }
});

// Velocity reduction
register("packetReceived", (packet, event) => {
    if (!velocityEnabled) return;
    if (packet.class.getSimpleName().includes("S12PacketEntityVelocity")) {
        const entityId = packet.func_149412_c();
        const player = Player.getPlayer();
        if (player && entityId === player.field_70157_k) {
            const motionX = packet.func_149411_d() / 8000.0;
            const motionY = packet.func_149410_e() / 8000.0;
            const motionZ = packet.func_149409_f() / 8000.0;
            player.field_70159_w += motionX * (1 - velocityReduction);
            player.field_70181_x += motionY * (1 - velocityReduction);
            player.field_70179_y += motionZ * (1 - velocityReduction);
            cancel(event);
        }
    }
});

// Render overlay
register("renderOverlay", () => {
    if (bpsEnabled && bpsDisplay) {
        Renderer.drawString(`&aBPS: ${bpsValue.toFixed(2)}`, bpsX, bpsY);
    }
    if (scaffoldOverlay && scaffoldEnabled) {
        const status = `&aScaffold: ${activeScaffoldMode} (${upwardBridgeEnabled && Player.getPlayer()?.field_70125_A < -30 ? "Upward" : "Downward"})`;
        Renderer.drawString(status, scaffoldOverlayX, scaffoldOverlayY);
    }
});

// Cleanup
register("worldUnload", () => {
    lowhopEnabled = false;
    speedEnabled = false;
    bpsEnabled = false;
    scaffoldEnabled = false;
    aimAssistEnabled = false;
    killAuraEnabled = false;
    velocityEnabled = false;
    activeLowhopMode = null;
    activeSpeedMode = null;
    activeScaffoldMode = "godbridge";
    scaffoldOverlay = false;
    scaffoldKeybind = null;
    offGroundTicks = 0;
    blinkActive = false;
    storedPackets = [];
    debugMode = false;
    adjustableMode = false;
    lastPosition = null;
    bpsValue = 0;
    toggleSneak(false);
    isScaffolding = false;
});