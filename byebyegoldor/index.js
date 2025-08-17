global.balancePackets = 0;
global.inFreeCam = false;
global.hasMana = true;

import "./config";

// Managers
import "./managers/configManager";
import "./managers/pointManager";
import "./managers/renderManager";

// Modules
import "./module/hClip";
import "./module/invWalk";
import "./module/lavaClip";
import "./module/pearlClip";
import "./module/freeCam";
import "./module/bossClip";
import "./module/timerBalance";
import "./module/autoLeap";
import "./module/leapNotifier";
import "./module/verticalJerry";
// import "./module/zpew";
import "./module/insta1";
import "./module/disabler";
import "./module/lowhop";
import "./module/doorless";
// import "./module/autoroutes";
import "./module/InstamidSneak";
import "./module/AutoClip";
import "./module/AutoP5";
import "./module/BlinkRelics";
import "./module/AutoTnt";
// import "./module/BowSpam";
import "./module/dataSharing";
// import "./module/desyncDetector"; // Import desync detector module
// import "./module_test"; // Module load verification
// import "./module/packets";
// import "./module/AutoCroesus";
// import "./module/scaffold";

// Utils
import "./utils/playerUtils";
import "./utils/rotationUtils";
import "./utils/timerUtils";
import "./utils/leapUtils";
import "./utils/dungeonUtils";

register("command", () => ChatLib.command("warp dh", false)).setName("dh");
register("chat", () => ChatLib.command("l", false)).setCriteria("A kick occurred in your connection, so you were put in the SkyBlock lobby!");
register("chat", (event) => cancel(event)).setCriteria("Your Implosion").setContains();
register("chat", (event) => cancel(event)).setCriteria("There are blocks in the way!");
