import PogObject from "../../PogData";
import config from "../config";
import playerUtils from "../utils/playerUtils";
import rotationUtils from "../utils/rotationUtils";
import { C03PacketPlayer, Color } from "../utils/mappings";
import { Keybind } from "../../KeybindFix";
import dungeonUtils from "../utils/dungeonUtils";

export const data = new PogObject("byebyegoldor", {
    config: null,
    points: {}
}, "data/data.json");

const types = [
    "rotate",
    "stop",
    "bonzo",
    "jump",
    "superboom",
    "align",
    "hclip",
    "swap",
    "blink",
    "text",
    "lavaclip",
    "motion",
    "walk",
    "say",
    "keybind",
    "cmd",
    "fclip", // Added walk ring type
    "45d",
    "bhop",
    "stopwatch",
    "record"
];

function addPoint(type, args) {
    if (!data.config || !type || !types.includes(type.toLowerCase())) return;

    let argz = args?.join(" ");
    const renderManager = Client.getMinecraft().func_175598_ae();

    type = type.toLowerCase();
    let radius = 0.5;
    if (args && !isNaN(args[args.length - 1]) && type !== "text") radius = parseFloat(args[args.length - 1]);

    let room = dungeonUtils.getRoomName();
    let rotation = [dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomYaw(Player.getYaw()) : Player.getYaw(), Player.getPitch()];
    let playerCoords = [renderManager.field_78730_l, renderManager.field_78731_m - 1, renderManager.field_78728_n];
    let coords = dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomCoords(...playerCoords) : playerCoords;
    let raytrace = dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomCoords(...rotationUtils.rayTrace()) : rotationUtils.rayTrace();

    if (type == "blink" && dungeonUtils.isDungeonPoint(room)) return playerUtils.sendMessage("&Cannot place blink in clear");

    data.points[data.config].push({
        room,
        coords,
        rotation,
        type,
        argz,
        raytrace,
        radius,
        near: true,
        packets: [],
        speed: playerUtils.getWalkCapabilities()
    });

    data.save();

    if (type == "blink") {
        playerUtils.sendMessage("&7Start moving forward");
        packetLog(data.points[data.config][data.points[data.config].length - 1]);
        return;
    }

    playerUtils.sendMessage(`&7Added ${type} in ${room}`);
}

register("command", (action, arg2, ...args) => {
    if (!action) return config().getConfig().openGui();
    const nearest = getNearest();

    switch (action) {
        case "add": {
            addPoint(arg2, args);
            break;
        }
        case "config": {
            if (!arg2) {
                if (!data.config) return playerUtils.sendMessage("&7No Config Selected");
                return playerUtils.sendMessage(`&7Current Config: ${data.config}`);
            }

            switch (arg2) {
                case "list": {
                    if (data.points.length == 0) return;
                    Object.entries(data.points).forEach(([config, points]) => playerUtils.sendMessage(`&7${config} (${points.length} ${points.length == 1 ? "point" : "points"})`));
                    break;
                }
                case "load": {
                    if (!data.points[args[0]]) return;
                    data.config = args[0];
                    data.save();
                    playerUtils.sendMessage(`&7Loaded ${args[0]}`);
                    break;
                }
                case "new": {
                    if (data.points[args[0]]) return;
                    data.points[args[0]] = [];
                    data.config = args[0];
                    data.save();
                    playerUtils.sendMessage(`&7Created ${args[0]}`);
                    break;
                }
                case "delete": {
                    if (!data.points[args[0]]) return;
                    delete data.points[args[0]];
                    data.save();
                    playerUtils.sendMessage(`&7Deleted ${args[0]}`);
                    break;
                }
            }
            break;
        }
        case "remove": {
            if (!data.config) return;

            let nearestPoint;
            if (!arg2) nearestPoint = nearest;
            else nearestPoint = getNearestPoint(arg2);
            if (!nearestPoint) return;

            const { config, index, point } = nearestPoint;
            data.points[config].splice(index, 1);
            data.save();

            playerUtils.sendMessage(`&7Removed ${point.type}`);
            break;
        }
        case "radius": {
            if (!data.config || !nearest) return;

            const { config, index } = nearest;
            data.points[config][index].radius = parseFloat(arg2);
            data.save();
            break;
        }
        case "help": {
            const messages = [
                "&7/bbg config <load, new, delete, list>",
                "&7/bbg add <rotate, stop, motion, bonzo, jump, superboom, align, hclip, swap, blink, text, lavaclip, walk, record> <Args: start, stop>",
                "&7/bbg radius <radius>",
                "&7/bbg remove"
            ];

            messages.forEach(msg => playerUtils.sendMessage(msg));
            break;
        }
    }
}).setName("byebyegoldor").setAliases("bbg");

