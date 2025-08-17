import { Keybind } from "../../KeybindFix";
import { data, isLogging } from "./configManager";
import { C06PacketPlayerPosLook, MouseEvent, C03PacketPlayer } from "../utils/mappings";
import playerUtils from "../utils/playerUtils";
import rotationUtils from "../utils/rotationUtils";
import config from "../config";
import dungeonUtils from "../utils/dungeonUtils";
import { lavaClip } from "../module/lavaClip";
import S02Event from "../events/packets/server/S02Event";
import S2DEvent from "../events/packets/server/S2DEvent";
import S08Event from "../events/packets/server/S08Event";
import DeathTickEvent from "../events/packets/custom/DeathTickEvent";
import EveryoneLeapedEvent from "../events/packets/custom/EveryoneLeapedEvent";

let jumping= false;
let startedGoldor = false;
let openedTerm = false;
let finishedI1 = false;
let everyoneLeaped = false;
let waitingFlag = false;
let flagged = false;
let waitingTick = false;
let motionNode = null;
let lastBlink = 0;
let walking = false;
const forwardKey = Client.getKeyBindFromKey(Keyboard.KEY_W);
let continuousMotion = false;
let motionDirection = null;
let continuousMx = 0;
let continuousMz = 0;
let airTicks = 0;
// Store jump distance for motion ring
let motionJumpDist = 1;

// Stopwatch functionality
let stopwatchStartTime = null;
let stopwatchRunning = false;

// Record functionality
let blinkPoint;
let logging = false;

