import { drawLine3d } from "../../BloomCore/utils/Utils";
import RenderLibV2J from "../../RenderLibV2J";
import config from "../config";
import dungeonUtils from "../utils/dungeonUtils";
import { Color } from "../utils/mappings";
import { data } from "./configManager";

// Animation and visual enhancement variables
let animationTime = 0;
let lastFrameTime = Date.now();

// Performance tracking for adaptive quality
let frameCount = 0;
let avgFPS = 60;

// Helper function to get rainbow colors
function getRainbowColor(time, speed = 1) {
    const hue = (time * speed * 60) % 360;
    const rgb = hslToRgb(hue / 360, 1, 0.5);
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1];
}

// HSL to RGB conversion
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper function to calculate distance-based opacity
function getDistanceOpacity(playerPos, ringPos, maxDistance) {
    if (!config().distanceFading) return 1.0;

    const dx = playerPos[0] - ringPos[0];
    const dy = playerPos[1] - ringPos[1];
    const dz = playerPos[2] - ringPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > maxDistance) return 0;
    const fadeStart = maxDistance * 0.7;
    if (distance < fadeStart) return 1.0;

    return 1.0 - ((distance - fadeStart) / (maxDistance - fadeStart));
}

// Helper function to draw different shapes
function drawCustomShape(x, y, z, radius, thickness, color, opacity, phase, shape) {
    switch (shape) {
        case "Circle":
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 1.6, thickness, radius * 1.5,
                color[0], color[1], color[2], opacity, phase, 2.5);
            break;
        case "Square":
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 1.5, thickness, radius * 1.5,
                color[0], color[1], color[2], opacity, phase, 2.0);
            break;
        case "Diamond":
            // Rotate 45 degrees for diamond shape
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 1.4, thickness, radius * 1.4,
                color[0], color[1], color[2], opacity, phase, 2.0);
            break;
        case "Cross":
            // Draw cross pattern
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 1.8, thickness, radius * 0.3,
                color[0], color[1], color[2], opacity, phase, 2.0);
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 0.3, thickness, radius * 1.8,
                color[0], color[1], color[2], opacity, phase, 2.0);
            break;
        default:
            // Default to circle for Hexagon and Star (complex shapes)
            RenderLibV2J.drawEspBoxV2(x, y, z, radius * 1.6, thickness, radius * 1.5,
                color[0], color[1], color[2], opacity, phase, 2.5);
    }
}

