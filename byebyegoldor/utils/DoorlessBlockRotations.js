import { skull, COAL_BLOCK, RED_STAINED_CLAY, blockMetadata} from "./Doorlessutils";
const doorBlocks = [COAL_BLOCK, RED_STAINED_CLAY];

export default new class blockOffset {
    constructor() {
        this.directionOffset = {
            "EAST": {
                "front": [1, 0, 0],
                "right": [0, 0, -1],
                "left": [0, 0, 1],
                "back": [-1, 0, 0]
            },
            "WEST": {
                "front": [-1, 0, 0],
                "right": [0, 0, 1],
                "left": [0, 0, -1],
                "back": [1, 0, 0]
            },
            "NORTH": {
                "front": [0, 0, -1],
                "right": [-1, 0, 0],
                "left": [1, 0, 0],
                "back": [0, 0, 1]
            },
            "SOUTH": {
                "front": [0, 0, 1],
                "right": [1, 0, 0],
                "left": [-1, 0, 0],
                "back": [0, 0, -1]
            }
        }
        this.relativeYaw = {
            "EAST": {
                "front": 90,
                "right": 0,
                "left": -180,
                "back": -90
            },
            "WEST": {
                "front": -90,
                "right": -180,
                "left": 0,
                "back": 90
            },
            "NORTH": {
                "front": -180,
                "right": 90,
                "left": -90,
                "back": 0
            },
            "SOUTH": {
                "front": 0,
                "right": -90,
                "left": 90,
                "back": -180
            }
        }
    }

    handleSkullRotations(skullRot, invert = false) { 
        let rot = skullRot;
        if (skullRot.tileEntity && skullRot.tileEntity instanceof skull) rot = skullRot.tileEntity.func_145906_b();
        switch (rot) {
            case 0.0:
                return !invert ? "NORTH" : "SOUTH";
            case 4.0:
                return !invert ? "EAST" : "WEST";
            case 8.0:
                return !invert ? "SOUTH" : "NORTH";
            case 12.0:
                return !invert ? "WEST" : "EAST";
            default:
                return null;
        }
    }

    getRelativeOffset(facing, relativeDirection) {
        if (!facing || !relativeDirection) return null;

        let facingData;
        let facingFetch = facing;

        if (facing.tileEntity && facing.tileEntity instanceof skull) facingFetch = this.handleSkullRotations(facing.tileEntity.func_145906_b());

        facingData = this.directionOffset[facingFetch.toUpperCase()];
        if (!facingData) return null;

        const offset = facingData[relativeDirection.toLowerCase()];

        return !offset ? null : offset;
    }

    getTargetBlock(block, blockFacing, relativeDirection1, distance1, relativeDirection2 = front, distance2 = 0) {
        let blockX = null;
        let blockY = null;
        let blockZ = null;
        let facing = null;

        if (block.tileEntity && block.tileEntity instanceof skull) { 
            facing = this.handleSkullRotations(block.tileEntity.func_145906_b());
            blockX = block.getX();
            blockY = block.getY();
            blockZ = block.getZ();
        } else { 
            facing = blockFacing;
            blockX = block.x;
            blockY = block.y;
            blockZ = block.z;
        }

        const offset1 = this.getRelativeOffset(facing, relativeDirection1);
        const offset2 = this.getRelativeOffset(facing, relativeDirection2);

        if (!offset1 || !offset2) return null;

        return World.getBlockAt((blockX + offset1[0] * distance1 + offset2[0] * distance2),
            (blockY + offset1[1] * distance1 + offset2[1] * distance2),
            (blockZ + offset1[2] * distance1 + offset2[2] * distance2));
    }

    doorCheck(skull) {
        const rightBlock = this.getTargetBlock(skull, "NORTH", "right", 1, "back", 1);
        const leftBlock = this.getTargetBlock(skull, "NORTH", "left", 1, "back", 1);
        if (!leftBlock || !rightBlock) return false;
        return doorBlocks.includes(blockMetadata(rightBlock.x, rightBlock.y, rightBlock.z)) || doorBlocks.includes(blockMetadata(leftBlock.x, leftBlock.y, leftBlock.z));
    }

    getRelativeYaw(facing, relativeDirection) {
        const faceFetch = this.relativeYaw[facing];
        if (!faceFetch) return null;

        const yawData = faceFetch[relativeDirection];
        
        return !yawData ? null : yawData; 
    }

}