register("renderWorld", () => {
    if (playerUtils.inP3) startedGoldor = true;

    if (!config().autoP3 || global.inFreeCam || Client.isInChat()) {
        if (walking) {
            forwardKey.setState(false);
            walking = false;
        }
        if (continuousMotion) {
            continuousMotion = false;
            motionDirection = null;
            continuousMx = 0;
            continuousMz = 0;
        }
        return;
    }
    // Removed disableAfterGoldor restriction - rings now work everywhere
    // if (config().disableAfterGoldor && startedGoldor && !playerUtils.inP3) {
    //     if (walking) {
    //         forwardKey.setState(false);
    //         walking = false;
    //     }
    //     if (continuousMotion) {
    //         continuousMotion = false;
    //         motionDirection = null;
    //         continuousMx = 0;
    //         continuousMz = 0;
    //     }
    //     return;
    // }

    Object.entries(data.points).forEach(([cfg, points]) => {
        if (cfg != data.config) return;

        points.forEach(point => {
            let { room, coords, rotation, type, raytrace, radius, argz, packets, speed } = point;
            // Removed room restriction - rings now work everywhere regardless of world/room
            // if (room != dungeonUtils.getRoomName() && Server.getIP() != "localhost") return;

            if (dungeonUtils.isDungeonPoint(room)) {
                coords = dungeonUtils.getRealCoords(...coords);
                rotation = [dungeonUtils.getRealYaw(rotation[0]), rotation[1]];
                raytrace = dungeonUtils.getRealCoords(...raytrace);
            }

            const distance = playerUtils.getRenderDistance(...coords);





            if (distance <= radius) {
                // Always treat argz as a string for arg checks
                const argzStr = (typeof point.argz === 'string' ? point.argz : '').toLowerCase();
                const argsList = argzStr.length ? argzStr.split(/\s+/) : [];

                // Failsafe: for motion+awaitClick, never set .near or run logic until after click
                if (type === "motion" && argsList.includes("awaitclick")) {
                    if (!point.awaitingClick) {
                        point.awaitingClick = true;
                        return;
                    }
                    // Only after click, allow .near and logic
                    // Clear awaitingClick and continue to run logic on this tick
                    if (point.awaitingClick) {
                        delete point.awaitingClick;
                    }
                    // Do NOT return here; let .near and logic run immediately
                } else {
                    if (type === "motion") {
                        // No delay, activate instantly
                        if (point.near) return;
                    } else {
                        if (point.near) return;
                    }
                }

                const delay = point.type === "blink" && Date.now() - lastBlink < 150;

                // AwaitTerm, AwaitI1, AwaitLeap logic (robust to multiple args)
                if (argsList.includes("awaitterm") && (!openedTerm || delay)) return;
                if (argsList.includes("awaiti1") && !finishedI1) return;
                if (argsList.includes("awaitleap") && !everyoneLeaped) return;

                // For motion+awaitClick, only set .near after click (when .awaitingClick is not set)
                if (type === "motion" && argsList.includes("awaitclick")) {
                    if (point.awaitingClick) return;
                    // Only set .near after click
                    point.near = true;
                } else if (!argsList.includes("awaitclick") || type !== "motion") {
                    point.near = true;
                }

                if (type == "blink" && packets.length > global.balancePackets) return playerUtils.sendMessage("&7Not enough balanced packets");
                if (config().sendMessages && !["blink", "text"].includes(type)) playerUtils.sendMessage(`&7Used ${type}`);

                switch (type) {
                    case "stop": {
                        playerUtils.stopMovement();
                        playerUtils.setMotion(0, Player.getMotionY(), 0);
                        motionNode = null;
                        break;
                    }
                    case "align": {
                        if (walking) {
                            forwardKey.setState(false);
                            walking = false;
                        }
                        if (continuousMotion) {
                            continuousMotion = false;
                            motionDirection = null;
                            continuousMx = 0;
                            continuousMz = 0;
                        }
                        if (type == "stop") {
                            playerUtils.stopMovement();
                            playerUtils.setMotion(0, Player.getMotionY(), 0);
                            motionNode = null;
                        } else {
                            playerUtils.setPosition(coords[0], Player.getY(), coords[2]);
                            playerUtils.setMotion(0, Player.getMotionY(), 0);
                        }
                        break;
                    }
                    case "rotate": {
                        playerUtils.sendDebugMessage(`&7yaw:${rotation[0]}, pitch:${rotation[1]}`);
                        rotationUtils.rotate(...rotation);
                        break;
                    }
                    case "bonzo": {
                        if (Player.asPlayerMP().isOnGround()) playerUtils.setMotion(0, Player.getMotionY(), 0);
                        playerUtils.swap("Bonzo's Staff");
                        rotationUtils.serverRotate(...rotation);

                        Client.scheduleTask(1, () => {
                            rotationUtils.resetServerRotations();
                            playerUtils.rightClick();
                        });
                        break;
                    }
                    case "jump": {
                        if (Player.asPlayerMP().isOnGround()) {playerUtils.jump();
                            jumping = true;}
                        break;
                    }
                    case "hclip": {
                        // Preserve motion state before hclip
                        const wasInContinuousMotion = continuousMotion;
                        const previousMotionDir = motionDirection;
                        const currentMotionX = continuousMx;
                        const currentMotionZ = continuousMz;

                        const doHClip = () => {
                            playerUtils.hClip(rotation[0]);
                            // Restore motion with current momentum
                            if (wasInContinuousMotion && previousMotionDir) {
                                continuousMotion = true;
                                motionDirection = previousMotionDir;
                                continuousMx = currentMotionX;
                                continuousMz = currentMotionZ;
                                playerUtils.setMotion(continuousMx, Player.getMotionY(), continuousMz);
                            }
                        };

                        if (Player.asPlayerMP().isOnGround()) {
                            playerUtils.jump();
                            setTimeout(doHClip, 50);
                        } else {
                            doHClip();
                        }
                        break;
                    }
                    case "superboom": {
                        playerUtils.useItem("Infinityboom TNT", rotation, playerUtils.isSneaking, false, playerUtils.leftClick());
                        break;
                    }
                    case "swap": {
                        playerUtils.swap(argz);
                        break;
                    }
                    case "blink": {
                        if (playerUtils.isSneaking) return playerUtils.sendMessage("&7Cannot be sneaking!");
                        if (!packets.length) return playerUtils.sendMessage("&7Invalid blink point!");
                        if (speed != Player.getPlayer().field_71075_bZ.func_75094_b()) return playerUtils.sendMessage(`&7Invalid speed! (Required: ${Math.floor(speed * 1000)})`);
                        if (packets.length > 40) return playerUtils.sendMessage("&7Too many packets! (Limit: 40)");
                        if (waitingTick) return point.near = false;
                        if (flagged) {
                            playerUtils.sendMessage("Teleported back! waiting for next death tick / left click");
                            waitingTick = true;
                            flagged = false;
                            point.near = false;
                            return;
                        }

                        Client.scheduleTask(0, () => {
                            const finalPacket = packets[packets.length - 1];

                            packets.forEach(packet => {
                                Client.sendPacket(new C06PacketPlayerPosLook(...packet));
                                global.balancePackets -= 1;
                                if (packet == finalPacket) {
                                    const prevPitch = Player.getPitch();
                                    rotationUtils.rotate(Player.getYaw(), 90);
                                    setTimeout(() => rotationUtils.rotate(Player.getYaw(), prevPitch), 5);
                                }
                            });

                            playerUtils.setPosition(finalPacket[0], finalPacket[1], finalPacket[2]);
                            playerUtils.setMotion(0, point.motion[1], 0);
                            playerUtils.sendMessage(`&7Used blink (${packets.length} packets)`);

                            lastBlink = Date.now();

                            waitingFlag = true;
                        })

                        Client.scheduleTask(1, () => waitingFlag = false);
                        break;
                    }
                    case "lavaclip": {
                        // /bbg add lavaclip [distance-] [width]
                        let distance = 2;
                        let width = 1;
                        if (point.argz) {
                            const parts = point.argz.split(" ");
                            for (const part of parts) {
                                if (/^-?\d+(\.\d+)?$/.test(part)) {
                                    if (part.endsWith("-")) distance = parseFloat(part);
                                    else width = parseFloat(part);
                                }
                            }
                        }
                        lavaClip(true, distance, width);
                        break;
                    }
                    case "walk": {
                        // Walk ring: rotate to saved direction and start walking with motion
                        rotationUtils.rotate(...rotation);
                        forwardKey.setState(true);
                        walking = true;
                        const yaw = rotation[0];
                        const radians = (yaw * Math.PI) / 180;
                        // Fixed direction calculation for Minecraft coordinate system
                        const dirX = -Math.sin(radians);
                        const dirZ = Math.cos(radians);
                        const speed = Player.isSneaking() ? Player.getPlayer().field_71075_bZ.func_75094_b() * 0.3 : Player.getPlayer().field_71075_bZ.func_75094_b();

                        // Set motion directly to move in the correct direction
                        const motionX = dirX * speed * 2.806;
                        const motionZ = dirZ * speed * 2.806;
                        playerUtils.setMotion(motionX, Player.getMotionY(), motionZ);

                        continuousMotion = true;
                        motionDirection = { x: dirX, z: dirZ };
                        continuousMx = motionX;
                        continuousMz = motionZ;

                        if (config().sendMessages) playerUtils.sendMessage(`&7Started walking in direction ${yaw.toFixed(2)}`);
                        break;
                    }
                    // case "motion": {
                    //     // Always parse argsList from argz for consistency
                    //     const argzStr = (typeof point.argz === 'string' ? point.argz : '').toLowerCase();
                    //     const argsList = argzStr.length ? argzStr.split(/\s+/) : [];
                    //     // Failsafe: if awaitClick is present and awaitingClick is set, do nothing
                    //     if (argsList.includes("awaitclick") && point.awaitingClick) break;
                    //     // If awaitTerm is present, only run motion if openedTerm is true
                    //     if (argsList.includes("awaitterm") && !openedTerm) return;
                    //     const yaw = point.rotation[0];
                    //     const radians = (yaw * Math.PI) / 180;
                    //     const dirX = -Math.sin(radians);
                    //     const dirZ = Math.cos(radians);
                    //     const speed = Player.isSneaking() ? Player.getPlayer().field_71075_bZ.func_75094_b() * 0.3 : Player.getPlayer().field_71075_bZ.func_75094_b();
                    //     let didMotion = false;
                    //     // If no args, do hclip+motion as before
                    //     if (!argsList.length) {
                    //         const hclipDistance = speed * 2.806 * 3.2;
                    //         const dx = dirX * hclipDistance;
                    //         const dz = dirZ * hclipDistance;
                    //         if (Player.asPlayerMP().isOnGround()) {
                    //             playerUtils.jump();
                    //             Client.scheduleTask(1, () => {
                    //                 playerUtils.setPosition(Player.getX() + dx, Player.getY() + dz);
                    //                 continuousMotion = true;
                    //                 motionDirection = { x: dirX, z: dirZ };
                    //                 continuousMx = dirX * speed * 2.806;
                    //                 continuousMz = dirZ * speed * 2.806;
                    //             });
                    //         } else {
                    //             playerUtils.setPosition(Player.getX() + dx, Player.getY() + dz);
                    //             continuousMotion = true;
                    //             motionDirection = { x: dirX, z: dirZ };
                    //             continuousMx = dirX * speed * 2.806;
                    //             continuousMz = dirZ * speed * 2.806;
                    //         }
                    //         didMotion = true;
                    //     }
                    //     // Support multiple args: walk, align, jump, hclip, fclip, etc.
                    //     if (argsList.includes("walk")) {
                    //         continuousMotion = true;
                    //         motionDirection = { x: dirX, z: dirZ };
                    //         continuousMx = dirX * speed * 2.806;
                    //         continuousMz = dirZ * speed * 2.806;
                    //         didMotion = true;
                    //     }
                    //     if (argsList.includes("align")) {
                    //         playerUtils.setPosition(point.coords[0], Player.getY(), point.coords[2]);
                    //     }
                    //     if (argsList.includes("jump")) {
                    //         if (Player.asPlayerMP().isOnGround()) playerUtils.jump();
                    //     }
                    //     if (argsList.includes("hclip")) {
                    //         // Fully copy hclip ring logic, but for motion hclip
                    //         // 1. Rotate to the direction the ring was made
                    //         rotationUtils.rotate(...rotation);
                    //         // 2. Hold W (forwardKey) until stop/align ring
                    //         //forwardKey.setState(true); // Always set, even if already true
                    //         //walking = true;
                    //         // 3. Do hclip logic
                    //         const wasInContinuousMotion = continuousMotion;
                    //         const previousMotionDir = motionDirection;
                    //         const currentMotionX = continuousMx;
                    //         const currentMotionZ = continuousMz;
                    //         const doHClip = () => {
                    //             if(argsList.includes("noboost")) {playerUtils.hClip(yaw, false)}
                    //             else playerUtils.hClip(yaw)
                    //             // Restore motion with current momentum
                    //             if (wasInContinuousMotion && previousMotionDir) {
                    //                 continuousMotion = true;
                    //                 motionDirection = previousMotionDir;
                    //                 continuousMx = currentMotionX;
                    //                 continuousMz = currentMotionZ;
                    //                 playerUtils.setMotion(continuousMx, Player.getMotionY(), continuousMz);
                    //             }
                    //             // Ensure W is held after hclip, even if in air
                    //             //forwardKey.setState(true);
                    //             //walking = true;
                    //         };
                    //         if (Player.asPlayerMP().isOnGround()) {
                    //             playerUtils.jump();
                    //             setTimeout(doHClip, 50);
                    //         } else {
                    //             doHClip();
                    //         }
                    //         didMotion = true;
                    //     }
                    //     if (argsList.includes("stop")) {
                    //         continuousMotion = false;
                    //         motionDirection = null;
                    //         continuousMx = 0;
                    //         continuousMz = 0;
                    //     }
                    //     if (argsList.includes("rotate")) {
                    //         // Do not rotate for motion ring (per user request)
                    //         rotationUtils.rotate(point.rotation[0], point.rotation[1]);
                    //     }
                    //     //if (config().sendMessages && didMotion) playerUtils.sendMessage(`&7Motion ring: ${argsList.join(", ") || "hclip+motion"} in direction ${yaw.toFixed(2)}`);
                    //     break;
                    // }
                    case "motion": {
                        const argsList = point.argz ? point.argz.split(" ") : [];
                        playerUtils.stopMovement();
                        walking = false;
                        // Support multiple args: walk, align, jump, hclip, fclip, etc.
                        if (argsList.includes("align")) {
                            playerUtils.setPosition(coords[0], Player.getY(), coords[2]);
                            playerUtils.sendDebugMessage("align");
                        }
                        let jumpDist = 1;
                        let hasJump = argsList.includes("jump");
                        let hasWalk = argsList.includes("walk");
                        // Find dist= argument
                        for (const arg of argsList) {
                            if (arg.startsWith("dist=")) {
                                let val = parseFloat(arg.slice(5));
                                if (!isNaN(val)) {
                                    jumpDist = Math.max(0.01, Math.min(val, 1));
                                }
                            }
                        }
                        // Store jumpDist for tick handler
                        motionJumpDist = jumpDist;
                        if (hasWalk && !hasJump) {
                            playerUtils.sendDebugMessage("walk");
                        }
                        // If jump is present, always override motion with jumpDist
                        if (hasJump) {
                            playerUtils.sendDebugMessage(`jump (dist=${jumpDist})`);
                            if (Player.asPlayerMP().isOnGround()) {
                                playerUtils.jump();
                                jumping = true;
                            }
                            const yaw = rotation[0];
                            const radians = (yaw * Math.PI) / 180;
                            const speed = Player.getPlayer().field_71075_bZ.func_75094_b();
                            const speedMult = 2.806 * jumpDist;
                            const motionx = -Math.sin(radians) * speed * speedMult;
                            const motionz = Math.cos(radians) * speed * speedMult;
                            playerUtils.setMotion(motionx, Player.getMotionY(), motionz);
                            // Set continuous motion to match jump distance
                            continuousMotion = true;
                            motionDirection = yaw;
                            continuousMx = motionx;
                            continuousMz = motionz;
                        } else if (hasWalk) {
                            // Only apply walk motion if jump is not present
                            const yaw = rotation[0];
                            const radians = (yaw * Math.PI) / 180;
                            const speed = Player.isSneaking() ? Player.getPlayer().field_71075_bZ.func_75094_b() * 0.3 : Player.getPlayer().field_71075_bZ.func_75094_b();
                            const motionx = -Math.sin(radians) * speed * 2.806;
                            const motionz = Math.cos(radians) * speed * 2.806;
                            playerUtils.setMotion(motionx, Player.getMotionY(), motionz);
                            continuousMotion = true;
                            motionDirection = yaw;
                            continuousMx = motionx;
                            continuousMz = motionz;
                        }
                        doMotion(point.rotation[0]);
                        if (argsList.includes("rotate")) {
                            rotationUtils.rotate(rotation[0], rotation[1]);
                            playerUtils.sendDebugMessage("rotate");
                        }
                        break;
                    }
                    case "cmd": {
                        // /bbg add cmd "cmd"
                        if (point.argz) {
                            ChatLib.command(point.argz, true);
                            if (config().sendMessages) playerUtils.sendMessage(`&7Ran command: /${point.argz}`);
                        }
                        break;
                    }
                    case "keybind": {
                        // /bbg add keybind "key" [radius] - supports any keyboard key in quotes
                        if (point.argz) {
                            // Extract the key from quotes if present
                            let key = point.argz.trim();

                            // Check if the key is wrapped in quotes
                            const quotedMatch = key.match(/^"([^"]+)"/);
                            if (quotedMatch) {
                                key = quotedMatch[1].toLowerCase().trim();
                            } else {
                                // If no quotes, take the first word as the key
                                key = key.split(' ')[0].toLowerCase().trim();
                            }

                            let keyBind = null;

                            // Special handling for "tab" to use the actual Tab keybind from settings
                            if (key === "tab") {
                                keyBind = Client.getKeyBindFromKey(Keyboard.KEY_TAB);
                                let tabKeybindObj = null;
                                try {
                                    tabKeybindObj = new Keybind("TabPress", Keyboard.KEY_TAB, "byebyegoldor");
                                } catch (e) {}
                                if (keyBind) {
                                    keyBind.setState(true);
                                    Client.scheduleTask(2, () => keyBind.setState(false));
                                }
                                if (tabKeybindObj) {
                                    tabKeybindObj.setState(true);
                                    Client.scheduleTask(2, () => tabKeybindObj.setState(false));
                                }
                                // Force a Tab key press event using Java reflection for maximum reliability
                                try {
                                    const KeyEvent = Java.type("java.awt.event.KeyEvent");
                                    const Toolkit = Java.type("java.awt.Toolkit");
                                    const robot = new (Java.type("java.awt.Robot"))();
                                    robot.keyPress(KeyEvent.VK_TAB);
                                    robot.keyRelease(KeyEvent.VK_TAB);
                                } catch (e) {}
                                if (config().sendMessages) playerUtils.sendMessage(`&7Pressed keybind: tab`);
                                break;
                            } else {
                                // Map common key names to their Keyboard constants
                                const keyMap = {
                                    // ...existing code...
                                    "w": Keyboard.KEY_W,
                                    "a": Keyboard.KEY_A,
                                    "s": Keyboard.KEY_S,
                                    "d": Keyboard.KEY_D,
                                    "space": Keyboard.KEY_SPACE,
                                    "shift": Keyboard.KEY_LSHIFT,
                                    "lshift": Keyboard.KEY_LSHIFT,
                                    "rshift": Keyboard.KEY_RSHIFT,
                                    "ctrl": Keyboard.KEY_LCONTROL,
                                    "lctrl": Keyboard.KEY_LCONTROL,
                                    "rctrl": Keyboard.KEY_RCONTROL,
                                    "alt": Keyboard.KEY_LMENU,
                                    "lalt": Keyboard.KEY_LMENU,
                                    "ralt": Keyboard.KEY_RMENU,
                                    "f1": Keyboard.KEY_F1, "f2": Keyboard.KEY_F2, "f3": Keyboard.KEY_F3,
                                    "f4": Keyboard.KEY_F4, "f5": Keyboard.KEY_F5, "f6": Keyboard.KEY_F6,
                                    "f7": Keyboard.KEY_F7, "f8": Keyboard.KEY_F8, "f9": Keyboard.KEY_F9,
                                    "f10": Keyboard.KEY_F10, "f11": Keyboard.KEY_F11, "f12": Keyboard.KEY_F12,
                                    "0": Keyboard.KEY_0, "1": Keyboard.KEY_1, "2": Keyboard.KEY_2,
                                    "3": Keyboard.KEY_3, "4": Keyboard.KEY_4, "5": Keyboard.KEY_5,
                                    "6": Keyboard.KEY_6, "7": Keyboard.KEY_7, "8": Keyboard.KEY_8,
                                    "9": Keyboard.KEY_9,
                                    "b": Keyboard.KEY_B, "c": Keyboard.KEY_C, "e": Keyboard.KEY_E,
                                    "f": Keyboard.KEY_F, "g": Keyboard.KEY_G, "h": Keyboard.KEY_H,
                                    "i": Keyboard.KEY_I, "j": Keyboard.KEY_J, "k": Keyboard.KEY_K,
                                    "l": Keyboard.KEY_L, "m": Keyboard.KEY_M, "n": Keyboard.KEY_N,
                                    "o": Keyboard.KEY_O, "p": Keyboard.KEY_P, "q": Keyboard.KEY_Q,
                                    "r": Keyboard.KEY_R, "t": Keyboard.KEY_T, "u": Keyboard.KEY_U,
                                    "v": Keyboard.KEY_V, "x": Keyboard.KEY_X, "y": Keyboard.KEY_Y,
                                    "z": Keyboard.KEY_Z,
                                    "enter": Keyboard.KEY_RETURN,
                                    "return": Keyboard.KEY_RETURN,
                                    "escape": Keyboard.KEY_ESCAPE,
                                    "esc": Keyboard.KEY_ESCAPE,
                                    "backspace": Keyboard.KEY_BACK,
                                    "delete": Keyboard.KEY_DELETE,
                                    "insert": Keyboard.KEY_INSERT,
                                    "home": Keyboard.KEY_HOME,
                                    "end": Keyboard.KEY_END,
                                    "pageup": Keyboard.KEY_PRIOR,
                                    "pagedown": Keyboard.KEY_NEXT,
                                    "up": Keyboard.KEY_UP,
                                    "down": Keyboard.KEY_DOWN,
                                    "left": Keyboard.KEY_LEFT,
                                    "right": Keyboard.KEY_RIGHT,
                                    "comma": Keyboard.KEY_COMMA,
                                    "period": Keyboard.KEY_PERIOD,
                                    "slash": Keyboard.KEY_SLASH,
                                    "semicolon": Keyboard.KEY_SEMICOLON,
                                    "apostrophe": Keyboard.KEY_APOSTROPHE,
                                    "lbracket": Keyboard.KEY_LBRACKET,
                                    "rbracket": Keyboard.KEY_RBRACKET,
                                    "backslash": Keyboard.KEY_BACKSLASH,
                                    "minus": Keyboard.KEY_MINUS,
                                    "equals": Keyboard.KEY_EQUALS,
                                    "grave": Keyboard.KEY_GRAVE,
                                    "numpad0": Keyboard.KEY_NUMPAD0, "numpad1": Keyboard.KEY_NUMPAD1,
                                    "numpad2": Keyboard.KEY_NUMPAD2, "numpad3": Keyboard.KEY_NUMPAD3,
                                    "numpad4": Keyboard.KEY_NUMPAD4, "numpad5": Keyboard.KEY_NUMPAD5,
                                    "numpad6": Keyboard.KEY_NUMPAD6, "numpad7": Keyboard.KEY_NUMPAD7,
                                    "numpad8": Keyboard.KEY_NUMPAD8, "numpad9": Keyboard.KEY_NUMPAD9,
                                    "numpadadd": Keyboard.KEY_ADD, "numpadsubtract": Keyboard.KEY_SUBTRACT,
                                    "numpadmultiply": Keyboard.KEY_MULTIPLY, "numpaddivide": Keyboard.KEY_DIVIDE,
                                    "numpaddecimal": Keyboard.KEY_DECIMAL, "numpadenter": Keyboard.KEY_NUMPADENTER
                                };
                                if (keyMap[key]) {
                                    keyBind = Client.getKeyBindFromKey(keyMap[key]);
                                }
                            }

                            // If we found a valid keybind, activate it
                            if (keyBind) {
                                keyBind.setState(true);
                                if (config().sendMessages) playerUtils.sendMessage(`&7Activated keybind: ${key}`);
                            } else {
                                if (config().sendMessages) playerUtils.sendMessage(`&cUnknown key: ${key}`);
                            }
                        }
                        break;
                    }
                    case "say": {
                        // /bbg add say "text to say in chat"
                        if (point.argz) {
                            ChatLib.say(point.argz);
                            if (config().sendMessages) playerUtils.sendMessage(`&7Said in chat: ${point.argz}`);
                        }
                        break;
                    }
                    case "hclip": {
                        // Get motion state either from edge detection or current state
                        const motionState = point.motionState || {
                            continuous: continuousMotion,
                            direction: motionDirection,
                            mx: continuousMx,
                            mz: continuousMz
                        };

                        const doHClip = () => {
                            playerUtils.hClip(rotation[0]);

                            // Restore exact motion state after hclip
                            if (motionState.continuous && motionState.direction) {
                                continuousMotion = true;
                                motionDirection = motionState.direction;
                                continuousMx = motionState.mx;
                                continuousMz = motionState.mz;
                                playerUtils.setMotion(motionState.mx, Player.getMotionY(), motionState.mz);
                            }
                        };

                        if (Player.asPlayerMP().isOnGround()) {
                            playerUtils.jump();
                            setTimeout(doHClip, 50);
                        } else {
                            doHClip();
                        }

                        // Clear stored state
                        if (point.motionState) point.motionState = null;
                        break;
                    }
                    case "bhop": {
                        // Bhop ring: normal hop functionality with automatic rotation and movement
                        const player = Player.getPlayer();
                        const onGround = Player.asPlayerMP().isOnGround();

                        // Rotate player to the direction the ring was created in
                        if (point.rotation) {
                            rotationUtils.rotate(...point.rotation);
                        }

                        // Start holding W key automatically
                        forwardKey.setState(true);
                        walking = true;

                        if (onGround) {
                            // Parse speed argument if provided, default to 2.4
                            let speed = 2.8; // Default speed
                            if (point.argz) {
                                const speedMatch = point.argz.match(/speed=([0-9.]+)/);
                                if (speedMatch) {
                                    speed = parseFloat(speedMatch[1]);
                                }
                            }

                            // Get the ring's rotation direction (yaw from when ring was created)
                            const yaw = point.rotation ? point.rotation[0] : Player.getYaw();
                            const radians = yaw * Math.PI / 180;
                            const dirX = -Math.sin(radians);
                            const dirZ = Math.cos(radians);

                            // Environment awareness for safety
                            const px = Math.floor(player.field_70165_t);
                            const py = Math.floor(player.field_70163_u);
                            const pz = Math.floor(player.field_70161_v);
                            const blockBelow = World.getBlockAt(px, py - 1, pz).type.getID() !== 0;
                            const blockAbove = World.getBlockAt(px, py + 2, pz).type.getID() !== 0;

                            // Predict landing position for safety checks
                            const predictedX = player.field_70165_t + dirX * speed;
                            const predictedZ = player.field_70161_v + dirZ * speed;
                            const predictedBlockBelow = World.getBlockAt(Math.floor(predictedX), py - 1, Math.floor(predictedZ)).type.getID() !== 0;
                            const predictedBlockAbove = World.getBlockAt(Math.floor(predictedX), py + 2, Math.floor(predictedZ)).type.getID() !== 0;

                            // Reduce speed for safety if needed
                            if (blockAbove || predictedBlockAbove || !blockBelow || !predictedBlockBelow) {
                                speed = Math.min(speed, 2.0); // Cap at 2.0 for risky environments
                            }

                            // Apply bhop movement automatically
                            const hopHeight = 0.42;
                            player.field_70181_x = hopHeight;
                            player.field_70159_w = dirX * speed;
                            player.field_70179_y = dirZ * speed;

                            // Set up continuous motion in the ring's direction
                            continuousMotion = true;
                            motionDirection = { x: dirX, z: dirZ };
                            const playerSpeed = Player.getPlayer().field_71075_bZ.func_75094_b();
                            continuousMx = dirX * playerSpeed * 2.806;
                            continuousMz = dirZ * playerSpeed * 2.806;

                            if (config().sendMessages) {
                                const speedArg = point.argz && point.argz.includes("speed=") ? ` (custom speed: ${speed})` : ` (default speed: ${speed})`;
                                playerUtils.sendMessage(`&7Bhop triggered!${speedArg}, holding W until stop ring`);
                            }
                        }
                        break;
                    }
                    case "stopwatch": {
                        // Stopwatch ring: start/stop timing with precise millisecond accuracy
                        const action = point.argz ? point.argz.toLowerCase().trim() : "start";

                        if (action === "start") {
                            stopwatchStartTime = Date.now();
                            stopwatchRunning = true;
                            ChatLib.chat(`&a&l[STOPWATCH] &f&lSTARTED`);
                            if (config().sendMessages) playerUtils.sendMessage(`&aStopwatch started`);
                        } else if (action === "stop") {
                            if (!stopwatchRunning || stopwatchStartTime === null) {
                                ChatLib.chat(`&c&l[STOPWATCH] &7No active stopwatch to stop!`);
                                return;
                            }

                            const endTime = Date.now();
                            const elapsedMs = endTime - stopwatchStartTime;
                            const elapsedSeconds = (elapsedMs / 1000).toFixed(3);

                            // Format time nicely
                            const minutes = Math.floor(elapsedMs / 60000);
                            const seconds = Math.floor((elapsedMs % 60000) / 1000);
                            const milliseconds = elapsedMs % 1000;

                            let timeDisplay;
                            if (minutes > 0) {
                                timeDisplay = `${minutes}m ${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
                            } else {
                                timeDisplay = `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
                            }

                            ChatLib.chat(`&c&l[STOPWATCH] &f&lSTOPPED`);
                            ChatLib.chat(`&e&l[TIME] &f&l${timeDisplay} &7(${elapsedSeconds}s)`);

                            stopwatchRunning = false;
                            stopwatchStartTime = null;

                            if (config().sendMessages) playerUtils.sendMessage(`&cStopwatch stopped: ${timeDisplay}`);
                        }
                        break;
                    }
                    case "record": {
                        // Record ring: start/stop blink recording
                        const args = point.argz ? point.argz.toLowerCase().trim().split(' ') : ["start"];
                        const action = args[0];
                        
                        // Parse radius from arguments (e.g., "start 0.3" or "stop 0.3")
                        let customRadius = 0.5; // Default radius
                        for (let i = 1; i < args.length; i++) {
                            const arg = args[i];
                            if (/^-?\d*\.?\d+$/.test(arg)) {
                                customRadius = parseFloat(arg);
                                break;
                            }
                        }

                        if (action === "start") {
                            // Create a new blink ring at current position and start recording
                            const renderManager = Client.getMinecraft().func_175598_ae();
                            let room = dungeonUtils.getRoomName();
                            let rotation = [dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomYaw(Player.getYaw()) : Player.getYaw(), Player.getPitch()];
                            let playerCoords = [renderManager.field_78730_l, renderManager.field_78731_m - 1, renderManager.field_78728_n];
                            let coords = dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomCoords(...playerCoords) : playerCoords;
                            let raytrace = dungeonUtils.inDungeon() && !dungeonUtils.inBoss() ? dungeonUtils.getRoomCoords(...rotationUtils.rayTrace()) : rotationUtils.rayTrace();

                            // Create the blink point with custom radius
                            const newBlinkPoint = {
                                room,
                                coords,
                                rotation,
                                type: "blink",
                                argz: null,
                                raytrace,
                                radius: customRadius,
                                near: true,
                                packets: [],
                                speed: playerUtils.getWalkCapabilities(),
                                motion: [0, 0, 0]
                            };

                            // Add to data points
                            if (!data.points[data.config]) data.points[data.config] = [];
                            data.points[data.config].push(newBlinkPoint);
                            data.save();

                            // Start packet logging for the new blink point
                            blinkPoint = newBlinkPoint;
                            logging = true;
                            packetLogger.register();
                            recordBlink.register();

                            playerUtils.sendMessage(`&aRecord started - blink ring created with radius ${customRadius}, start moving to record path`);
                        } else if (action === "stop") {
                            if (!logging || !blinkPoint) {
                                playerUtils.sendMessage(`&cNo active recording to stop!`);
                                return;
                            }

                            // Stop the recording
                            logging = false;
                            packetLogger.unregister();
                            recordBlink.unregister();

                            playerUtils.sendMessage(`&cRecord stopped - blink ring saved with ${blinkPoint.packets.length} packets`);
                            blinkPoint = null;
                        }
                        break;
                    }
                }
            } else if (!isLogging()) point.near = false;
        });
    });
});

