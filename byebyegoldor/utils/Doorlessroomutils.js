import { scanUtils } from "./Doorlessutils";

export default new class scanHelper {
    constructor() {
        this.roomsData = null;
        this.loadRooms();
    }

    loadRooms() {
        try {
            const content = FileLib.read("byebyegoldor", "./data/Rooms/rooms.json"); 
            this.roomsData = JSON.parse(content);
        } catch (e) {
            console.log(`[doorlessv2] Error loading rooms data: ${e}`);
        }
    }

    getRoomName(x = Player.getX(), z = Player.getZ()) {
        const roomCore = scanUtils.getCore(scanUtils.getRoomCenter(x, z));
    
        if (!roomCore) return "No room found.";
    
        this.loadRooms();
    
        let roomName = "No room found.";
    
        if (!this.roomsData) {
            ChatLib.chat("&cRooms data not loaded. Check console for errors.");
            return "No room found.";
        }
    
        for (let room in this.roomsData) {
            if (this.roomsData.hasOwnProperty(room) && this.roomsData[room].cores.includes(roomCore)) {
                roomName = this.roomsData[room].name;
                break;
            }
        }
    
        return roomName;
    
    }
}




