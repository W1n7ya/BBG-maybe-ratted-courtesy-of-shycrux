// Basic desync detector for Hypixel Skyblock
// Designed for compatibility with older ChatTriggers versions

import { data } from "../managers/configManager";
import config from "../config";

// Configuration values
const PACKET_TIMEOUT = 5000;      // No packets for 5 seconds = desync
const TPS_THRESHOLD = 12;         // TPS below this = potential desync
const CHUNK_TIMEOUT = 15000;      // No chunk updates for 15s = desync (increased significantly)
const ENTITY_TIMEOUT = 7500;      // No entity updates for 7.5s = desync (increased from 5s)
const POSITION_THRESHOLD = 0.01;  // Position diff threshold for movement
const MOVEMENT_THRESHOLD = 0.5;   // Movement amount that should trigger chunk updates
const MIN_MOVEMENT_FOR_CHECK = 3; // Minimum blocks moved before chunk timeout is considered
const FORCED_PACKET_DROP_RATE = 0.9; // Rate at which packets are dropped when forcing packet desync
const RESYNC_DETECTION_INTERVAL = 500; // Check for resync every 500ms
const AUTO_RESYNC_CHECK_INTERVAL = 1000; // Check if we've resynced every 1 second

// State tracking
let lastPacketTime = Date.now();
let lastPositionTime = Date.now();
let lastChunkTime = Date.now();
let lastEntityTime = Date.now();
let lastPosition = null;
let lastKnownPosition = null;
let movementAttempted = false;
let tpsValues = [];
let tpsCounter = 0;
let stepTime = 0;
let desyncDetected = false;
let desyncType = null;
let desyncStartTime = null;
let isActive = true;
let temporarilyDisabled = false;

// Additional state tracking
let playerMovedSignificantly = false;
let lastSignificantMovement = Date.now();
let inDungeon = false;
let chunkUpdateCount = 0;
let playerIsMoving = false;
let lastPlayerMovement = Date.now();
let movementDistance = 0;
let isInHypixelSkyblock = true;   // Assume true by default
let lastLocationCheck = Date.now();
let safeLocations = ["hub", "island", "private island", "your island"];
let inSafeLocation = false;
let checkingInterval = 5000;      // Check location every 5 seconds
let joinedServerTime = Date.now(); // Track when the player joined the server
let SERVER_JOIN_GRACE_PERIOD = 10000; // 10 second grace period after joining a server

// Variables for forced desync testing
let forcedDesyncActive = false;
let forcedDesyncType = null;
let packetBlockingActive = false;
let entityBlockingActive = false;
let chunkBlockingActive = false;
let positionDesyncActive = false;
let forcedDesyncInterval = null;
let lastPacketBlockCount = 0;
let lastChunkBlockCount = 0;
let lastEntityBlockCount = 0;
let resyncDetectionActive = false;
let resyncDetectionStepTime = 0;
let consecutivePacketsReceived = 0;
let consecutiveChunkUpdatesReceived = 0;
let consecutiveEntityUpdatesReceived = 0;

// Auto resync detection variables
let autoResyncInterval = null;
let autoResyncActive = false;
let autoResyncStepTime = 0;
let normalPacketReceiveThreshold = 5; // Number of consecutive packet updates needed to detect resync
let normalChunkUpdateThreshold = 3;   // Number of consecutive chunk updates needed to detect resync
let normalEntityUpdateThreshold = 3;  // Number of consecutive entity updates needed to detect resync
let positionUpdateThreshold = 2;      // Number of position updates needed to detect resync

// UI elements
let desyncMessage = null;
let infoComponent = null;
let resetComponent = null;

// Declare variables for button click handling
let resetButtonArea = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
};

// GUI button area tracking
let guiDesyncButtonArea = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
};

// Get current TPS value
function getCurrentTPS() {
    try {
        return Server.getTPS();
    } catch (e) {
        if (tpsValues.length === 0) return 20;
        let sum = 0;
        for (let i = 0; i < tpsValues.length; i++) {
            sum += tpsValues[i];
        }
        return sum / tpsValues.length;
    }
}