// const drag = 0.91;        
// const accelTerm = 0.04;
// register("tick", () => {
//     airTicks = Player.asPlayerMP().isOnGround() ? 0 : airTicks + 1;

//     if (continuousMotion && motionDirection) {
//         // Only pressing S or T cancels motion
//         const sKey = Client.getKeyBindFromKey(Keyboard.KEY_S);
//         const tKey = Client.getKeyBindFromKey(Keyboard.KEY_T);
//         if ((sKey && sKey.isKeyDown()) || (tKey && tKey.isKeyDown())) {
//             continuousMotion = false;
//             motionDirection = null;
//             continuousMx = 0;
//             continuousMz = 0;
//         } else {
//             const speed = Player.isSneaking() ? Player.getPlayer().field_71075_bZ.func_75094_b() * 0.3 : Player.getPlayer().field_71075_bZ.func_75094_b();
//             const [x, z] = [motionDirection.x * speed * 2.806, motionDirection.z * speed * 2.806];

//             if (Player.asPlayerMP().isOnGround() || airTicks < 2) {
//                 continuousMx = x;
//                 continuousMz = z;
//             } else {
//                 const accel = accelTerm * speed;
//                 continuousMx = continuousMx * drag + accel * motionDirection.x;
//                 continuousMz = continuousMz * drag + accel * motionDirection.z;
//                 //continuousMx *= .85;  // Further increased deceleration for more pronounced speed loss
//                 //continuousMz *= .85;
//             }
//             playerUtils.setMotion(continuousMx, Player.getMotionY(), continuousMz);

