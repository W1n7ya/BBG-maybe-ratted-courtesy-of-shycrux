// Module: packets.js
// Provides a GUI and logging for all packet types (sent/received) with descriptions and toggles

// Remove ES6 import, use require for compatibility
const config = require("../config");
const { sendMsg } = require("../utils/Utils");

// Packet definitions (add more as needed)
const PACKETS = [
  // Sent packets
  {
    name: "C02PacketUseEntity",
    type: "sent",
    description: "Sent when you interact (attack/use) with an entity.",
    howToGet: "Trigger by left/right clicking an entity."
  },
  {
    name: "C03PacketPlayer",
    type: "sent",
    description: "Sent for player movement, rotation, and position updates.",
    howToGet: "Move, jump, or rotate your player."
  },
  {
    name: "C08PacketPlayerBlockPlacement",
    type: "sent",
    description: "Sent when you place a block or use an item on a block.",
    howToGet: "Right-click a block with an item."
  },
  {
    name: "C0DPacketCloseWindow",
    type: "sent",
    description: "Sent when you close an inventory window.",
    howToGet: "Close any inventory."
  },
  {
    name: "C0EPacketClickWindow",
    type: "sent",
    description: "Sent when you click in an inventory window.",
    howToGet: "Click any slot in an inventory."
  },
  {
    name: "C0FPacketConfirmTransaction",
    type: "sent",
    description: "Sent to confirm inventory transactions.",
    howToGet: "Interact with inventory slots."
  },
  // Received packets
  {
    name: "S02PacketChat",
    type: "received",
    description: "Received when a chat message or action bar is sent.",
    howToGet: "Send or receive a chat message."
  },
  {
    name: "S08PacketPlayerPosLook",
    type: "received",
    description: "Received to update your position and rotation (teleport, lagback).",
    howToGet: "Get teleported or lagged back."
  },
  {
    name: "S0DPacketCollectItem",
    type: "received",
    description: "Received when an item is picked up in the world.",
    howToGet: "Pick up an item."
  },
  {
    name: "S12PacketEntityVelocity",
    type: "received",
    description: "Received when an entity's velocity changes (knockback, punch).",
    howToGet: "Get hit or experience knockback."
  },
  {
    name: "S29PacketSoundEffect",
    type: "received",
    description: "Received when a sound effect is played.",
    howToGet: "Trigger a sound (e.g., open chest, shoot bow)."
  },
  {
    name: "S2DPacketOpenWindow",
    type: "received",
    description: "Received when a GUI window (inventory, chest, etc.) opens.",
    howToGet: "Open any inventory."
  },
  {
    name: "S2EPacketCloseWindow",
    type: "received",
    description: "Received when a GUI window closes.",
    howToGet: "Close any inventory."
  },
  {
    name: "S2FPacketSetSlot",
    type: "received",
    description: "Received when a slot in an inventory is updated.",
    howToGet: "Change an item in your inventory."
  },
  {
    name: "S32PacketConfirmTransaction",
    type: "received",
    description: "Received to confirm an inventory transaction.",
    howToGet: "Interact with inventory slots."
  }
];

// --- BEGIN UNIVERSAL PACKET LOGGER ---
let _universalUnregisters = [];

