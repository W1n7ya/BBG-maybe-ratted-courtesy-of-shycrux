register("command", () => {
    let spamCount = 0;
    const spamInterval = setInterval(() => {
        if (spamCount >= 10) {
            clearInterval(spamInterval);
            return;
        }
        if (Player.getHeldItem() && Player.getHeldItem().getName().toLowerCase().includes("bow")) {
            // Simulate right click (pull bow)
            click("right");
            // Release after minimal delay
            setTimeout(() => {
                click("right", false); // Release right click
                spamCount++;
            }, 50); // 50ms minimal charge
        }
    }, 75); // 75ms between shots
}, "bowspam");