//             // Debug messages (optional, can be removed)
//             if (config().debug) {
//                 playerUtils.sendDebugMessage(`Air Ticks: ${airTicks}, Motion X: ${continuousMx.toFixed(4)}, Motion Z: ${continuousMz.toFixed(4)}`);
//             }
//         }
//     }

//     if (!motionNode || Client.isInChat() || Player.getPlayer().func_180799_ab() || playerUtils.getDistance(...motionNode.raytrace) <= 1.05) {
//         motionNode = null;
//         return;
//     }

//     const speed = Player.isSneaking() ? Player.getPlayer().field_71075_bZ.func_75094_b() * 0.3 : Player.getPlayer().field_71075_bZ.func_75094_b();
//     const radians = (rotationUtils.getYaw(...motionNode.raytrace) * Math.PI) / 180;
//     const [x, z] = [-Math.sin(radians) * speed * 2.806, Math.cos(radians) * speed * 2.806];
                
//     if (Player.asPlayerMP().isOnGround() || airTicks < 2) {
//         continuousMx = x;
//         continuousMz = z;
//     } else {
//         //continuousMx *= 0.9;
//         //continuousMz *= 0.9;
//         const accel = accelTerm * speed;
//         continuousMx = continuousMx * drag + accel * motionDirection.x;
//         continuousMz = continuousMz * drag + accel * motionDirection.z;
//     }
//     playerUtils.setMotion(continuousMx, Player.getMotionY(), continuousMz);
// });

