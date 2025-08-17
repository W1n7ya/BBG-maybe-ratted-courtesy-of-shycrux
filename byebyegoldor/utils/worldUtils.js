import { Blocks, MCBlock, MCBlockPos, IBlockState } from "./mappings"

/**
 * @param {[x, y, z]} pos 
 * @returns {IBlockState}
 */
const getBlockState = (pos) => {
    pos = new MCBlockPos(pos[0], pos[1], pos[2]);
    if (!World.getWorld().func_175701_a(pos)) return Blocks.field_150350_a.func_176223_P();
    const chunk = World.getWorld().func_175726_f(pos);
    return chunk.func_177435_g(pos);
}

/**
 * @param {[x, y, z]} pos 
 * @returns {MCBlock}
 */
const getBlock = (pos) => {
    const blockState = getBlockState(pos);
    return blockState.func_177230_c();
}

/**
 * @param {[x, y, z]} pos1 
 * @param {[x, y, z]} pos2 
 */
const getDistance = (pos1, pos2) => {
    const xDist = pos1[0] - pos2[0];
    const yDist = pos1[1] - pos2[1];
    const zDist = pos1[2] - pos2[2];

    return Math.sqrt(xDist * xDist + yDist * yDist + zDist * zDist);
}

export default { getBlock, getBlockState, getDistance };