// Create UI components for messages
function createUI() {
    if (desyncMessage !== null) return;

    desyncMessage = new TextComponent("§c§lDESYNC DETECTED!");

    resetComponent = new TextComponent("§e[RESET]");
    resetComponent.setClick("run_command", "/desync reset");
    resetComponent.setHoverValue("§eClick to reset detection");

    infoComponent = new TextComponent("§b[INFO]");
    infoComponent.setClick("run_command", "/desync info");
    infoComponent.setHoverValue("§bShow more information");
}

// Trigger desync alert
function triggerDesync(type, message) {
    if (desyncDetected) return;

    desyncDetected = true;
    desyncType = type;
    desyncStartTime = Date.now();

    createUI();

    // Visual alert
    Client.showTitle("§c§lDESYNC DETECTED", "§e" + message, 0, 300, 20);

    // Audio alert
    World.playSound("entity.endermen.teleport", 1.0, 0.5);
    setTimeout(function() {
        World.playSound("entity.endermen.teleport", 1.0, 0.3);
    }, 500);

    // Chat message - using individual components instead of append()
    ChatLib.chat("§c§l[DESYNC] §r§c" + message + " ");
    ChatLib.chat(resetComponent);
    ChatLib.chat(" ");
    ChatLib.chat(infoComponent);
    ChatLib.chat("§7Auto resync detection is active. The overlay will be removed when normal game behavior is detected.");

    // Start monitoring for auto resync
    checkForAutoResync();
}

// Reset detection state
function resetDetection() {
    lastPacketTime = Date.now();
    lastPositionTime = Date.now();
    lastChunkTime = Date.now();
    lastEntityTime = Date.now();
    desyncDetected = false;
    desyncType = null;
    desyncStartTime = null;

    if (temporarilyDisabled) {
        Client.showTitle("§a§lDESYNC DETECTOR RESET", "", 0, 40, 10);
    } else {
        Client.showTitle("§a§lRE-SYNCED", "", 0, 40, 10);
    }

    World.playSound("entity.experience_orb.pickup", 1.0, 1.0);
}

// Check for packet timeout
function checkPackets() {
    if (desyncDetected) return false;

    const timeSincePacket = Date.now() - lastPacketTime;
    if (timeSincePacket > PACKET_TIMEOUT) {
        triggerDesync("PACKET_TIMEOUT", "No server packets for " + (timeSincePacket / 1000).toFixed(1) + "s");
        return true;
    }

    return false;
}

// Check for position desync
function checkPosition() {
    if (!lastPosition || desyncDetected) return false;

    try {
        const player = Player.getPlayer();
        if (!player) return false;

        const currentPos = {
            x: player.getX(),
            y: player.getY(),
            z: player.getZ()
        };

        const timeSinceUpdate = Date.now() - lastPositionTime;
        const positionDiff = Math.sqrt(
            Math.pow(currentPos.x - lastPosition.x, 2) +
            Math.pow(currentPos.z - lastPosition.z, 2)
        );

        if (movementAttempted && positionDiff < POSITION_THRESHOLD && timeSinceUpdate > 1000) {
            triggerDesync("POSITION_DESYNC", "Position not updating despite movement");
            return true;
        }

        lastPosition = currentPos;
        lastPositionTime = Date.now();
        movementAttempted = false;
    } catch (e) {
        // Silent error handling
    }

    return false;
}

// Check for low TPS
function checkTPS() {
    if (desyncDetected) return false;

    const currentTPS = getCurrentTPS();
    if (currentTPS < TPS_THRESHOLD) {
        triggerDesync("LOW_TPS", "Server TPS dropped to " + currentTPS.toFixed(1));
        return true;
    }

    return false;
}

// Check for chunk update issues
function checkChunks() {
    if (desyncDetected) return false;

    const timeSinceChunk = Date.now() - lastChunkTime;
    const timeSinceMovement = Date.now() - lastPlayerMovement;

    if (timeSinceChunk > CHUNK_TIMEOUT && movementDistance > MIN_MOVEMENT_FOR_CHECK && !inSafeLocation) {
        triggerDesync("CHUNK_TIMEOUT", "No chunk updates for " + (timeSinceChunk / 1000).toFixed(1) + "s");
        return true;
    }

    return false;
}