const sprintMult = 1.3

register("tick", () => {
    if(Player == null || motionDirection == null || continuousMotion == false) return;
    if(Player.asPlayerMP().isOnGround()) airTicks = 0; else airTicks++;
    if(isPlayerInLiquid()) return;
    if (forwardKey.isKeyDown()) {
        continuousMotion = false;
        motionDirection = null;
        continuousMx = 0;
        continuousMz = 0;
    }
    let speed = Player.getPlayer().field_71075_bZ.func_75094_b();
    if (Player.asPlayerMP().isSprinting()) speed /= sprintMult;
    // Use jumpDist for jump rings, otherwise default
    let speedMult = continuousMotion && motionJumpDist ? 2.806 * motionJumpDist : 2.806;
    if (airTicks < 1) {
        const rad = (motionDirection * Math.PI) / 180;
        if (jumping) {
            jumping = false;
            speedMult += 2;
            speedMult *= 1.25;
        }
        const motionx = -Math.sin(rad) * speed * speedMult;
        const motionz = Math.cos(rad) * speed * speedMult;
        playerUtils.setMotion(motionx, Player.getMotionY(), motionz);
        return;
    }

    let movementval = (Player.asPlayerMP().isOnGround() || (airTicks == 1 && Player.getMotionY() < 0)) ? speed * sprintMult * (continuousMotion && motionJumpDist ? motionJumpDist : 1) : 0.02 * sprintMult;
    const rad = (motionDirection * Math.PI) / 180;
    const motionx = -Math.sin(rad) * movementval;
    const motionz = Math.cos(rad) * movementval;
    playerUtils.setMotion(Player.getMotionX() + motionx, Player.getMotionY(), Player.getMotionZ() + motionz);
})

