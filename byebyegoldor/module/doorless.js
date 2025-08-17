import Settings from "../config";
import blockOffset from "../utils/DoorlessBlockRotations";
import serverRotations from "../utils/DoorlessServerRotations"
import scanHelper from "../utils/Doorlessroomutils"
import Dungeon from "../utils/doorlessdungeonutils"
import { clip, motion, flooredPos, strToDec, getDistance3D, C08PacketPlayerBlockPlacement, blockMetadata, COAL_BLOCK, RED_STAINED_CLAY, snapTo, stopMovement, restartMovement, C03PacketPlayer, S08PacketPlayerPosLook, getDistance2D } from "../utils/Doorlessutils";

const doorBlocks = [COAL_BLOCK, RED_STAINED_CLAY, "minecraft:barrier", "minecraft:stained_hardened_clay[color=white]"];
const NEXT_TO = 0.33;
let placedBlocks = [];

function nextToDoor(x, y, z) {
    const [negx, posx, negz, posz] = [
        blockMetadata(...flooredPos(x - NEXT_TO, y, z)),
        blockMetadata(...flooredPos(x + NEXT_TO, y, z)),
        blockMetadata(...flooredPos(x, y, z - NEXT_TO)),
        blockMetadata(...flooredPos(x, y, z + NEXT_TO))
    ]

    if (doorBlocks.includes(negx)) return 90;
    if (doorBlocks.includes(posx)) return 270;
    if (doorBlocks.includes(negz)) return 180;
    if (doorBlocks.includes(posz)) return 0;

    return -1;
}

function setBlockTo(x, y, z, block) {
    let blockAt = World.getBlockAt(x, y, z);
    let blockName = blockAt?.type?.getRegistryName()?.slice(10);
    if (!blockName.includes("air")) {
        placedBlocks.push({ x, y, z, originalType: blockName });
    }

    const pos = new BlockPos(x * 1, y * 1, z * 1);
    if (!pos) return;

    World.getWorld().func_175656_a(pos.toMCBlock(), new BlockType(block).getDefaultState());
    World.getWorld().func_175689_h(pos.toMCBlock());
}

function replaceBlocks() {
    for (let block of placedBlocks) {
        if(!World.getBlockAt(block.x, block.y, block.z).type.getDefaultState().toString().includes("minecraft:air")) continue;
        setBlockTo(block.x, block.y, block.z, block.originalType);
    }
    placedBlocks = [];
}

function removeBlocks(door) {
    const orientation = door?.orientation;
    if (!orientation) return;

    let back = null;
    let front = null;
    let left = null;
    let right = null;

    switch (orientation) {
        case "NS":
            back = blockOffset.getRelativeOffset("NORTH", "back");
            front = blockOffset.getRelativeOffset("NORTH", "front");
            left = blockOffset.getRelativeOffset("NORTH", "left");
            right = blockOffset.getRelativeOffset("NORTH", "right");
            break;
        case "EW":
            back = blockOffset.getRelativeOffset("WEST", "back");
            front = blockOffset.getRelativeOffset("WEST", "front");
            left = blockOffset.getRelativeOffset("WEST", "left");
            right = blockOffset.getRelativeOffset("WEST", "right");
            break;
    }

    if (!front) return;

    const topMid = [door.coords[0], 71, door.coords[2]];
    const topLeft = [topMid[0] + left[0], topMid[1], topMid[2] + left[2]];
    const topRight = [topMid[0] + right[0], topMid[1], topMid[2] + right[2]];

    let blocks = [];
    placedBlocks = [];

    blocks.push(...removeSymmetricLine(topMid[0], 69, topMid[2], front, back, 2));
    blocks.push(...removeSymmetricLine(topLeft[0], 69, topLeft[2], front, back, 2));
    blocks.push(...removeSymmetricLine(topRight[0], 69, topRight[2], front, back, 2));
    for (let block of blocks) {
        setBlockTo(...block, "air");
    }
}

function removeSymmetricLine(x, y, z, front, back, dist = 1, height = 3) {
    const blocks = [];

    for (let j = 1; j <= dist; j++) { 
        for (let i = 0; i < height; i++) {
            let frontBlock = [x + front[0] * j, y + i, z + front[2] * j];
            let backBlock = [x + back[0] * j, y + i, z + back[2] * j];
            let midBlock = [x, y + i, z];
            blocks.push(midBlock);
            blocks.push(frontBlock);
            blocks.push(backBlock);
        }
    }

    return blocks;
}

let doorMatch = null;
let inDoor = false;
let initialPitch = null;
let initialYaw = null;