// Check for entity update issues
function checkEntities() {
    if (desyncDetected) return false;

    const timeSinceEntity = Date.now() - lastEntityTime;

    // Prevent false detections during server join grace period
    if (Date.now() - joinedServerTime < SERVER_JOIN_GRACE_PERIOD) return false;

    if (timeSinceEntity > ENTITY_TIMEOUT) {
        triggerDesync("ENTITY_TIMEOUT", "No entity updates for " + (timeSinceEntity / 1000).toFixed(1) + "s");
        return true;
    }

    return false;
}

// Run all desync checks
function performChecks() {
    if (!isActive || temporarilyDisabled || desyncDetected) return;

    // Check for forced desync conditions first
    if (forcedDesyncActive) {
        if (packetBlockingActive) {
            triggerDesync("FORCED_PACKET_DESYNC", "Forced packet desync active");
            return;
        }

        if (positionDesyncActive) {
            triggerDesync("FORCED_POSITION_DESYNC", "Forced position desync active");
            return;
        }

        if (chunkBlockingActive) {
            triggerDesync("FORCED_CHUNK_DESYNC", "Forced chunk desync active");
            return;
        }

        if (entityBlockingActive) {
            triggerDesync("FORCED_ENTITY_DESYNC", "Forced entity desync active");
            return;
        }
    }

    // Run normal checks in sequence
    if (checkPackets()) return;
    if (checkPosition()) return;
    if (checkTPS()) return;
    if (checkChunks()) return;
    if (checkEntities()) return;
}

// Temporarily disable detection
function disableTemporarily(duration) {
    temporarilyDisabled = true;
    resetDetection();

    ChatLib.chat("§e§lDesync Detector temporarily disabled for " + (duration/1000) + " seconds");

    setTimeout(function() {
        temporarilyDisabled = false;
        ChatLib.chat("§a§lDesync Detector re-activated");
    }, duration);
}

// Show detector status
function showStatus() {
    ChatLib.chat("§e§l----- Desync Detector Status -----");
    ChatLib.chat("§eActive: §f" + (isActive ? "Yes" : "No"));
    ChatLib.chat("§eTemporarily Disabled: §f" + (temporarilyDisabled ? "Yes" : "No"));
    ChatLib.chat("§eDesync Detected: §f" + (desyncDetected ? "Yes" : "No"));

    if (desyncDetected) {
        ChatLib.chat("§eDesync Type: §f" + desyncType);
        ChatLib.chat("§eDuration: §f" + ((Date.now() - desyncStartTime) / 1000).toFixed(1) + "s");
        ChatLib.chat("§eAuto resync: §fMonitoring for normal game behavior");
    }

    ChatLib.chat("§eCurrent TPS: §f" + getCurrentTPS().toFixed(1));
    ChatLib.chat("§eTime since last packet: §f" + ((Date.now() - lastPacketTime) / 1000).toFixed(1) + "s");
    ChatLib.chat("§eTime since last chunk update: §f" + ((Date.now() - lastChunkTime) / 1000).toFixed(1) + "s");
    ChatLib.chat("§eTime since last entity update: §f" + ((Date.now() - lastEntityTime) / 1000).toFixed(1) + "s");
}

// Check for auto resync based on the type of desync detected
function checkForAutoResync() {
    if (!desyncDetected || !isActive) {
        autoResyncActive = false;
        return;
    }

    autoResyncActive = true;

    // Track counters for consecutive updates
    let packetCounter = 0;
    let chunkCounter = 0;
    let entityCounter = 0;
    let positionCounter = 0;
    let tpsOkCounter = 0;

    // Variables to track last check times
    let lastPacketCheck = Date.now();
    let lastChunkCheck = Date.now();
    let lastEntityCheck = Date.now();
    let lastPositionCheck = Date.now();
    let lastTpsCheck = Date.now();
}