function doMotion(yaw) {
    continuousMotion = true
    motionDirection = yaw;
}

function isPlayerInLiquid() {
    const [x, y, z] = [Player.getX(), Player.getY(), Player.getZ()];
    const blockPos = new BlockPos(x, y, z);
    const block = World.getBlockAt(blockPos);

    const blockType = block.type.getID();

    return blockType == 9 || blockType == 10 ||
           blockType == 8 || blockType == 11;
}

register(MouseEvent, (event) => {
    if (event.button == 0 && event.buttonstate) {
        Object.entries(data.points).forEach(([config, points]) => {
            points.forEach(point => {
                point.near = false;
                // If this point is awaiting click, clear the flag so it can activate on next renderWorld
                if (point.awaitingClick) {
                    delete point.awaitingClick;
                }
            });
        });
        waitingFlag = false;
        flagged = false;
        waitingTick = false;

        finishedI1 = true;
        openedTerm = true;

        Client.scheduleTask(0, () => {
            finishedI1 = false;
            openedTerm = false;
        });
    }
});

register("worldLoad", () => {
    startedGoldor = false;
    if (walking) {
        forwardKey.setState(false);
        walking = false;
    }
    if (continuousMotion) {
        continuousMotion = false;
        motionDirection = null;
        continuousMx = 0;
        continuousMz = 0;
    }
});

