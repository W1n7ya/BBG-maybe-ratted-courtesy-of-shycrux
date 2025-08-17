let disablerActive = false;
let joinTime = 0;
let lobbyTime = 0;
let finished = 0;
let air = 0;
let setbackCount = 0;
let jumped = false;
let awaitJoin = false;
let joinTick = false;
let awaitSetback = false;
let zOffset = 0;
let savedYaw = 0;
let savedPitch = 0;
let minSetbacks = 18;
let timeout = 12000;

let jump = new KeyBind(Client.getMinecraft().field_71474_y.field_74314_A);

function resetVars() {
    disablerActive = false;
    awaitSetback = false;
    joinTick = false;
    awaitJoin = false;
    jumped = false;
    air = 0;
    setbackCount = 0;
    zOffset = 0;
    savedYaw = 0;
    savedPitch = 0;
    jump.setState(false); // <-- This line ensures the jump key is released
}

register("command", () => {
    joinTime = Date.now();
    awaitJoin = true;
}).setName("disabler");

register("tick", () => {
    const now = Date.now();
    const player = Player.getPlayer();

    if (awaitJoin && now - joinTime >= 50) {
        awaitJoin = false;
        joinTick = true;
    }

    if (joinTick) {
        if (player.field_70122_E) {
            jump.setState(true);
            jumped = true;
        }

        if (!player.field_70122_E && jumped) {
            air++;
            if (air >= 10) {
                joinTick = false;
                air = 0;
                setbackCount = 0;
                savedYaw = player.field_70177_z;
                savedPitch = player.field_70125_A;
                lobbyTime = now;
                awaitSetback = true;
                disablerActive = true;
                jump.setState(false);
                ChatLib.chat("&6[&8&lDisabler&6] Running disabler...");
            }
        }
    }

    if (awaitSetback) {
        if (now - lobbyTime > timeout) {
            ChatLib.chat("&6[&8&lDisabler&6] Timed out.");
            resetVars();
            return;
        }

        player.field_70159_w = 0;
        player.field_70181_x = 0;
        player.field_70179_y = 0;

        player.field_70177_z = savedYaw;
        player.field_70125_A = savedPitch;

        zOffset = .14;
        if (player.field_71075_bZ.field_75100_b) zOffset *= -1;
        player.field_70179_y += zOffset;
    }
});

register("packetReceived", (packet) => {
    if (awaitSetback && packet.class.getSimpleName().includes("S08")) {
        setbackCount++;
        zOffset = 0;
 //       ChatLib.chat("&7[&bDisabler&7] Setback count: " + setbackCount);

        if (setbackCount >= minSetbacks) {
            ChatLib.chat("&6[&8&lDisabler&6] Wait a few seconds...");
            
            setTimeout(() => {
                ChatLib.chat("&6[&a&lDisabler&6] You Blinker?");
            }, 5000); 

            finished = Date.now();
            resetVars();
        }
    }
});