// Test desync detection with simulated events
function testDesync(type) {
    let message = "";

    switch (type) {
        case "packet":
            message = "Simulated packet timeout";
            break;
        case "position":
            message = "Simulated position desync";
            break;
        case "tps":
            message = "Simulated low TPS";
            break;
        case "chunk":
            message = "Simulated chunk loading issue";
            break;
        case "entity":
            message = "Simulated entity update timeout";
            break;
        default:
            message = "Simulated generic desync";
            type = "TEST_DESYNC";
    }

    triggerDesync(type.toUpperCase(), message);
    ChatLib.chat("§b§l[Desync Detector] §e§lTest mode: §r§eSimulating " + type + " desync");
}

// Force an actual desync condition
function forceDesync(type) {
    if (forcedDesyncActive) {
        stopForcedDesync();
        ChatLib.chat("§e§lStopped previous forced desync");
    }

    forcedDesyncActive = true;
    forcedDesyncType = type.toLowerCase();

    // Set flags based on type
    switch (forcedDesyncType) {
        case "packet":
            packetBlockingActive = true;
            lastPacketBlockCount = 0;
            ChatLib.chat("§c§l[DESYNC FORCE] §r§cForcing packet desync - blocking " +
                (FORCED_PACKET_DROP_RATE * 100) + "% of packets");
            ChatLib.chat("§7Wait for the detector to naturally detect the desync condition");
            break;

        case "position":
            positionDesyncActive = true;
            // Create actual position desync by preventing position updates
            ChatLib.chat("§c§l[DESYNC FORCE] §r§cForcing position desync - blocking position updates");
            ChatLib.chat("§7Try to move around and wait for the detector to naturally detect it");
            break;

        case "chunk":
            chunkBlockingActive = true;
            lastChunkBlockCount = 0;
            ChatLib.chat("§c§l[DESYNC FORCE] §r§cForcing chunk desync - blocking all chunk updates");
            ChatLib.chat("§7Move to a new area and wait for the detector to naturally detect it");
            break;

        case "entity":
            entityBlockingActive = true;
            lastEntityBlockCount = 0;
            ChatLib.chat("§c§l[DESYNC FORCE] §r§cForcing entity desync - blocking entity updates");
            ChatLib.chat("§7Wait for the detector to naturally detect the entity desync");
            break;

        default:
            forcedDesyncActive = false;
            ChatLib.chat("§cUnknown desync type: " + type);
            ChatLib.chat("§7Valid types: packet, position, chunk, entity");
            return;
    }

    // Start checking for resync conditions
    startResyncDetection();

    // Set up auto-stop after 30 seconds for safety
    forcedDesyncInterval = setTimeout(function() {
        if (forcedDesyncActive) {
            stopForcedDesync();
            ChatLib.chat("§e§lForced desync automatically stopped after 30 seconds");
        }
    }, 30000);
}

// Start checking for resync conditions
function startResyncDetection() {
    resyncDetectionActive = true;

    register("step", function() {
        if (!resyncDetectionActive || !forcedDesyncActive || !desyncDetected) return;

        resyncDetectionStepTime += 1 / 20;
        if (resyncDetectionStepTime < RESYNC_DETECTION_INTERVAL / 1000) return;
        resyncDetectionStepTime = 0;

        // Check for resync based on the type of desync
        if (forcedDesyncType === "packet" && !packetBlockingActive) {
            resetDetection();
            ChatLib.chat("§a§lRe-synced: Packet blocking stopped");
        }
        else if (forcedDesyncType === "chunk" && !chunkBlockingActive) {
            resetDetection();
            ChatLib.chat("§a§lRe-synced: Chunk updates restored");
        }
        else if (forcedDesyncType === "entity" && !entityBlockingActive) {
            resetDetection();
            ChatLib.chat("§a§lRe-synced: Entity updates restored");
        }
        else if (forcedDesyncType === "position" && !positionDesyncActive) {
            resetDetection();
            ChatLib.chat("§a§lRe-synced: Position updates restored");
        }
    });
}