S02Event.addListener((packet, event, mcEvent) => {
    if (event.unformatted === "[Phoenix] Ending i1!") {
        finishedI1 = true;
        Client.scheduleTask(0, () => finishedI1 = false);
    }
});

S2DEvent.addListener((packet, event, mcEvent) => {
    if (event.isTerminal) {
        openedTerm = true;
        Client.scheduleTask(0, () => openedTerm = false);
    }
});

S08Event.addListener((packet, event, mcEvent) => {
    if (waitingFlag) {
        waitingFlag = false;
        flagged = true;
        Client.scheduleTask(5, () => flagged = false);
    }
});

DeathTickEvent.addListener(() => Client.scheduleTask(1, () => waitingTick = false));

new Keybind("Toggle", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => {
    config().autoP3 = !config().autoP3;
    if (!config().autoP3 && walking) {
        forwardKey.setState(false);
        walking = false;
    }
    if (!config().autoP3 && continuousMotion) {
        continuousMotion = false;
        motionDirection = null;
        continuousMx = 0;
        continuousMz = 0;
    }
    playerUtils.sendMessage(config().autoP3 ? "&aEnabled" : "&cDisabled");
});

// Packet logger for record functionality
const packetLogger = register("packetSent", (packet) => {
    if (blinkPoint == null) return packetLogger.unregister();
    if (global.inFreeCam || !packet.func_149466_j()) return;

    const coords = [packet.func_149464_c(), packet.func_149467_d(), packet.func_149472_e()];
    if (coords.every(coord => coord == 0)) return;

    blinkPoint.packets.push([...coords, Player.getYaw(), Player.getPitch(), packet.func_149465_i()]);
    blinkPoint.motion = [Player.getMotionX(), Player.getMotionY(), Player.getMotionZ()];

    data.save();
}).setFilteredClass(C03PacketPlayer).unregister();

// Render for record functionality
const recordBlink = register("renderWorld", () => {
    if (blinkPoint) {
        Tessellator.drawString("recording path...", ...blinkPoint.raytrace, 0xFFFFFF, true, 0.75, true);
    }
}).unregister();

// Keybind to finish record manually
new Keybind("Finish Record", Keyboard.KEY_NONE, "byebyegoldor").registerKeyPress(() => {
    if (!blinkPoint || !logging) return;
    logging = false;
    packetLogger.unregister();
    recordBlink.unregister();
    playerUtils.sendMessage(`&cRecord stopped manually - blink ring saved with ${blinkPoint.packets.length} packets`);
    blinkPoint = null;
});