function registerUniversalPacketLoggers() {
  unregisterUniversalPacketLoggers();
  debug('Registering universal packet listeners');
  syncEnabledPacketsFromConfig();
  debug('Enabled packets: ' + JSON.stringify(Object.keys(enabledPackets).filter(k => enabledPackets[k])));
  // Sent packets
  const sentUnreg = register('packetSent', (packet, event) => {
    try {
      if (!packet || !packet.getClass || !packet.getClass().getSimpleName) {
        debug('[ERROR] Sent packet missing getClass or getSimpleName');
        return;
      }
      const className = packet.getClass().getSimpleName();
      debug(`[SENT] Got packet: "${className}" (enabled: ${!!enabledPackets[className]})`);
      if (loggingEnabled && enabledPackets[className]) {
        logPacket('sent', className, safePacketData(packet));
      }
    } catch (err) {
      debug(`[ERROR] Exception in sent packet handler: ${err && err.stack ? err.stack : err}`);
      ChatLib.chat(`&c[Packets] Error in sent packet handler: ${err}`);
    }
  });
  // Received packets
  const recvUnreg = register('packetReceived', (packet, event) => {
    try {
      if (!packet || !packet.getClass || !packet.getClass().getSimpleName) {
        debug('[ERROR] Received packet missing getClass or getSimpleName');
        return;
      }
      const className = packet.getClass().getSimpleName();
      debug(`[RECEIVED] Got packet: "${className}" (enabled: ${!!enabledPackets[className]})`);
      if (loggingEnabled && enabledPackets[className]) {
        logPacket('received', className, safePacketData(packet));
      }
    } catch (err) {
      debug(`[ERROR] Exception in received packet handler: ${err && err.stack ? err.stack : err}`);
      ChatLib.chat(`&c[Packets] Error in received packet handler: ${err}`);
    }
  });
  _universalUnregisters = [sentUnreg, recvUnreg];
  debug('Universal packet listeners registered.');
}

function unregisterUniversalPacketLoggers() {
  _universalUnregisters.forEach(unreg => { try { unreg.unregister(); } catch (e) { debug('[ERROR] Failed to unregister: ' + e); } });
  _universalUnregisters = [];
  debug('Universal packet listeners unregistered.');
}

// Debug toggle (add to config GUI if you want)
if (typeof config.packetDebug === 'undefined') config.packetDebug = false;
function debug(msg) { if (config.packetDebug) ChatLib.chat(`&d[PacketDebug] &7${msg}`); }

// State
let enabledPackets = {};
let loggingEnabled = false;
let _packetLoggers = {};

// Helper: Remove all listeners
function unregisterAllPacketLoggers() {
  Object.values(_packetLoggers).forEach(unreg => { try { unreg(); } catch (e) { debug('Unreg error: ' + e); } });
  _packetLoggers = {};
}

// Helper: Add listeners for all enabled packets
function registerAllPacketLoggers() {
  unregisterAllPacketLoggers();
  debug('Registering listeners for enabled packets');
  let registeredAny = false;
  let enabledList = Object.keys(enabledPackets).filter(k => enabledPackets[k]);
  debug('Enabled packets: ' + JSON.stringify(enabledList));
  PACKETS.forEach(pkt => {
    if (!enabledPackets[pkt.name]) {
      debug(`Skipping ${pkt.name} (not enabled)`);
      return;
    }
    let unregister = null;
    try {
      // Try event wrapper first
      let eventPath = null;
      let eventFile = pkt.name.substring(0, 4) + 'Event.js';
      if (pkt.type === 'sent') eventPath = `../events/packets/client/${eventFile}`;
      else eventPath = `../events/packets/server/${eventFile}`;
      debug(`Enabled: ${pkt.name}, type: ${pkt.type}, eventPath: ${eventPath}`);
      try {
        debug(`Trying to require event wrapper: ${eventPath}`);
        const eventModule = require(eventPath);
        debug(`require(${eventPath}) result: ` + JSON.stringify(eventModule));
        if (eventModule && typeof eventModule.addListener === 'function') {
          unregister = eventModule.addListener((packet, event, mcEvent) => {
            debug(`(Event) ${pkt.type} ${pkt.name}`);
            logPacket(pkt.type, pkt.name, safePacketData(packet));
          });
          debug(`Event-based logger registered for ${pkt.name}`);
          registeredAny = true;
        } else {
          debug(`Event module for ${pkt.name} loaded but does not have addListener. Keys: ` + Object.keys(eventModule || {}).join(", "));
        }
      } catch (e) {
        debug(`No event wrapper for ${pkt.name}, fallback. Error: ${e && e.stack ? e.stack : e}`);
        try {
          const javaPath = `net.minecraft.network.play.${pkt.type === 'sent' ? 'client' : 'server'}.${pkt.name}`;
          debug(`Trying Java.type: ${javaPath}`);
          const PacketClass = Java.type(javaPath);
          if (pkt.type === 'sent') {
            unregister = register('packetSent', (packet, event) => {
              debug(`(Raw) sent ${pkt.name}`);
              logPacket('sent', pkt.name, safePacketData(packet));
            }).setFilteredClass(PacketClass);
            debug(`Raw sent logger registered for ${pkt.name}`);
          } else {
            unregister = register('packetReceived', (packet, event) => {
              debug(`(Raw) received ${pkt.name}`);
              logPacket('received', pkt.name, safePacketData(packet));
            }).setFilteredClass(PacketClass);
            debug(`Raw received logger registered for ${pkt.name}`);
          }
          registeredAny = true;
        } catch (err) {
          debug(`Java.type failed for ${pkt.name}: ${err && err.stack ? err.stack : err}`);
          ChatLib.chat(`&c[Packets] Java.type failed for ${pkt.name}: ${err}`);
        }
      }
      _packetLoggers[pkt.name] = () => { try { if (unregister && unregister.unregister) unregister.unregister(); } catch (e) {} };
    } catch (e) {
      debug(`Failed to register for ${pkt.name}: ${e && e.stack ? e.stack : e}`);
      ChatLib.chat(`&c[Packets] Failed to register for ${pkt.name}: ${e}`);
    }
  });
  if (!registeredAny) {
    debug('No packet loggers were registered!');
    ChatLib.chat("&c[Packets] No packet loggers were registered. Check your toggles and debug output.");
  }
}