// Stop any forced desync condition
function stopForcedDesync() {
    if (forcedDesyncInterval) {
        clearTimeout(forcedDesyncInterval);
        forcedDesyncInterval = null;
    }

    resyncDetectionActive = false;

    packetBlockingActive = false;
    entityBlockingActive = false;
    chunkBlockingActive = false;
    positionDesyncActive = false;
    forcedDesyncActive = false;

    // If desync was detected, reset it
    if (desyncDetected && forcedDesyncType) {
        ChatLib.chat("§a§lForced " + forcedDesyncType + " desync condition stopped");
        resetDetection();
    } else {
        ChatLib.chat("§a§lForced desync condition stopped");
    }

    forcedDesyncType = null;
}

// Register tick handler for tracking
register("tick", function() {
    if (!isActive) return;

    // TPS tracking
    tpsCounter++;
    if (tpsCounter >= 20) {
        tpsCounter = 0;
        const currentTPS = getCurrentTPS();
        tpsValues.push(currentTPS);
        if (tpsValues.length > 20) tpsValues.shift();
    }

    // Track entity updates
    try {
        const entities = World.getAllEntities();
        if (entities && entities.length > 0) {
            lastEntityTime = Date.now();
        }
    } catch (e) {
        // Silent error
    }

    // Track player movement
    try {
        const player = Player.getPlayer();
        if (player) {
            const currentPos = {
                x: player.getX(),
                y: player.getY(),
                z: player.getZ()
            };

            if (lastKnownPosition) {
                const moveX = Math.abs(currentPos.x - lastKnownPosition.x);
                const moveZ = Math.abs(currentPos.z - lastKnownPosition.z);

                movementDistance += Math.sqrt(moveX * moveX + moveZ * moveZ);

                if (moveX > MOVEMENT_THRESHOLD || moveZ > MOVEMENT_THRESHOLD) {
                    playerMovedSignificantly = true;
                    lastSignificantMovement = Date.now();
                } else {
                    playerMovedSignificantly = false;
                }

                if (moveX > 0.001 || moveZ > 0.001) {
                    movementAttempted = true;
                    if (!lastPosition) lastPosition = currentPos;
                }
            }

            lastKnownPosition = currentPos;
        }
    } catch (e) {
        // Silent error
    }

    // Check location periodically
    if (Date.now() - lastLocationCheck > checkingInterval) {
        lastLocationCheck = Date.now();
        try {
            const location = Player.getLocationName();
            inSafeLocation = safeLocations.some(loc => location.toLowerCase().includes(loc));
        } catch (e) {
            inSafeLocation = false;
        }
    }
});

// Track packet activity
register("packetReceived", function(packet, event) {
    if (!isActive) return;

    lastPacketTime = Date.now();

    // Block packets if packet blocking is active
    if (packetBlockingActive) {
        if (Math.random() < FORCED_PACKET_DROP_RATE) { // Block packets based on drop rate
            cancel(event);
            return;
        }
    }

    // Block entity packets if entity blocking is active
    if (entityBlockingActive) {
        if (packet.toString().includes("S0CPacketSpawnPlayer") ||
            packet.toString().includes("S0FPacketSpawnMob") ||
            packet.toString().includes("S12PacketEntityVelocity") ||
            packet.toString().includes("S14PacketEntity") ||
            packet.toString().includes("S18PacketEntityTeleport") ||
            packet.toString().includes("S19PacketEntityStatus") ||
            packet.toString().includes("S20PacketEntityProperties")) {
            cancel(event);
            return;
        }
    }

    // Block chunk packets if chunk blocking is active
    if (chunkBlockingActive) {
        if (packet.toString().includes("S21PacketChunkData") ||
            packet.toString().includes("S22PacketMultiBlockChange") ||
            packet.toString().includes("S23PacketBlockChange") ||
            packet.toString().includes("S26PacketMapChunkBulk")) {
            cancel(event);
            return;
        }
    }

    try {
        const packetStr = packet.toString();
        if (packetStr.includes("S21PacketChunkData") ||
            packetStr.includes("S22PacketMultiBlockChange") ||
            packetStr.includes("S23PacketBlockChange")) {
            lastChunkTime = Date.now();
            chunkUpdateCount++;
        }
    } catch (e) {
        // Silent error
    }
});

// Run periodic checks for desync
register("step", function() {
    stepTime += 1/20;
    if (stepTime < 0.5) return;
    stepTime = 0;

    performChecks();
    checkForAutoResync();
});