register("renderWorld", () => {
    if (!config().autoP3 || config().disableRender) return;

    // Performance tracking for adaptive quality
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    animationTime += deltaTime;

    frameCount++;
    if (frameCount % 60 === 0) { // Update FPS every 60 frames
        avgFPS = 1 / deltaTime;
        if (config().adaptiveQuality && avgFPS < 30) {
            // Reduce quality if FPS is low
            config().performanceMode = Math.max(1, config().performanceMode - 1);
        } else if (config().adaptiveQuality && avgFPS > 50) {
            // Increase quality if FPS is good
            config().performanceMode = Math.min(5, config().performanceMode + 1);
        }
    }

    // Get player position for distance calculations
    const player = Player.asPlayerMP();
    const playerPos = [player.getX(), player.getY(), player.getZ()];

    // Enhanced color system with customization support
    let baseColor = config().renderColor;

    // Apply rainbow mode if enabled
    if (config().enableRingCustomization && config().rainbowMode) {
        const rainbowColor = getRainbowColor(animationTime, config().rainbowSpeed || 1.0);
        baseColor = [rainbowColor[0] * 255, rainbowColor[1] * 255, rainbowColor[2] * 255];
    }

    const color = [
        baseColor[0] / 255,
        baseColor[1] / 255,
        baseColor[2] / 255,
        (baseColor[3] || 255) / 255
    ];

    // Calculate animation effects
    let animationMultiplier = 1.0;
    if (config().enableRingCustomization && config().enableRingAnimation) {
        const speed = config().animationSpeed || 1.5;
        const intensity = config().animationIntensity || 0.05;

        switch (config().animationType) {
            case 0: // Breathing
                animationMultiplier = 1 + Math.sin(animationTime * speed) * intensity;
                break;
            case 1: // Pulse
                animationMultiplier = 1 + Math.abs(Math.sin(animationTime * speed * 2)) * intensity * 2;
                break;
            case 2: // Rotation
                // Rotation is handled in the rendering itself
                animationMultiplier = 1 + Math.sin(animationTime * speed * 0.5) * intensity * 0.5;
                break;
            case 3: // Wave
                animationMultiplier = 1 + Math.sin(animationTime * speed * 3) * intensity;
                break;
            case 4: // Bounce
                animationMultiplier = 1 + Math.abs(Math.sin(animationTime * speed * 4)) * intensity;
                break;
            case 5: // Spiral
                animationMultiplier = 1 + Math.sin(animationTime * speed + Math.PI/4) * intensity;
                break;
            default: // None
                animationMultiplier = 1.0;
        }
    } else {
        // Default breathing effect if customization is disabled
        animationMultiplier = 1 + Math.sin(animationTime * 1.5) * 0.05;
    }

    // Create stable pulsing effect for enhanced visibility
    const pulseIntensity = config().enableRingCustomization && config().pulsingBorder ?
        0.7 + Math.sin(animationTime * 2) * 0.2 : 0.8;

    const glowIntensity = config().enableRingCustomization ? (config().glowIntensity || 0.6) : 0.6;
    const brightColor = [
        Math.min(1.0, color[0] * (1 + pulseIntensity * 0.3)),
        Math.min(1.0, color[1] * (1 + pulseIntensity * 0.3)),
        Math.min(1.0, color[2] * (1 + pulseIntensity * 0.3)),
        Math.max(0.6, color[3] * pulseIntensity)
    ];

    Object.entries(data.points).forEach(([cfg, points]) => {
        if (cfg !== data.config) return;

        // Group points by location to handle overlapping rings with better precision
        const pointGroups = new Map();
        const blinkPoints = [];

        points.forEach((point, index) => {
            let { room, coords, radius, type, packets, argz } = point;

            if (room !== dungeonUtils.getRoomName() && Server.getIP() !== "localhost") return;
            if (dungeonUtils.isDungeonPoint(room)) coords = dungeonUtils.getRealCoords(...coords);

            // Distance culling
            const distance = Math.sqrt((coords[0] - playerPos[0])**2 + (coords[1] - playerPos[1])**2 + (coords[2] - playerPos[2])**2);
            const maxRenderDistance = 50.0;
            if (distance > maxRenderDistance) return;

            // Handle text points separately
            if (type === "text") {
                const textHeight = config().enableTypeTextCustomization ? (config().typeTextHeight || 1.4) : 1.4;
                const textSize = config().enableTypeTextCustomization ? (config().typeTextSize || 0.04) : 0.04;
                const textY = coords[1] + textHeight + Math.sin(animationTime * 3 + index) * 0.1;
                return Tessellator.drawString(
                    argz,
                    coords[0],
                    textY,
                    coords[2],
                    Color.WHITE.getRGB(),
                    true,
                    textSize * radius,
                    false
                );
            }

            // Collect blink points for separate path rendering, but ALSO include them in ring rendering
            if (type === "blink") {
                blinkPoints.push({ ...point, coords, originalIndex: index });
                // Don't return here - let blink points also be rendered as rings
            }

            // Group ALL points by location (including blink points for ring rendering)
            const locationKey = `${Math.round(coords[0] * 2)}_${Math.round(coords[1] * 2)}_${Math.round(coords[2] * 2)}`;
            if (!pointGroups.has(locationKey)) {
                pointGroups.set(locationKey, []);
            }
            pointGroups.get(locationKey).push({ ...point, coords, originalIndex: index });
        });

        // Render grouped points (non-blink)
        pointGroups.forEach((groupedPoints) => {
            const largestPoint = groupedPoints.reduce((prev, current) =>
                (current.radius > prev.radius) ? current : prev
            );

            const { coords, radius, type, originalIndex } = largestPoint;

            // Apply customization settings
            const baseSize = config().enableRingCustomization ? (config().ringBaseSize || 1.0) : 1.0;
            const thickness = config().enableRingCustomization ? (config().ringThickness || 0.05) : 0.05;
            const height = config().enableRingCustomization ? (config().ringHeight || 1.05) : 1.05;
            const opacity = config().enableRingCustomization ? (config().ringOpacity || 0.95) : 0.95;

            const dynamicRadius = radius * baseSize * animationMultiplier;
            const renderY = coords[1] + height;

            // Distance-based opacity
            const distanceOpacity = getDistanceOpacity(playerPos, coords, config().fadeDistance || 50.0);
            const finalOpacity = opacity * distanceOpacity;

            if (finalOpacity <= 0.1) return; // Skip if too transparent

            // Enhanced shape rendering
            const shape = config().enableRingCustomization ?
                (["Circle", "Square", "Diamond", "Hexagon", "Star", "Cross"][config().ringShape] || "Circle") : "Circle";

            // Main ring rendering with GLOW EFFECTS
            if (config().circleRendering || config().enableRingCustomization) {
                // GLOW EFFECT (inner) - This is what provides the glow!
                if (!config().enableRingCustomization || config().glowEffect !== false) {
                    RenderLibV2J.drawInnerEspBoxV2(
                        coords[0], renderY, coords[2],
                        dynamicRadius * 1.8, thickness,
                        dynamicRadius * 1.7,
                        color[0] * glowIntensity, color[1] * glowIntensity, color[2] * glowIntensity,
                        finalOpacity * 0.35,
                        config().phase
                    );
                }

                // Inner fill
                if (config().enableRingCustomization && config().innerFill) {
                    const fillOpacity = (config().fillOpacity || 0.3) * finalOpacity;
                    RenderLibV2J.drawInnerEspBoxV2(
                        coords[0], renderY, coords[2],
                        dynamicRadius * 1.4, thickness,
                        dynamicRadius * 1.3,
                        color[0], color[1], color[2],
                        fillOpacity,
                        config().phase
                    );
                }

                // Main ring with custom shape
                drawCustomShape(
                    coords[0], renderY, coords[2],
                    dynamicRadius, thickness,
                    brightColor, finalOpacity,
                    config().phase, shape
                );

                // Double ring effect
                if (config().enableRingCustomization && config().doubleRing) {
                    drawCustomShape(
                        coords[0], renderY, coords[2],
                        dynamicRadius * 1.3, thickness * 0.7,
                        [brightColor[0] * 0.8, brightColor[1] * 0.8, brightColor[2] * 0.8],
                        finalOpacity * 0.6,
                        config().phase, shape
                    );
                }
            } else {
                // Square rendering (legacy) with glow
                RenderLibV2J.drawInnerEspBoxV2(
                    coords[0], coords[1] + 1.01, coords[2],
                    dynamicRadius * 1.8, thickness, dynamicRadius * 1.7,
                    color[0] * 0.6, color[1] * 0.6, color[2] * 0.6,
                    finalOpacity * 0.35, config().phase
                );

                RenderLibV2J.drawEspBoxV2(
                    coords[0], coords[1] + 1.01, coords[2],
                    dynamicRadius * 1.5, thickness, dynamicRadius * 1.5,
                    brightColor[0], brightColor[1], brightColor[2],
                    finalOpacity, config().phase, 2.0
                );
            }

            // Enhanced type text rendering
            if (config().typeRendering) {
                const allTypes = [...new Set(groupedPoints.map(point => point.type))];
                const textOffset = Math.sin(animationTime * 2 + originalIndex) * 0.05;
                const textHeight = config().enableTypeTextCustomization ? (config().typeTextHeight || 1.3) : 1.3;
                const textSize = config().enableTypeTextCustomization ? (config().typeTextSize || 0.025) : 0.025;
                const textColor = config().enableTypeTextCustomization ? config().typeTextColor : [255, 255, 255];
                const isBold = config().enableTypeTextCustomization ? config().typeTextBold : true;
                const isUppercase = config().enableTypeTextCustomization ? config().typeTextUppercase : true;

                allTypes.forEach((ringType, index) => {
                    const yOffset = index * 0.25;
                    let displayText = isUppercase ? ringType.toUpperCase() : ringType;
                    if (isBold) displayText = `§l${displayText}§r`;

                    Tessellator.drawString(
                        displayText,
                        coords[0],
                        coords[1] + textHeight + yOffset + textOffset,
                        coords[2],
                        (textColor[0] << 16) | (textColor[1] << 8) | textColor[2],
                        true,
                        textSize,
                        false
                    );
                });
            }
        });

        // BLINK RENDERING with full customization
        blinkPoints.forEach((blinkPoint) => {
            const { coords, packets, originalIndex } = blinkPoint;

            // Packet counter
            if (!config().enableBlinkCustomization || config().showPacketCounter !== false) {
                const packetCount = packets ? packets.length : 0;
                const counterSize = config().enableBlinkCustomization ? (config().packetCounterSize || 0.04) : 0.04;
                const counterHeight = config().enableBlinkCustomization ? (config().packetCounterHeight || 1.7) : 1.7;
                const counterColor = config().enableBlinkCustomization ? config().packetCounterColor : [255, 215, 0];
                const packetCountOffset = Math.sin(animationTime * 1.8 + originalIndex) * 0.03;

                Tessellator.drawString(
                    `§6§l${packetCount}§r`,
                    coords[0],
                    coords[1] + counterHeight + packetCountOffset,
                    coords[2],
                    (counterColor[0] << 16) | (counterColor[1] << 8) | counterColor[2],
                    true,
                    counterSize,
                    false
                );
            }

            // Blink path rendering
            if ((config().enableBlinkCustomization && config().renderBlink) || (!config().enableBlinkCustomization && config().renderBlink)) {
                if (packets && packets.length > 1) {
                    // Use the same color system as rings - support rainbow mode and customization
                    let pathColor;
                    if (config().enableBlinkCustomization && config().blinkPathColor) {
                        pathColor = config().blinkPathColor;
                    } else {
                        // Use the same color as rings (with rainbow support)
                        pathColor = [baseColor[0], baseColor[1], baseColor[2]];
                    }

                    const pathOpacity = config().enableBlinkCustomization ? (config().blinkPathOpacity || 0.8) : 0.8;
                    const lineWidth = config().enableBlinkCustomization ? (config().blinkLineWidth || 2.5) : 3.0; // Slightly thicker default
                    const pathStyle = config().enableBlinkCustomization ? (config().blinkPathStyle || 0) : 0;

                    for (let i = 0; i < packets.length - 1; i++) {
                        let packet1 = packets[i];
                        let packet2 = packets[i + 1];
                        if (!packet1 || !packet2) continue;

                        const progress = i / (packets.length - 1);
                        let finalOpacity = Math.max(0.6, (1 - progress * 0.2) * pathOpacity); // Higher minimum opacity
                        let currentWidth = lineWidth + Math.sin(animationTime * 2 + i * 0.3) * 0.5; // Dynamic width variation

                        // Enhanced visual effects for better appearance
                        const segmentIntensity = 1.0 - (progress * 0.3); // Fade towards end but less aggressive
                        const enhancedColor = [
                            Math.min(255, pathColor[0] * segmentIntensity),
                            Math.min(255, pathColor[1] * segmentIntensity),
                            Math.min(255, pathColor[2] * segmentIntensity)
                        ];

                        // Apply blink animation
                        if (config().enableBlinkCustomization && config().enableBlinkAnimation) {
                            const animSpeed = config().blinkAnimationSpeed || 3.0;
                            switch (config().blinkAnimationType) {
                                case 0: // Flow
                                    const flowEffect = Math.sin(animationTime * animSpeed - i * 0.5);
                                    finalOpacity *= (0.8 + flowEffect * 0.2);
                                    currentWidth += flowEffect * 0.3;
                                    break;
                                case 1: // Pulse
                                    const pulseEffect = Math.abs(Math.sin(animationTime * animSpeed));
                                    finalOpacity *= (0.7 + pulseEffect * 0.3);
                                    currentWidth += pulseEffect * 0.8;
                                    break;
                                case 2: // Spark
                                    currentWidth += Math.sin(animationTime * animSpeed + i) * 1.2;
                                    finalOpacity *= (0.8 + Math.abs(Math.sin(animationTime * animSpeed + i * 0.5)) * 0.2);
                                    break;
                                case 3: // Wave
                                    const waveEffect = Math.sin(animationTime * animSpeed + i * 0.3);
                                    finalOpacity *= (0.8 + waveEffect * 0.2);
                                    currentWidth += waveEffect * 0.6;
                                    break;
                                case 4: // Gradient
                                    const gradientFactor = 1 - (i / packets.length);
                                    finalOpacity *= (0.5 + gradientFactor * 0.5);
                                    enhancedColor[0] *= gradientFactor;
                                    enhancedColor[1] *= gradientFactor;
                                    enhancedColor[2] *= gradientFactor;
                                    break;
                            }
                        }

                        // Ensure minimum width and opacity for visibility
                        currentWidth = Math.max(1.5, currentWidth);
                        finalOpacity = Math.max(0.4, Math.min(1.0, finalOpacity));

                        // Draw enhanced lines based on style
                        switch (pathStyle) {
                            case 0: // Line - Enhanced with glow effect
                            default:
                                // Main line
                                drawLine3d(
                                    packet1[0], packet1[1], packet1[2],
                                    packet2[0], packet2[1], packet2[2],
                                    enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                    finalOpacity,
                                    currentWidth,
                                    config().phase
                                );

                                // Glow effect - thicker, more transparent line underneath
                                drawLine3d(
                                    packet1[0], packet1[1], packet1[2],
                                    packet2[0], packet2[1], packet2[2],
                                    enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                    finalOpacity * 0.3,
                                    currentWidth * 2.2,
                                    config().phase
                                );

                                // Core bright line
                                drawLine3d(
                                    packet1[0], packet1[1] + 0.02, packet1[2],
                                    packet2[0], packet2[1] + 0.02, packet2[2],
                                    Math.min(1.0, enhancedColor[0] / 255 * 1.3),
                                    Math.min(1.0, enhancedColor[1] / 255 * 1.3),
                                    Math.min(1.0, enhancedColor[2] / 255 * 1.3),
                                    finalOpacity * 0.8,
                                    currentWidth * 0.4,
                                    config().phase
                                );
                                break;

                            case 1: // Dotted - Enhanced
                                if (i % 2 === 0) {
                                    // Main dot
                                    drawLine3d(
                                        packet1[0], packet1[1], packet1[2],
                                        packet2[0], packet2[1], packet2[2],
                                        enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                        finalOpacity,
                                        currentWidth * 1.2,
                                        config().phase
                                    );

                                    // Dot glow
                                    drawLine3d(
                                        packet1[0], packet1[1], packet1[2],
                                        packet2[0], packet2[1], packet2[2],
                                        enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                        finalOpacity * 0.4,
                                        currentWidth * 2.5,
                                        config().phase
                                    );
                                }
                                break;

                            case 2: // Dashed - Enhanced
                                if (Math.floor(i / 2) % 2 === 0) {
                                    // Main dash
                                    drawLine3d(
                                        packet1[0], packet1[1], packet1[2],
                                        packet2[0], packet2[1], packet2[2],
                                        enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                        finalOpacity,
                                        currentWidth,
                                        config().phase
                                    );

                                    // Dash glow
                                    drawLine3d(
                                        packet1[0], packet1[1], packet1[2],
                                        packet2[0], packet2[1], packet2[2],
                                        enhancedColor[0] / 255, enhancedColor[1] / 255, enhancedColor[2] / 255,
                                        finalOpacity * 0.35,
                                        currentWidth * 2.0,
                                        config().phase
                                    );
                                }
                                break;
                        }
                    }
                }
            }
        });
    });
});
