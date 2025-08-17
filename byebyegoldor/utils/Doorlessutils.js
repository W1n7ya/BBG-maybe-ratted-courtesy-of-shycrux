export const getDistance2D = (x1, z1, x2, z2) => Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
export const getDistance3D = (x1, y1, z1, x2, y2, z2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
export const C08PacketPlayerBlockPlacement = Java.type("net.minecraft.network.play.client.C08PacketPlayerBlockPlacement");
export const COAL_BLOCK = "minecraft:coal_block";
export const RED_STAINED_CLAY = "minecraft:stained_hardened_clay[color=red]";
export const C03PacketPlayer = Java.type("net.minecraft.network.play.client.C03PacketPlayer");
export const C04PacketPlayerPosition = Java.type("net.minecraft.network.play.client.C03PacketPlayer$C04PacketPlayerPosition")
export const S08PacketPlayerPosLook = Java.type("net.minecraft.network.play.server.S08PacketPlayerPosLook");
export const C05PacketPlayerLook = Java.type("net.minecraft.network.play.client.C03PacketPlayer$C05PacketPlayerLook")
export const C06PacketPlayerPosLook = Java.type("net.minecraft.network.play.client.C03PacketPlayer$C06PacketPlayerPosLook")
export const EntityPlayer = Java.type("net.minecraft.entity.player.EntityPlayer")
export const S32PacketConfirmTransaction = Java.type("net.minecraft.network.play.server.S32PacketConfirmTransaction");
export const rushSkullOwners = ["http://textures.minecraft.net/texture/3bcbbf94d603743a1e7147026e1c1240bd98fe87cc4ef04dcab51a31c30914fd", "http://textures.minecraft.net/texture/9d9d80b79442cf1a3afeaa237bd6adaaacab0c28830fb36b5704cf4d9f5937c4"];
export const skull = Java.type("net.minecraft.tileentity.TileEntitySkull");
export const roomEnterEvent = Java.type("me.odinmain.events.impl.RoomEnterEvent");
export const Base64 = Java.type("java.util.Base64");
export const returnOutRoomNames = ["No room found.", "Fairy", "Entrance", "Blood"];
export const KeyBinding = Java.type("net.minecraft.client.settings.KeyBinding");
export const scanUtils = Java.type("me.odinmain.utils.skyblock.dungeon.ScanUtils").INSTANCE;

export const movementKeys = [
    Client.getMinecraft().field_71474_y.field_74351_w.func_151463_i(),
    Client.getMinecraft().field_71474_y.field_74370_x.func_151463_i(),
    Client.getMinecraft().field_71474_y.field_74366_z.func_151463_i(),
    Client.getMinecraft().field_71474_y.field_74368_y.func_151463_i()
];

export function blockMetadata(x, y, z) {
    const block = World.getBlockAt(x, y, z).getPos();
    const blockState = World.getBlockStateAt(block);
    return blockState.toString();
}

export function snapTo(yaw, pitch) {
    const player = Player.getPlayer();
    player.field_70177_z = yaw;
    player.field_70125_A = pitch;
}

export function setKeyState(key, state) {
    KeyBinding.func_74510_a(key, state)
}

export const stopMovement = () => {
    for (let i = 0; i < movementKeys.length; i++) {
        setKeyState(movementKeys[i], false)
    }
    //sets motion x & z to 0 while keeping motionY
    Player.getPlayer().func_70016_h(0, Player.getPlayer().field_70181_x, 0);
}

export const restartMovement = () => {
    for(let i = 0; i < movementKeys.length; i++){
        setKeyState(movementKeys[i], Keyboard.isKeyDown(movementKeys[i]));
    }
}

export const removeUnicode = (string) => typeof (string) !== "string" ? "" : string.replace(/[^\u0000-\u007F]/g, "")

export function flooredPos(x, y, z) {
    return [Math.floor(x), Math.floor(y), Math.floor(z)];
}

export function strToDec(str) {
    return isNaN(parseFloat(str)) ? null : parseFloat(str);
}

export function clip(dx, dz, distance) {
    let newX = Math.floor(Player.getX()) + dx * distance + 0.5;
    let newZ = Math.floor(Player.getZ()) + dz * distance + 0.5;

    Player.getPlayer().func_70107_b(newX, 69, newZ);
}

export function motion(speed, mult) {
    const yawRad = (Math.round(Player.getYaw() / 90 * 90)) * (Math.PI / 180)
    const velo = speed * mult + (0.22 * (speed / 1.32))
    x = velo * -Math.sin(yawRad)
    z = velo * Math.cos(yawRad)
    Player.getPlayer().func_70016_h(x, Player.getPlayer().field_70181_x, z)
}