export const getNearest = () => {
    let nearestDistance = Infinity;
    let nearestPoint = null;

    if (!data.points[data.config]) return nearestPoint;

    data.points[data.config].forEach((point, index) => {
        if (point.room != dungeonUtils.getRoomName() && Server.getIP() != "localhost") return;

        let coords = point.coords;
        if (dungeonUtils.isDungeonPoint(point.room)) coords = dungeonUtils.getRealCoords(...coords);
        const distance = playerUtils.getRenderDistance(...coords);

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPoint = { config: data.config, index, point };
        }
    });
    
    return nearestPoint;
}

function getNearestPoint(type) {
    let nearestDistance = Infinity;
    let nearestPoint = null;

    if (!data.points[data.config]) return nearestPoint;

    data.points[data.config].forEach((point, index) => {
        if (point.room != dungeonUtils.getRoomName() && Server.getIP() != "localhost") return;

        let coords = point.coords;
        if (dungeonUtils.isDungeonPoint(point.room)) coords = dungeonUtils.getRealCoords(...coords);
        const distance = playerUtils.getRenderDistance(...coords);

        if (distance < nearestDistance && point.type == type) {
            nearestDistance = distance;
            nearestPoint = { config: data.config, index, point };
        }
    });
    
    return nearestPoint;
}

let blinkPoint;
let logging = false;

export const isLogging = () => {
    return logging;
}

function packetLog(point) {
    blinkPoint = point;
    logging = true;
    packetLogger.register();
    blink.register();
}

const packetLogger = register("packetSent", (packet) => {
    if (blinkPoint == null) return packetLogger.unregister();
    if (global.inFreeCam || !packet.func_149466_j()) return;

    const coords = [packet.func_149464_c(), packet.func_149467_d(), packet.func_149472_e()];
    if (coords.every(coord => coord == 0)) return;

    blinkPoint.packets.push([...coords, Player.getYaw(), Player.getPitch(), packet.func_149465_i()]);
    blinkPoint.motion = [Player.getMotionX(), Player.getMotionY(), Player.getMotionZ()];

    data.save();
}).setFilteredClass(C03PacketPlayer).unregister();

const blink = register("renderWorld", () => {
    if (blinkPoint) {
        Tessellator.drawString("walk here", ...blinkPoint.raytrace, Color.WHITE.getRGB(), true, 0.75, true);
        if (!global.inFreeCam && playerUtils.getRenderDistance(blinkPoint.raytrace[0], blinkPoint.raytrace[1] - 1, blinkPoint.raytrace[2]) <= 0.5) {
            logging = false;
            packetLogger.unregister();
            blink.unregister();
            playerUtils.sendMessage(`&7Added blink (${blinkPoint.packets.length} packets)`);
            blinkPoint = null;
        }
    }
}).unregister();

new Keybind("Finish Blink Config", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => {
    if (!blinkPoint) return;
    logging = false;
    packetLogger.unregister();
    blink.unregister();
    playerUtils.sendMessage(`&7Added blink (${blinkPoint.packets.length} packets)`);
    blinkPoint = null;
});