register("packetSent", (packet, event) => {
    if (!Dungeon.inDungeon || !Settings().doorless) return;

    const moving = packet.func_149466_j();
    if (!moving) return;

    const playercoords = [packet.func_149464_c(), packet.func_149467_d(), packet.func_149472_e()];

    if (doorMatch && (getDistance2D(doorMatch.coords[0], doorMatch.coords[2], playercoords[0], playercoords[2]) > 4)) {
        replaceBlocks();
        doorMatch = null;
        inDoor = false;
    }

    for (let door of Dungeon.doors.values()) {
        if (getDistance3D(...door.coords, ...playercoords) > 4) continue;
        doorMatch = door;
        break;
    }
    if (!doorMatch) return;

    // Improved: Auto-switch to enderpearls in hotbar BEFORE item check
    const inv = Player?.getInventory()?.getItems();
    if (inv) {
        const pearlIndex = inv.findIndex(item => item && item.getName && item.getName().toLowerCase().includes("ender pearl"));
        if (pearlIndex >= 0 && pearlIndex <= 8) {
            if (Player.getHeldItemIndex() !== pearlIndex) {
                Player.setHeldItemIndex(pearlIndex);
            }
        }
    }

    // Re-fetch held item after possible swap
    const item = Player.getHeldItem();
    if (item?.getID() !== 368) return;

    if (playercoords[1] !== 69 || playercoords[0] > 0 || playercoords[2] > 0 || playercoords[0] < -200 || playercoords[2] < -200) return;

    if (inDoor) return;

    initialYaw = Player.getYaw();
    initialPitch = Player.getPitch();

    let yaw = nextToDoor(...playercoords);
    if (yaw == -1) return;

    inDoor = true;
    let pitch = 0;

    const frameType = doorMatch.frameType;
    let playerSide = null;
    let playerRoom = scanHelper.getRoomName(playercoords[0], playercoords[2]);
    for (let room of doorMatch.connectedRooms) {
        let roomArray = room.toString().split(",");
        if (roomArray[0].includes(playerRoom)) {
            playerSide = roomArray[1];
            break;
        }
    }
    if (!playerSide) return;

    cancel(event);
    serverRotations.setRotation(yaw, pitch, () => {
        Client.sendPacket(new C08PacketPlayerBlockPlacement(item.itemStack));
        let secondThrown = false;

        const S08Listener = register("packetReceived", (packet) => {
            if (!Dungeon.inDungeon) return;

            const currDoor = doorMatch;

            const [px, py, pz] = [packet.func_148932_c(), packet.func_148928_d(), packet.func_148933_e()];
            const blockCheckData = blockMetadata(Math.floor(px), py + 1, Math.floor(pz));

            stopMovement();
            if ((frameType.includes("clean") || blockCheckData.includes("minecraft:air")) && !secondThrown) {
                Client.sendPacket(new C08PacketPlayerBlockPlacement(item.itemStack));
                secondThrown = true;
                return;
            }

            Client.scheduleTask(0, () => {
                serverRotations.resetRotation()
            });

            removeBlocks(currDoor);
            const backOffset = blockOffset.getRelativeOffset(playerSide, "back");

            let clipdist = strToDec(Settings().doorlessclip) == null ? 1.2 : strToDec(Settings().doorlessclip);
            if (clipdist < 0.1 || clipdist > 1.4) {
                clipdist = 1.2;
            }

            Client.scheduleTask(0, () => {
                clip(backOffset[0], backOffset[2], clipdist);
            });

            Client.scheduleTask(1, () => {
                if (initialPitch && initialYaw) snapTo(initialYaw, initialPitch);
                clip(backOffset[0], backOffset[2], clipdist);
            });

            Client.scheduleTask(2, () => {
                clip(backOffset[0], backOffset[2], clipdist);
                initialPitch = null;
                initialYaw = null;
            })

            let motionSpeed = strToDec(Settings().doorlessmotionspeed) == null ? 2.4 : strToDec(Settings().doorlessmotionspeed);
            if (motionSpeed < 1.0 || motionSpeed > 2.80605) {
                motionSpeed = 2.4;
            }   
            Client.scheduleTask(3, () => {
                    let speed = Player.getPlayer().field_71075_bZ.func_75094_b()
                    if (Settings().doorlessmotion) motion(speed, motionSpeed);
                    restartMovement();
            })

            inDoor = false;
            doorMatch = null;

            S08Listener.unregister();
            return;
        }).setFilteredClass(S08PacketPlayerPosLook)
    })

}).setFilteredClass(C03PacketPlayer);




//.88b  d88.  .d8b.  d8888b. d88888b      d8888b. db    db      d88888b         d88888b d888888b d88888b d8888b. db    db 
//88'YbdP`88 d8' `8b 88  `8D 88'          88  `8D `8b  d8'      88'             88'       `88'   88'     88  `8D `8b  d8' 
//88  88  88 88ooo88 88   88 88ooooo      88oooY'  `8bd8'       88ooo           88ooo      88    88ooooo 88oobY'  `8bd8'  
//88  88  88 88~~~88 88   88 88~~~~~      88~~~b.    88         88~~~           88~~~      88    88~~~~~ 88`8b      88    
//88  88  88 88   88 88  .8D 88.          88   8D    88         88              88        .88.   88.     88 `88.    88    
//YP  YP  YP YP   YP Y8888D' Y88888P      Y8888P'    YP         YP    C88888D   YP      Y888888P Y88888P 88   YD    YP