// Render desync warning overlay
register("renderOverlay", function() {
    if (!desyncDetected || !isActive) return;

    createUI();

    const screenWidth = Renderer.screen.getWidth();
    const screenHeight = Renderer.screen.getHeight();

    // Calculate time since desync
    const timeSinceDesync = ((Date.now() - desyncStartTime) / 1000).toFixed(1);

    // Pulse effect for background
    const alpha = Math.abs(Math.sin(Date.now() / 500) * 50) + 100;

    // Draw background
    Renderer.drawRect(
        Renderer.color(80, 0, 0, alpha),
        screenWidth / 2 - 150,
        screenHeight / 4,
        300,
        70
    );

    // Draw border
    Renderer.drawRect(
        Renderer.color(255, 0, 0, 255),
        screenWidth / 2 - 150,
        screenHeight / 4,
        300,
        3
    );

    // Draw title
    Renderer.drawString(
        "§c§lDESYNC DETECTED!",
        screenWidth / 2 - Renderer.getStringWidth("§c§lDESYNC DETECTED!") / 2,
        screenHeight / 4 + 10,
        true
    );

    // Draw desync type
    Renderer.drawString(
        "§eType: §f" + desyncType,
        screenWidth / 2 - 140,
        screenHeight / 4 + 30,
        false
    );

    // Draw duration
    Renderer.drawString(
        "§eDuration: §f" + timeSinceDesync + "s",
        screenWidth / 2 - 140,
        screenHeight / 4 + 45,
        false
    );

    // Draw reset button without using TextComponent's setX/setY
    const resetText = "§e[RESET]";
    const resetX = screenWidth / 2 + 80;
    const resetY = screenHeight / 4 + 35;

    Renderer.drawString(
        resetText,
        resetX,
        resetY,
        false
    );

    // Update button click area for the reset button
    resetButtonArea = {
        x1: resetX,
        y1: resetY,
        x2: resetX + Renderer.getStringWidth(resetText),
        y2: resetY + 8 // Approximate height of text
    };
});