// Helper: Get safe packet info
function safePacketData(packet) {
  try {
    if (!packet) return {};
    if (typeof packet.toString === 'function') return { toString: packet.toString() };
    return { raw: JSON.stringify(packet) };
  } catch (e) {
    return { error: 'Could not serialize packet: ' + e };
  }
}

// Log to chat
function logPacket(type, name, data) {
  if (!loggingEnabled || !enabledPackets[name]) {
    debug(`logPacket: Not logging ${name} (loggingEnabled=${loggingEnabled}, enabled=${enabledPackets[name]})`);
    return;
  }
  try {
    ChatLib.chat(`&7[${type.toUpperCase()}] &b${name} &8- &7${JSON.stringify(data)}`);
    debug(`Logged packet: ${name}`);
  } catch (e) {
    debug(`Error logging packet ${name}: ${e}`);
    ChatLib.chat(`&c[Packets] Error logging packet ${name}: ${e}`);
  }
}

// Sync enabledPackets with config
function syncEnabledPacketsFromConfig() {
  PACKETS.forEach(pkt => {
    const cfgKey = `packet_${pkt.name}`;
    enabledPackets[pkt.name] = !!config[cfgKey];
  });
}

// GUI integration (for config.js)
function getPacketSettings() {
  syncEnabledPacketsFromConfig();
  return PACKETS.map(pkt => ({
    name: pkt.name,
    type: pkt.type,
    description: pkt.description,
    howToGet: pkt.howToGet,
    enabled: enabledPackets[pkt.name]
  }));
}

function setLoggingEnabled(val) {
  loggingEnabled = val;
  syncEnabledPacketsFromConfig();
  debug('setLoggingEnabled: ' + val);
  if (val) {
    registerUniversalPacketLoggers();
    sendMsg("&aPacket logging enabled.");
  } else {
    unregisterUniversalPacketLoggers();
    sendMsg("&cPacket logging disabled.");
  }
}

function togglePacket(name, value) {
  enabledPackets[name] = value;
  config[`packet_${name}`] = value;
  if (loggingEnabled) registerAllPacketLoggers();
}

function isLoggingEnabled() { return loggingEnabled; }

// Register /packetstart and /packetstop commands
register("command", () => { setLoggingEnabled(true); }).setName("packetstart");
register("command", () => { setLoggingEnabled(false); }).setName("packetstop");

// Export
module.exports = {
  getPacketSettings,
  togglePacket,
  setLoggingEnabled,
  isLoggingEnabled
};
// --- END CLEAN, RELIABLE PACKET LOGGER ---
