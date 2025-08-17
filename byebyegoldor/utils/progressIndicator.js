import { sendMsg } from "./Utils"

/**
 * Progress Indicator for File Operations
 * Provides visual feedback during long-running operations
 */

class ProgressIndicator {
    constructor() {
        this.isActive = false
        this.currentOperation = null
        this.startTime = null
        this.lastUpdateTime = 0
        this.updateThreshold = 500 // Only update every 500ms to avoid spam
    }

    /**
     * Start a new progress operation
     * @param {string} operationName - Name of the operation
     */
    start(operationName) {
        this.isActive = true
        this.currentOperation = operationName
        this.startTime = Date.now()
        this.lastUpdateTime = 0
        
        sendMsg(`&7[BBG] &eStarting ${operationName}...`)
        this.showProgressBar(0, "Initializing...")
    }

    /**
     * Update progress
     * @param {string} message - Progress message
     * @param {number} percentage - Progress percentage (0-100)
     */
    update(message, percentage) {
        if (!this.isActive) return
        
        const now = Date.now()
        
        // Throttle updates to prevent chat spam
        if (now - this.lastUpdateTime < this.updateThreshold && percentage < 100) {
            return
        }
        
        this.lastUpdateTime = now
        this.showProgressBar(percentage, message)
    }

    /**
     * Complete the operation
     * @param {string} message - Completion message
     * @param {boolean} success - Whether operation was successful
     */
    complete(message, success = true) {
        if (!this.isActive) return
        
        const elapsed = this.getElapsedTime()
        const statusColor = success ? "&a" : "&c"
        const statusIcon = success ? "✓" : "✗"
        
        sendMsg(`${statusColor}[BBG] ${statusIcon} ${message} &7(${elapsed})`)
        
        this.isActive = false
        this.currentOperation = null
        this.startTime = null
    }

    /**
     * Show error and stop progress
     * @param {string} errorMessage - Error message
     */
    error(errorMessage) {
        if (this.isActive) {
            const elapsed = this.getElapsedTime()
            sendMsg(`&c[BBG] ✗ ${errorMessage} &7(${elapsed})`)
        } else {
            sendMsg(`&c[BBG] ✗ ${errorMessage}`)
        }
        
        this.isActive = false
        this.currentOperation = null
        this.startTime = null
    }

    /**
     * Show progress bar in chat
     * @param {number} percentage - Progress percentage
     * @param {string} message - Status message
     */
    showProgressBar(percentage, message) {
        const barLength = 20
        const filled = Math.floor((percentage / 100) * barLength)
        const empty = barLength - filled
        
        const bar = "&a" + "█".repeat(filled) + "&7" + "░".repeat(empty)
        const percent = Math.floor(percentage).toString().padStart(3, " ")
        
        sendMsg(`&7[BBG] ${bar} &f${percent}% &7- ${message}`)
    }

    /**
     * Get elapsed time as formatted string
     * @returns {string} Formatted elapsed time
     */
    getElapsedTime() {
        if (!this.startTime) return "0.0s"
        
        const elapsed = (Date.now() - this.startTime) / 1000
        
        if (elapsed < 60) {
            return `${elapsed.toFixed(1)}s`
        } else {
            const minutes = Math.floor(elapsed / 60)
            const seconds = Math.floor(elapsed % 60)
            return `${minutes}m ${seconds}s`
        }
    }

    /**
     * Show file size warning
     * @param {number} sizeMB - File size in MB
     */
    showFileSizeWarning(sizeMB) {
        if (sizeMB > 5) {
            sendMsg(`&c[BBG] Warning: Very large file (${sizeMB.toFixed(1)}MB)`)
            sendMsg(`&c[BBG] This may take several minutes to process`)
        } else if (sizeMB > 1) {
            sendMsg(`&e[BBG] Large file detected (${sizeMB.toFixed(1)}MB)`)
            sendMsg(`&e[BBG] Processing may take longer than usual`)
        }
    }

    /**
     * Show estimated time remaining
     * @param {number} percentage - Current progress percentage
     */
    showTimeEstimate(percentage) {
        if (!this.startTime || percentage <= 5) return
        
        const elapsed = Date.now() - this.startTime
        const estimated = (elapsed / percentage) * (100 - percentage)
        
        if (estimated > 5000) { // Only show if more than 5 seconds remaining
            const estimatedSeconds = Math.floor(estimated / 1000)
            if (estimatedSeconds < 60) {
                sendMsg(`&7[BBG] Estimated time remaining: ~${estimatedSeconds}s`)
            } else {
                const minutes = Math.floor(estimatedSeconds / 60)
                const seconds = estimatedSeconds % 60
                sendMsg(`&7[BBG] Estimated time remaining: ~${minutes}m ${seconds}s`)
            }
        }
    }

    /**
     * Create a progress callback function for async operations
     * @returns {Function} Progress callback
     */
    createCallback() {
        return (message, percentage) => {
            this.update(message, percentage)
            
            // Show time estimate for long operations
            if (percentage > 0 && percentage % 25 === 0) {
                this.showTimeEstimate(percentage)
            }
        }
    }

    /**
     * Show operation tips to user
     * @param {string} operationType - Type of operation (upload/download)
     */
    showTips(operationType) {
        if (operationType === "upload") {
            sendMsg("&7[BBG] Tip: Large uploads may take several minutes")
            sendMsg("&7[BBG] You can continue playing while the upload processes")
        } else if (operationType === "download") {
            sendMsg("&7[BBG] Tip: BBG will restart automatically after download")
            sendMsg("&7[BBG] Make sure to save any unsaved progress first")
        }
    }
}

// Export singleton instance
const progressIndicator = new ProgressIndicator()
export default progressIndicator