// Render GUI desync button
register("renderOverlay", function() {
    // Check if the feature is enabled in config
    if (!config.guiDesyncButton || !isActive) return;

    // Only show button in GUIs, not in the game world
    if (!Player.getPlayer() || !Client.isInGui()) return;

    const screenWidth = Renderer.screen.getWidth();
    const screenHeight = Renderer.screen.getHeight();

    // Position in top right corner with some margin
    const buttonText = "§c[FORCE DESYNC]";
    const buttonWidth = Renderer.getStringWidth(buttonText) + 6;
    const buttonHeight = 12;
    const marginX = 5;
    const marginY = 5;

    const buttonX = screenWidth - buttonWidth - marginX;
    const buttonY = marginY;

    // Draw button background with pulse effect when active
    let bgColor;
    if (packetBlockingActive) {
        // Pulsing red when desync is active
        const alpha = Math.abs(Math.sin(Date.now() / 500) * 50) + 100;
        bgColor = Renderer.color(200, 50, 50, alpha);
    } else {
        // Normal dark red when inactive
        bgColor = Renderer.color(120, 20, 20, 180);
    }

    // Draw button
    Renderer.drawRect(bgColor, buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw border
    Renderer.drawRect(Renderer.color(220, 50, 50, 255), buttonX, buttonY, buttonWidth, 1);
    Renderer.drawRect(Renderer.color(220, 50, 50, 255), buttonX, buttonY + buttonHeight - 1, buttonWidth, 1);

    // Draw text centered in button
    Renderer.drawString(
        buttonText,
        buttonX + 3,
        buttonY + 3,
        false
    );

    // Update clickable area
    guiDesyncButtonArea = {
        x1: buttonX,
        y1: buttonY,
        x2: buttonX + buttonWidth,
        y2: buttonY + buttonHeight
    };
});

// Add a mouse click handler for the reset button
register("clicked", function(x, y, button, pressed) {
    if (!pressed || button !== 0 || !desyncDetected || !isActive) return;

    // Check if click is within reset button area
    if (x >= resetButtonArea.x1 && x <= resetButtonArea.x2 &&
        y >= resetButtonArea.y1 && y <= resetButtonArea.y2) {
        resetDetection();
        ChatLib.chat("§a§lDesync detection has been reset");
    }
});

// Handle clicks on the GUI desync button
register("clicked", function(x, y, button, pressed) {
    // Only process left mouse button down clicks
    if (!pressed || button !== 0 || !config.guiDesyncButton || !isActive) return;

    // Check if we're in a GUI
    if (!Player.getPlayer() || !Client.isInGui()) return;

    // Check if click is within button area
    if (x >= guiDesyncButtonArea.x1 && x <= guiDesyncButtonArea.x2 &&
        y >= guiDesyncButtonArea.y1 && y <= guiDesyncButtonArea.y2) {

        // Toggle packet desync
        if (packetBlockingActive) {
            stopForcedDesync();
            ChatLib.chat("§a§lPacket desync disabled");
        } else {
            forceDesync("packet");
            ChatLib.chat("§c§lPacket desync forced - blocking " +
                (FORCED_PACKET_DROP_RATE * 100) + "% of packets");
        }
    }
});

// Reset on world unload
register("worldUnload", function() {
    if (desyncDetected) {
        resetDetection();
    }
});

// Register main command
register("command", function(action) {
    if (!action) {
        if (desyncDetected) {
            resetDetection();
            disableTemporarily(30000); // 30 seconds
            ChatLib.chat("§a§lDesync detection reset and temporarily disabled for 30 seconds");
        } else {
            temporarilyDisabled = !temporarilyDisabled;
            ChatLib.chat(temporarilyDisabled ?
                "§e§lDesync Detector temporarily disabled" :
                "§a§lDesync Detector active");
        }
    } else if (action === "reset") {
        resetDetection();
        ChatLib.chat("§a§lDesync detection has been reset");
    } else if (action === "info") {
        showStatus();
    }
}).setName("desync");

// Register test command
register("command", function(type) {
    if (!type) {
        ChatLib.chat("§b§l[Desync Detector] §r§eTest command usage:");
        ChatLib.chat("§7- §e/desynctest packet §7- Test packet timeout detection");
        ChatLib.chat("§7- §e/desynctest position §7- Test position desync detection");
        ChatLib.chat("§7- §e/desynctest tps §7- Test TPS drop detection");
        ChatLib.chat("§7- §e/desynctest chunk §7- Test chunk loading detection");
        ChatLib.chat("§7- §e/desynctest entity §7- Test entity update detection");
        ChatLib.chat("§7- §e/desynctest generic §7- Test generic desync detection");
        return;
    }

    testDesync(type.toLowerCase());
}).setName("desynctest");

// Register force desync command
/*
register("command", function(type) {
    if (!type) {
        ChatLib.chat("§c§l[DESYNC FORCE] §r§eCommand usage:");
        ChatLib.chat("§7- §e/desyncforce packet §7- Force actual packet desync");
        ChatLib.chat("§7- §e/desyncforce position §7- Force actual position desync");
        ChatLib.chat("§7- §e/desyncforce chunk §7- Force actual chunk desync");
        ChatLib.chat("§7- §e/desyncforce entity §7- Force actual entity desync");
        ChatLib.chat("§7- §e/desyncforce stop §7- Stop any forced desync");
        return;
    }

    if (type.toLowerCase() === "stop") {
        stopForcedDesync();
    } else {
        forceDesync(type.toLowerCase());
    }
}).setName("desyncforce");
*/

// Initialize
isActive = true;
ChatLib.chat("§b§l[Desync Detector] §aLoaded and active");
ChatLib.chat("§7- Use §e/desync §7to toggle or reset");
ChatLib.chat("§7- Use §e/desynctest §7to test the detector");
// ChatLib.chat("§7- Use §e/desyncforce §7to force actual desync conditions");

// Export API
export function resetDesync() {
    resetDetection();
}

export function getDesyncStatus() {
    return {
        active: isActive,
        desyncDetected: desyncDetected,
        desyncType: desyncType,
        tps: getCurrentTPS()
    };
}

