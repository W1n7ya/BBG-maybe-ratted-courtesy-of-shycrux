import { S32PacketConfirmTransaction, rushSkullOwners, roomEnterEvent, Base64, skull, returnOutRoomNames, blockMetadata, COAL_BLOCK, RED_STAINED_CLAY } from "./Doorlessutils"
import scanHelper from "./Doorlessroomutils";
import blockOffset from "./DoorlessBlockRotations"

const doorBlocks = [COAL_BLOCK, RED_STAINED_CLAY, "minecraft:barrier"];

export default new class Dungeon {
    constructor() {
        this.inDungeon = false;
        this.dataLoaded = false;
        this.currentRoom = null;
        this.rushRooms = new Set();
        this.visitedRooms = new Set();
        this.doorSkulls = new Set();
        this.doors = new Map();

        this.onLoad = register("worldUnload", () => {
            this._resetAttributes();
            this.firstChat.register();
            this.firstTick.register();
        })

        this.firstTick = register("packetReceived", () => {
            this._resetAttributes();

            if (this.dataLoaded) {
                this.firstTick.unregister();
                return;
            }

            this._updateScoreBoardInfo();

            if (!this.inDungeon) {
                this.firstTick.unregister();
                return;
            }

            this._addCurrentlyLoadedRushRooms();
            this._findDoors();
            this.dataLoaded = true;
            this.firstTick.unregister();
            return;

        }).setFilteredClass(S32PacketConfirmTransaction);

        this.firstChat = register("chat", () => {
            this._resetAttributes();
            this._updateScoreBoardInfo();
            if (!this.inDungeon) {
                this.firstChat.unregister();
                return;
            }

            this._addCurrentlyLoadedRushRooms();
            this._findDoors();
            this.dataLoaded = true;
            this.firstChat.unregister();
            return;

        }).setCriteria("Starting in 4 seconds.")

        this.roomChange = register(roomEnterEvent, () => {
            this._addCurrentlyLoadedRushRooms();
            this._findDoors();

            let room = scanHelper.getRoomName();
            if (this.currentRoom && this.currentRoom != "Entrance") this.visitedRooms.add(this.currentRoom);

            this.currentRoom = room;
        })
    }

    _resetAttributes() {
        this.dataLoaded = false;
        this.inDungeon = false;
        this.currentRoom = null;
        this.rushRooms.clear();
        this.visitedRooms.clear();
        this.doorSkulls.clear();
        this.doors.clear();
    }

    _updateScoreBoardInfo() {
        const scoreBoardLines = Scoreboard.getLines();
        for (let line of scoreBoardLines) {
            if (line.getName().removeFormatting().includes("The Catac")) {
                this.inDungeon = true;
                break;
            }
        }
    }

    _findDoors() {
        if (!this.inDungeon) return;

        if (scanHelper.getRoomName(Player.getX(), Player.getZ()) != "Entrance")
            for (let skull of this.doorSkulls) {
                if (!blockOffset.doorCheck(skull)) continue;

                let block = blockOffset.getTargetBlock(skull, "NORTH", "right", 2, "back", 2);
                if (!block || !doorBlocks.includes(blockMetadata(block.x, block.y, block.z))) continue;

                let door = new Door(skull);
                if (!this.doors.has(door.coords.join(","))) {
                    this.doors.set(door.coords.join(","), door);
                }
            }
    }

    _doorStrToArr() {
        let arr = [];

        for (let str of this.doors) {
            let [bx, by, bz] = str.split(",").map(strInt => parseInt(strInt));
            arr.push[[bx, by, bz]];
        }
        return arr;
    }

    _addCurrentlyLoadedRushRooms() { 
        if (!this.inDungeon) return;

        const tileEnts = World.getAllTileEntitiesOfType(skull);
        if (!tileEnts) return;

        this.doorSkulls.clear(); 
        for (ent of tileEnts) { 
            let profile = ent.tileEntity.func_152108_a(); 
            if (!profile) continue;

            let properties = profile.getProperties();
            if (!properties) continue;

            let url = "";
            if (properties.containsKey("textures")) { 
                let textures = properties.get("textures");
                for (let texture of textures) {
                    let base64Texture = texture.getValue();
                    if (!base64Texture) break;

                    try { 
                        let decodedBytes = Base64.getDecoder().decode(base64Texture);
                        if (!decodedBytes) break;

                        let decoded = new java.lang.String(decodedBytes, "UTF-8");
                        let json = JSON.parse(decoded);
                        if (json.textures && json.textures.SKIN) {
                            url = json.textures.SKIN.url;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            if (!rushSkullOwners.includes(url.toString())) continue;

            let roomName = scanHelper.getRoomName(ent.getX(), ent.getZ());
            if (roomName == "No room found.") flag = true;
            if (roomName.includes("Fairy") || !returnOutRoomNames.includes(roomName)) {
                this.doorSkulls.add(ent); 
                this.rushRooms.add(roomName);
            }
        }
    }
}

class Door {
    constructor(doorSkull) {
        this.skulls = new Set();
        this.coords = null;
        this.connectedRooms = new Set();
        this.type = null;
        this.orientation = this._findOrientation(doorSkull);
        this.frameType = null;
        this.doorSkull = doorSkull;

        this._findCoords(doorSkull);
        this._findConnected(doorSkull);

        this.type = blockMetadata(...this.coords) == COAL_BLOCK ? "Wither" : "Blood";
        this.orientation = this._findOrientation(doorSkull);

        this._resolveDoorFrame(doorSkull);
        register("worldUnload", () => {
            this = null;
            return;
        })

        this.connectedRoomTrigger = register("step", () => {
            this._findConnected(this.doorSkull);

            if (this.connectedRooms.size === 2) {
                this.connectedRoomTrigger.unregister();
                return;
            }

        }).setDelay(3);

    }

    _findOrientation(skull) {
        const skullRot = blockOffset.handleSkullRotations(skull.tileEntity.func_145906_b());

        if (skullRot == "NORTH" || skullRot == "SOUTH") return "NS";
        else return "EW";
    }

    _findCoords(skull) {
        const doorSide = this._doorSide(skull);
        if (!doorSide) return;

        const block = blockOffset.getTargetBlock(skull, "NORTH", doorSide, 2, "back", 2);
        if (!doorBlocks.includes(blockMetadata(block.x, block.y, block.z))) return;

        this.coords = [block.x, block.y, block.z];

    }

    _doorSide(skull) { 
        const rightBlock = blockOffset.getTargetBlock(skull, "NORTH", "right", 1, "back", 1);
        const leftBlock = blockOffset.getTargetBlock(skull, "NORTH", "left", 1, "back", 1);
        const leftBlockMeta = blockMetadata(leftBlock.x, leftBlock.y, leftBlock.z);
        const rightBlockMeta = blockMetadata(rightBlock.x, rightBlock.y, rightBlock.z);

        return doorBlocks.includes(leftBlockMeta) ? "left" : doorBlocks.includes(rightBlockMeta) ? "right" : null;
    }

    _resolveDoorFrame(skull) {
        const sideOffSet = blockOffset.getRelativeOffset(skull, this._doorSide(skull));
        const middle = World.getBlockAt(skull.getX() + sideOffSet[0] * 2, 72, skull.getZ() + sideOffSet[2] * 2).type.getRegistryName();
        const side = World.getBlockAt(skull.getX() + sideOffSet[0], 72, skull.getZ() + sideOffSet[2]).type.getRegistryName();

        this.frameType = this._doorFrameType(middle, side);
    }

    _findConnected(skull) {
        const thisRoom = scanHelper.getRoomName(skull.getX(), skull.getZ());
        if(thisRoom.includes("No room found.")) return;

        this.connectedRooms.add(`${thisRoom},${blockOffset.handleSkullRotations(skull)}`);
        const behindOffSet = blockOffset.getRelativeOffset(skull, "back");

        const behindRoom = scanHelper.getRoomName(skull.getX() + behindOffSet[0] * 5, skull.getZ() + behindOffSet[2] * 5);
        if(behindRoom.includes("No room found.")) return;
        
        this.connectedRooms.add(`${behindRoom},${blockOffset.handleSkullRotations(skull, true)}`);
    }

    _doorFrameType(middle, side) {
        switch (side) {
            case "minecraft:air":
                return "clean";
            case "minecraft:iron_bars":
                return "row";
            case "minecraft:stone_stairs":
            case "minecraft:wooden_slab": 
            case "minecraft:stone_brick_stairs":
            case "minecraft:nether_brick_stairs":
                if (middle.includes("slab")) {
                    return "row";
                }
                return "default";
            default:
                return "default";
        }
    }

}