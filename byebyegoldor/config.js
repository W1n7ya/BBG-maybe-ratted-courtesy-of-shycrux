import Settings from "../Amaterasu/core/Settings"
import DefaultConfig from "../Amaterasu/core/DefaultConfig"

const scheme = "data/ColorScheme.json"
const config = new DefaultConfig("byebyegoldor", "data/settings.json")
    .addSwitch({
        category: "Auto P3",
        configName: "autoP3",
        title: "Auto P3 Toggle",
        description: "Toggles Auto P3"
    })
    .addSwitch({
        category: "Auto P3",
        configName: "disableRender",
        title: "Disable Rendering",
        description: "Disables Rendering",
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Auto P3",
        configName: "circleRendering",
        title: "Circle Rendering",
        description: "Changes the rendering to render a circle instead of a square",
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Auto P3",
        configName: "typeRendering",
        title: "Type Rendering",
        description: "Renders the type of point above the ring",
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Data Sharing",
        configName: "DataSharing",
        title: "Enable Data Sharing",
        description: "Enable the BBG Data Sharing Network features"
    })
    .addTextInput({
        category: "Data Sharing",
        configName: "DataSharingAPI",
        title: "API Endpoint",
        description: "API endpoint for data sharing (leave default for official server)",
        value: "http://localhost:3000/api/v1",
        shouldShow: data => data.DataSharing
    })
    .addSwitch({
        category: "Data Sharing",
        configName: "AutoBackup",
        title: "Auto Backup",
        description: "Automatically backup your data.json before downloading new data",
        shouldShow: data => data.DataSharing
    })
    .addSwitch({
        category: "Auto P3",
        configName: "phase",
        title: "Phase",
        description: "Allows you to see the points through walls",
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Auto P3",
        configName: "sendMessages",
        title: "Send Messages",
        description: "Sends a message of the action you just used",
        shouldShow: data => data.autoP3
    })
    .addColorPicker({
        category: "Auto P3",
        configName: "renderColor",
        title: "Rendering Color",
        description: "Changes the rendering color",
        value: [255, 255, 255],
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Auto P3",
        configName: "disableAfterGoldor",
        title: "Disable after Goldor",
        description: "Disables all rings after the core has been opened (useful for DPS)",
        shouldShow: data => data.autoP3
    })
    .addSwitch({
        category: "Auto P3",
        configName: "debugMessages",
        title: "Send Debug Messages",
        description: "Sends debug messages",
        shouldShow: data => data.autoP3
    })
    .addButton({
        category: "Auto P3",
        subcategory: "Toggle",
        configName: "AutoP3Commands",
        title: "➤ Auto P3 Commands",
        description: "",
        shouldShow: data => data.autoP3,
        onClick() {
            const AutoP3Commands = [
                `&8&m${ChatLib.getChatBreak(" ")}`,
                `&0&l[&d&lAuto P3&0&l] &7&l- &dHelp`,
                ``,
                `&d/bbg add rotate <args: walk> <radius>`,
                `&d/bbg add motion <args: walk, hclip, rotate, align, jump "can use multiple at once"> <radius> ""also motion only stops when it hits an align ring. if you dont want to make align ring. make motion rind w stop arg""`,
                `&d/bbg add walk <radius>`,
                `&d/bbg add lavaclip <radius>`,
                `&d/bbg add blink <args: awaitLeap, awaitTerm, awaitI1> <radius>`,
                `&d/bbg add bonzo <radius>`,
                `&d/bbg add jump <args: walk> <radius>`,
                `&d/bbg add hclip <radius>`,
                `&d/bbg add superboom <radius>`,
                `&d/bbg add swap <name of item> <radius>`,
                `&d/bbg add stop <radius>`,
                `&d/bbg add jump <args: walk> <radius>`,
                `&d/bbg add say <message> <radius>`,
                `&d/bbg add cmd "cmd" <radius>`,
                ``,
                `&d/bbg radius <radius> &8- &7Sets the radius of the closest node`,
                `&d/bbg align <aligns you to the middle of block ur most on>`,
                `&d/bbg remove &8- &7Removes the closest node`,
                `&d/bbg config <load, new, delete, list> `,
                `&d/bbg config <no args> lists your current config`,
                `&8&m${ChatLib.getChatBreak(" ")}`
            ]
            ChatLib.chat(AutoP3Commands.join("\n"))
        }
    })

    .addSwitch({
        category: "Auto P5",
        subcategory: "Relics",
        configName: "BlinkRelics",
        title: "Blink Relics",
        description: "Only red/orange",
    })

    .addMultiCheckbox({
        category: "Auto P5",
        subcategory: "Relics",
        configName: "RelicQoL",
        title: "Relic QoL",
        description: "",
        options: [
            {
                title: "Relic Aura",
                configName: "RelicAura",
                value: false
            },
            {
                title: "Auto Run To Relic - After Leap",
                configName: "AutoRunToRelic",
                value: false
            },
            {
                title: "Auto Equip Black Cat - After Leap",
                configName: "AutoEquipBlackCat",
                value: false
            }
        ],
    })

    .addDropDown({
        category: "Auto P5",
        subcategory: "Relics",
        configName: "RelicToRunTo",
        title: "➤ Relic To Run To",
        description: "Purple relic will trigger once 3+ players are in p5",
        options: ["Red", "Orange", "Blue", "Green", "Purple"],
        value: 0,
        shouldShow: data => data.AutoRunToRelic
    })

    /* Auto P5 | Toggle */
    .addSwitch({
        category: "Auto P5",
        subcategory: "Toggle",
        configName: "AutoP5",
        title: "Toggle Auto P5",
        description: "",
    })

    .addSwitch({
        category: "Auto P5",
        subcategory: "Toggle",
        configName: "AutoP5Debug",
        title: "➤ Auto P5 Debug",
        description: "",
        shouldShow: data => data.AutoP5,
    })

    .addDropDown({
        category: "Auto P5",
        subcategory: "Toggle",
        configName: "HealerTeam",
        title: "➤ Healer Debuff Team",
        description: "",
        options: ["Arch Team", "Bers Team"],
        value: 0,
        shouldShow: data => data.AutoP5,
    })

    /* Auto P5 | Last Breath */
    .addSwitch({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "AutoLastBreath",
        title: "Toggle Auto Last Breath",
        description: "",
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "PurpleDelay",
        title: "➤ Purple Last Breath Delay",
        description: "",
        options: [1, 15],
        value: 8,
        shouldShow: data => data.AutoLastBreath,
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "BlueDelay",
        title: "➤ Blue Last Breath Delay",
        description: "",
        options: [1, 15],
        value: 8,
        shouldShow: data => data.AutoLastBreath,
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "OrangeDelay",
        title: "➤ Orange Last Breath Delay",
        description: "",
        options: [1, 15],
        value: 8,
        shouldShow: data => data.AutoLastBreath,
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "RedDelay",
        title: "➤ Red Last Breath Delay",
        description: "",
        options: [1, 15],
        value: 8,
        shouldShow: data => data.AutoLastBreath,
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Last Breath",
        configName: "GreenDelay",
        title: "➤ Green Last Breath Delay",
        description: "",
        options: [1, 15],
        value: 8,
        shouldShow: data => data.AutoLastBreath,
    })

    /* Auto P5 | Spray/Leth */
    .addSwitch({
        category: "Auto P5",
        subcategory: "Spray/Leth",
        configName: "AutoIceSpray",
        title: "Toggle Auto Ice Spray",
        description: "",
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Spray/Leth",
        configName: "AutoIceSprayTick",
        title: "➤ Auto Ice Spray Tick",
        description: "",
        options: [1, 10],
        value: 1,
        shouldShow: data => data.AutoIceSpray,
    })

    .addSwitch({
        category: "Auto P5",
        subcategory: "Spray/Leth",
        configName: "AutoSoulWhip",
        title: "➤ Toggle Auto Soul Whip",
        description: "",
        shouldShow: data => data.AutoIceSpray,
    })

    .addSlider({
        category: "Auto P5",
        subcategory: "Spray/Leth",
        configName: "AutoSoulWhipTick",
        title: "➤ Auto Soul Whip Ticks",
        description: "",
        options: [15, 50],
        value: 15,
        shouldShow: data => data.AutoIceSpray,
    })
    .addSwitch({
        category: "Autoroute",
        subcategory: "Toggle",
        configName: "Autoroute",
        title: "Toggle Autoroutes",
        description: "",
    })

    .addKeybind({
        category: "Autoroute",
        subcategory: "Toggle",
        configName: "AutorouteDisabler",
        title: "➤ Autoroute Disabler Keybind",
        description: "Autoroutes will not work if this key is held",
        shouldShow: data => data.Autoroute
    })

    .addDropDown({
        category: "Autoroute",
        subcategory: "Toggle",
        configName: "RenderMode",
        title: "➤ Render Mode",
        description: "",
        options: ["Ring", "Flat Outline", "Flat Filled"],
        value: 0,
        shouldShow: data => data.Autoroute
    })

    .addMultiCheckbox({
        category: "Autoroute",
        subcategory: "Toggle",
        configName: "AutorouteToggle",
        title: "➤ Other",
        description: "",
        options: [
            {
                title: "Debug",
                configName: "AutorouteDebug",
                value: false
            },
            {
                title: "Render Through Walls",
                configName: "RenderAutorouteThroughWalls",
                value: false
            },
            {
                title: "Disable Rendering",
                configName: "AutorouteDisableRendering",
                value: false
            },
        ],
        shouldShow: data => data.Autoroute,
    })

    .addButton({
        category: "Autoroute",
        subcategory: "Toggle",
        configName: "AutorouteCommands",
        title: "➤ Autoroute Commands",
        description: "",
        shouldShow: data => data.Autoroute,
        onClick() {
            const AutorouteCommands = [
                `&8&m${ChatLib.getChatBreak(" ")}`,
                `&0&l[&d&lAutoroute&0&l] &7&l- &d&lHelp`,
                ``,
                `&d/autoroute add ether <stopmotion> <center> &8- &7Etherwarps! wow!`,
                `&d/autoroute add awaitsecret <stopmotion> <center> &8- &7ONLY WORKS FOR ETHERAWRP!!!!!!`,
                `&d/autoroute add batspawn <stopmotion> <center> &8- &7Swaps to hyperion and right clicks when bat spawns`,
                `&d/autoroute add startwalk <stopmotion> <center> &8- &7Walks! wow!`,
                `&d/autoroute add pearlclip <distance> &8- &7Pearlclips! wow!`,
                `&d/autoroute add use <item> <leftclick> &8- &7Uses specified item (if leftclick isnt true it will rightclick)`,
                `&d/autoroute add rotate <stopmotion> <center> &8- &7Rotates! wow!`,
                ``,
                `&d/autoroute em &8- &7Toggles edit mode, disables autoroutes while configging`,
                `&d/autoroute remove &8- &7Removes the closest autoroute within 2 blocks`,
                `&d/autoroute chain &8- &7Enables chain on the closest autoroute within 2 blocks, allowing you to walk over it`,
                ``,
                `&7Only use stopmotion/center on autoroutes you would typically walk into`,
                `&7<stopmotion>, <center>, <leftclick> e.g: &d/ar add ether false true&7, &d/ar add use infinityboom true`,
                `&7You can also use the command alias &d/ar &7for placing autoroutes`,
                `&8&m${ChatLib.getChatBreak(" ")}`
            ]
            ChatLib.chat(AutorouteCommands.join("\n"))
        }
    })

    /* Autoroute | Colors */
    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteEtherColor",
        title: "Ether",
        description: "",
        value: [85, 255, 255, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteAwaitSecretColor",
        title: "Await Secret",
        description: "",
        value: [255, 85, 85, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteBatSpawnColor",
        title: "Bat Spawn",
        description: "",
        value: [170, 170, 170, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteStartWalkColor",
        title: "Start Walk",
        description: "",
        value: [85, 255, 85, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutoroutePearlClipColor",
        title: "Pearl Clip",
        description: "",
        value: [255, 85, 255, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteUseColor",
        title: "Use",
        description: "",
        value: [255, 255, 255, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteWallClipColor",
        title: "Wall Clip",
        description: "",
        value: [170, 0, 0, 255]
    })

    .addColorPicker({
        category: "Autoroute",
        subcategory: "Colors",
        configName: "AutorouteRotateColor",
        title: "Rotate",
        description: "",
        value: [255, 255, 85, 255]
    })
    .addSwitch({
        category: "Auto Leap",
        configName: "autoLeap",
        title: "Auto Leap",
        description: "Automatically leaps to the next early enter when you left click your leap"
    })
    .addTextInput({
        category: "Auto Leap",
        configName: "ee2Leap",
        title: "Early Enter 2 Leap",
        description: "",
        shouldShow: data => data.autoLeap
    })
    .addTextInput({
        category: "Auto Leap",
        configName: "ee3Leap",
        title: "Early Enter 3 Leap",
        description: "",
        shouldShow: data => data.autoLeap
    })
    .addTextInput({
        category: "Auto Leap",
        configName: "coreLeap",
        title: "Core Leap",
        description: "",
        shouldShow: data => data.autoLeap
    })
    .addTextInput({
        category: "Auto Leap",
        configName: "inCoreLeap",
        title: "Inside Core Leap",
        description: "",
        shouldShow: data => data.autoLeap
    })
    .addSwitch({
        category: "Blink",
        configName: "timerBalance",
        title: "Timer Balance",
        description: "Balances timer checks by cancelling unused player packets"
    })
    .addSwitch({
        category: "Blink",
        configName: "displayPackets",
        title: "Display Packets",
        description: "Displays how many balanced packets you have",
        shouldShow: data => data.timerBalance
    })
    .addSlider({
        category: "Blink",
        configName: "removeAmount",
        title: "Remove Amount",
        description: "Removes an amount of packets from the balanced amount (Default: 50)",
        options: [0, 100],
        value: 50,
        shouldShow: data => data.timerBalance
    })
    .addSlider({
        category: "Blink",
        configName: "removeInterval",
        title: "Remove Interval",
        description: "How many seconds between removing packets from the balanced amount (Default: 10)",
        options: [1, 20],
        value: 10,
        shouldShow: data => data.timerBalance
    })
    .addSwitch({
        category: "Blink",
        configName: "balanceBoss",
        title: "Only balance in boss",
        description: "Only balances packets in boss",
        shouldShow: data => data.timerBalance
    })
    .addSwitch({
        category: "Blink",
        configName: "renderBlink",
        title: "Render Blink Line",
        description: "Renders the path of the blink packets"
    })
    .addSwitch({
        category: "Doorless",
        subcategory: "Doorless",
        configName: "doorless",
        title: "Doorless Toggle",
        description: "Enable/Disable Doorless",
    })

    .addTextInput({
        category: "Doorless",
        subcategory: "Doorless",
        configName: "doorlessclip",
        title: "Clip",
        description: "0.3 - 1.2 worked so far",
        placeHolder: "1.2",
        shouldShow: data => data.doorless
    })

    .addSwitch({
        category: "Doorless",
        subcategory: "Doorless",
        configName: "doorlessmotion",
        title: "Doorless Motion",
        description: "Enable/Disable Motion",
        shouldShow: data => data.doorless
    })

    .addTextInput({
        category: "Doorless",
        subcategory: "Doorless",
        configName: "doorlessmotionspeed",
        title: "Motion Speed",
        description: "1.1 - 2.7 worked so far",
        placeHolder: "2.4",
        shouldShow: data => data.doorlessmotion
    })
    .addSwitch({
        category: "Auto Tnt",
        configName: "autoTnt",
        title: "AutoTnt Toggle",
        description: "Swaps to Infinityboom and left clicks when looking at lilacs"
    })
    .addSlider({
        category: "Auto Tnt",
        configName: "autoTntCPS",
        title: "AutoTnt CPS",
        description: "Clicks per second for AutoTnt",
        min: 5,
        max: 10,
        step: 1,
        value: 5
    })
    .addSwitch({
        category: "Auto Tnt",
        configName: "p3Check",
        title: "Only Work In P3",
        description: "AutoTnt will only work while in P3"
    })
    .addSlider({
        category: "Extra",
        configName: "hClipBoost",
        title: "HClip Boost",
        description: "Adds more speed to HClip (Default: 12)",
        options: [0, 15],
        value: 12
    })
    .addSwitch({
        category: "Extra",
        configName: "invWalk",
        title: "Invwalk",
        description: "Inventory walk for some random inventories"
    })
    .addSlider({
        category: "Extra",
        configName: "lavaClipBlocks",
        title: "Lava Clip Blocks",
        description: "How many blocks to clip down when you lavaclip",
        options: [10, 100],
        value: 40
    })
    .addSwitch({
        category: "Extra",
        configName: "bossClip",
        title: "Boss Clip",
        description: "Clips you down to storm when you enter boss"
    })
    .addSwitch({
        category: "Extra",
        configName: "witherESP",
        title: "Wither ESP",
        description: "Outlines the bosses in F7/M7"
    })
    .addColorPicker({
        category: "Extra",
        configName: "witherESPColor",
        title: "Wither ESP Color",
        description: "Changes the color for Wither ESP",
        value: [255, 255, 255],
        shouldShow: data => data.witherESP
    })
    .addSwitch({
        category: "Extra",
        configName: "leapNotifier",
        title: "Leap Notifier",
        description: "Notifies you when noone is in the previous section"
    })
    .addSwitch({
        category: "Extra",
        configName: "vertJerry",
        title: "Vertical Jerry",
        description: "Cancels horizontal knockback from a jerry-chine gun"
    })
    .addMultiCheckbox({
        category: "Extra",
        subcategory: "Auto Clip",
        configName: "Clip",
        title: "Clips",
        description: "",
        options: [
            {
                title: "Storm Clip",
                configName: "StormClip",
                value: false
            },
            {
                title: "Core Clip",
                configName: "CoreClip",
                value: false
            },
        ]
    })
    .addSwitch({
        category: "Zpe",
        configName: "ZeroPingEtherwarp",
        title: "Zero Ping Etherwarp",
        description: "&cRecommended for autoroutes"
    })
    .addSwitch({
        category: "Zpe",
        configName: "ZpewSuccessSound",
        title: "Success Sound",
        description: "ding",
        shouldShow: data => data.ZeroPingEtherwarp
    })
    .addSwitch({
        category: "Extra",
        configName: "InstamidSneak",
        title: "Auto Sneak For Instamid",
        description: "Automatically sneaks when you are in the instamid area"
    })
    .addSwitch({
        category: "Insta 1",
        configName: "insta1",
        title: "Insta 1",
        description: "Automatically completes simon says device quickly"
    })
    .addSlider({
        category: "Insta 1",
        configName: "insta1Delay",
        title: "Insta 1 Delay",
        description: "",
        options: [0, 100],
        value: 0,
        shouldShow: data => data.insta1
    })
    .addSlider({
        category: "Insta 1",
        configName: "insta1Clicks",
        title: "Insta 1 Clicks",
        description: "",
        options: [0, 15],
        value: 0,
        shouldShow: data => data.insta1
    })
    .addSlider({
        category: "Insta 1",
        configName: "insta1Ping",
        title: "Insta 1 Ping",
        description: "The ping to delay the clicks at (0 = dynamic pinging)",
        options: [0, 250],
        value: 0,
        shouldShow: data => data.insta1
    })

    // === DATA SHARING CATEGORY ===
    .addSwitch({
        category: "Data Sharing",
        configName: "DataSharing",
        title: "Enable Data Sharing",
        description: "Enable the BBG Data Sharing Network to upload and download community data.json files"
    })
    .addTextInput({
        category: "Data Sharing",
        configName: "DataSharingApiUrl",
        title: "API Server URL",
        description: "The URL of the BBG Data Sharing API server",
        placeHolder: "https://your-api-endpoint.com/api/v1",
        value: "https://your-api-endpoint.com/api/v1",
        shouldShow: data => data.DataSharing
    })
    .addSwitch({
        category: "Data Sharing",
        configName: "AutoBackupOnDownload",
        title: "Auto Backup on Download",
        description: "Automatically backup your current data.json when downloading new data",
        value: true,
        shouldShow: data => data.DataSharing
    })
    .addSwitch({
        category: "Data Sharing",
        configName: "DataSharingNotifications",
        title: "Show Notifications",
        description: "Show chat notifications for upload/download progress",
        value: true,
        shouldShow: data => data.DataSharing
    })
    // Add Desync Detector Section
    .addSwitch({
        category: "Desync Detector",
        configName: "desyncDetector",
        title: "Enable Desync Detector",
        description: "Detects when you desync from the Hypixel server and displays an alert"
    })
    .addSwitch({
        category: "Desync Detector",
        configName: "desyncAudio",
        title: "Audio Alerts",
        description: "Play sound alerts when desync is detected",
        shouldShow: data => data.desyncDetector
    })
    .addSwitch({
        category: "Desync Detector",
        configName: "desyncVisual",
        title: "Visual Overlay",
        description: "Show a visual overlay when desync is detected",
        shouldShow: data => data.desyncDetector
    })
    .addSlider({
        category: "Desync Detector",
        configName: "packetTimeout",
        title: "Packet Timeout (seconds)",
        description: "How long without packets before triggering desync detection",
        min: 2,
        max: 10,
        step: 0.5,
        value: 5,
        shouldShow: data => data.desyncDetector
    })
    .addSlider({
        category: "Desync Detector",
        configName: "tpsThreshold",
        title: "TPS Threshold",
        description: "Server TPS below this value will trigger desync detection",
        min: 5,
        max: 18,
        step: 1,
        value: 12,
        shouldShow: data => data.desyncDetector
    })
    .addButton({
        category: "Desync Detector",
        subcategory: "Help",
        configName: "DesyncCommands",
        title: "➤ Desync Detector Commands",
        description: "Click to see available commands",
        shouldShow: data => data.desyncDetector,
        onClick() {
            const DesyncCommands = [
                `&8&m${ChatLib.getChatBreak(" ")}`,
                `&0&l[&c&lDesync Detector&0&l] &7&l- &cHelp`,
                ``,
                `&c/desync &7- Reset detection if desync detected or toggle temporary disable`,
                `&c/desync reset &7- Manually reset desync detection`,
                `&c/desync info &7- Show detailed status information`,
                ``,
                `&c/desynctest &7- Show available test options`,
                `&c/desynctest packet &7- Test packet timeout detection`,
                `&c/desynctest position &7- Test position desync detection`,
                `&c/desynctest tps &7- Test TPS drop detection`,
                `&c/desynctest chunk &7- Test chunk loading detection`,
                `&c/desynctest entity &7- Test entity update detection`,
                ``,
                `&7Automatic Detection Types:`,
                `&7- Packet Timeout: No server packets for 5+ seconds`,
                `&7- Position Desync: You're moving but position isn't updating`,
                `&7- Low TPS: Server TPS drops below threshold`,
                `&7- Chunk Issues: No chunk updates for 3+ seconds`,
                `&7- Entity Issues: No entity updates for 2+ seconds`,
                `&8&m${ChatLib.getChatBreak(" ")}`
            ];

            DesyncCommands.forEach(line => {
                ChatLib.chat(line);
            });
        }
    })
    .addButton({
        category: "Data Sharing",
        configName: "DataSharingHelp",
        title: "Commands & Help",
        description: "Show all data sharing commands and help",
        shouldShow: data => data.DataSharing,
        onClick() {
            const helpText = [
                `&8&m${ChatLib.getChatBreak(" ")}`,
                `&d&lBBG Data Sharing Network - Help`,
                ``,
                `&7Commands:`,
                `&d/bbgdata upload <name> <description> [category] &7- Upload your data.json`,
                `&d/bbgdata download <id> [backup] &7- Download data by ID`,
                `&d/bbgdata list [category] [page] &7- List available data`,
                `&d/bbgdata search <query> &7- Search for data`,
                `&d/bbgdata categories &7- Show available categories`,
                `&d/bbgdata backup &7- Backup current data.json`,
                `&d/bbgdata update <id> "<changes>" <token>  &7- Lets you update you upload. you need the " " for changes. `,
                `&d/bbgdata token <id> &7- Gives you a one time token to update your upload`,
                `&d&d/bbgdata Changelog <id> &7- Shows the changelog of a config`,
                ``,
                `&7Categories:`,
                `&a• General &7- General purpose data`,
                `&a• P3 &7- Phase 3 specific routes`,
                `&a• P5 &7- Phase 5 specific routes`,
                `&a• Speed &7- Speedrun optimized routes`,
                `&a• Consistency &7- Consistent/safe routes`,
                `&a• Experimental &7- New/experimental routes`,
                ``,
                `&7Examples:`,
                `&d/bbgdata upload "Speed P3" "Fast P3 routes for speedruns" Speed`,
                `&d/bbgdata search "P3 speed"`,
                `&d/bbgdata list P5 1`,
                `&8&m${ChatLib.getChatBreak(" ")}`
            ]
            ChatLib.chat(helpText.join("\n"))
        }
    })
    .addButton({
        category: "Data Sharing",
        configName: "OpenDataFolder",
        title: "Open Data Folder",
        description: "Open the BBG data folder in file explorer",
        shouldShow: data => data.DataSharing,
        onClick() {
            ChatLib.command("ct folder", true)
        }
    })



// === PACKETS CATEGORY ===
const packetsModule = require("./module/packets");
const packetSettings = packetsModule.getPacketSettings();

// Add info section at the top of the Packets category using .addTextInput (as a read-only field)
config.addTextInput({
    category: "Packets",
    configName: "packetsInfo",
    title: "How to Enable Packet Logging",
    description: "Use /packetstart to enable and /packetstop to disable packet logging.",
    placeHolder: "/packetstart /packetstop",
    value: "",
    readOnly: true,
    shouldShow: () => true
});

// Add a switch for each packet
packetSettings.forEach(pkt => {
    config.addSwitch({
        category: "Packets",
        configName: `packet_${pkt.name}`,
        title: `[${pkt.type === 'sent' ? 'Sent' : 'Received'}] ${pkt.name}`,
        description: `${pkt.description}\nHow to get: ${pkt.howToGet}`,
        value: false
    });
});

const setting = new Settings("byebyegoldor", config, scheme)
    .setPos(25, 25)
    .setSize(50, 50)
    .apply();

export default () => setting.settings;











