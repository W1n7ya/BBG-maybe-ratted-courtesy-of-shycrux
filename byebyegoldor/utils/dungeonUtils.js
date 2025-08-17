import Dungeon from "../../BloomCore/dungeons/Dungeon";
import { OdinDungeonUtils } from "./mappings";
import Vector3 from "../../BloomCore/utils/Vector3";

class dungeonUtils {
    constructor() {
        this.items = [
            "Health Potion VIII Splash Potion",
            "Healing Potion 8 Splash Potion",
            "Healing Potion VIII Splash Potion",
            "Healing VIII Splash Potion",
            "Healing 8 Splash Potion",
            "Decoy",
            "Inflatable Jerry",
            "Spirit Leap",
            "Trap",
            "Training Weights",
            "Defuse Kit",
            "Dungeon Chest Key",
            "Treasure Talisman",
            "Revive Stone",
            "Architect's First Draft"
        ];

        this.rotationNumber = new Map([
            ["NORTH", 0],
            ["WEST", -1],
            ["SOUTH", 2],
            ["EAST", 1]
        ])

        register("command", () => ChatLib.chat(this.getRoomName())).setName("getroomname");

        register("command", () => {
            const currRoom = OdinDungeonUtils.INSTANCE.currentRoom;
            if (!currRoom) return;
            ChatLib.chat(currRoom.rotation);
        }).setName("getrotation");

        register("command", () => {
            const roomCoords = this.getRoomCoords(Player.getX(), Player.getY(), Player.getZ());
            ChatLib.chat(`x:${roomCoords[0]}, y:${roomCoords[1]}, z:${roomCoords[2]}`);
        }).setName("getroomcoord");
    }

    isDungeonItem(item) {
        return this.items.includes(item);
    }

    getRoom() {
        return OdinDungeonUtils.INSTANCE.currentRoom;
    }

    getRoomName() {
        if (Server.getIP() == "localhost") return "Boss";
        if (this.inBoss()) return "Boss";
        if (!this.inDungeon || !this.getRoom()) return "Unknown";
        return OdinDungeonUtils.INSTANCE.currentRoomName;
    }

    getRoomCoords(x, y, z) {
        const currRoom = OdinDungeonUtils.INSTANCE.currentRoom;
        if (!currRoom) return [x, y, z];

        const roomRotation = currRoom.rotation;
        const clayCoord = this.extractCoord(currRoom.clayPos.toString());
    
        const inputVec = new Vector3(x, y, z);
        const clayVec = new Vector3(clayCoord[0], 0, clayCoord[2]);
    
        const relativeCoord = inputVec.copy().subtract(clayVec);
        const relativeCoordNorth = this.rotateToNorth(relativeCoord, roomRotation);
    
        return [relativeCoordNorth.getX(), relativeCoordNorth.getY(), relativeCoordNorth.getZ()];
    }

    getRealCoords(x, y, z) {
        const currRoom = OdinDungeonUtils.INSTANCE.currentRoom;
        if (!currRoom) return [x, y, z];

        const roomRotation = currRoom.rotation;
        const clayCoord = this.extractCoord(currRoom.clayPos.toString());
    
        const inputVec = new Vector3(x, y, z);
        const relativeRotated = this.rotateFromNorth(inputVec, roomRotation);
    
        const clayVec = new Vector3(clayCoord[0], 0, clayCoord[2]);
    
        const realCoord = clayVec.copy().add(relativeRotated.copy());
        return [realCoord.getX(), realCoord.getY(), realCoord.getZ()];
    }

    getRoomYaw(yaw) {
        const currRoom = OdinDungeonUtils.INSTANCE.currentRoom;
        if (!currRoom) return parseFloat(yaw);
        const roomRotation = currRoom.rotation;
        return parseFloat(yaw) - (parseFloat(this.rotationNumber.get(roomRotation.toString())) * 90);
    }

    getRealYaw(yaw) {
        const currRoom = OdinDungeonUtils.INSTANCE.currentRoom;
        if (!currRoom) return parseFloat(yaw);
        const roomRotation = currRoom.rotation;
        return parseFloat(yaw) + (parseFloat(this.rotationNumber.get(roomRotation.toString())) * 90);
    }

    getRoomRotations(yaw, pitch) {
        return [this.getRoomYaw(yaw), pitch];
    }

    getRealRotations(yaw, pitch) {
        return [this.getRealYaw(yaw), pitch];
    }

    inDungeon() {
        return Dungeon.inDungeon;
    }

    inBoss() {
        const allowedIps = ["localhost", "hypixelasdasdas.zapto.org"]; // singleplayer & p3 clone server
        if (allowedIps.includes(Server.getIP())) return true;
        return OdinDungeonUtils.INSTANCE.inBoss;
    }

    isDungeonPoint(room) {
        return !["Boss", "Unknown"].includes(room);
    }

    extractCoord(string) {
        const coordRegex = /x=(-?\d+), y=(-?\d+), z=(-?\d+)/;
        const match = string.match(coordRegex);

        if (match) {
            const x = parseInt(match[1], 10);
            const y = parseInt(match[2], 10);
            const z = parseInt(match[3], 10);
            return [x, y, z];
        }
    }

    rotateToNorth(vector, currentRotation) {
        let output = vector.copy();

        switch (currentRotation.toString()) {
            case "NORTH": output = new Vector3(-vector.getX(), vector.getY(), -vector.getZ()); break;
            case "WEST": output = new Vector3(vector.getZ(), vector.getY(), -vector.getX()); break;
            case "SOUTH": output = vector; break;
            case "EAST": output = new Vector3(-vector.getZ(), vector.getY(), vector.getX()); break;
        }

        return output;
    }
    
    rotateFromNorth(vector, desiredRotation) {
        let output = vector.copy();

        switch (desiredRotation.toString()) {
            case "NORTH": output = new Vector3(-vector.getX(), vector.getY(), -vector.getZ()); break;
            case "WEST": output = new Vector3(-vector.getZ(), vector.getY(), vector.getX()); break;
            case "SOUTH": output = vector; break;
            case "EAST": output = new Vector3(vector.getZ(), vector.getY(), -vector.getX()); break;
        }

        return output;
    }
}

export default new dungeonUtils();