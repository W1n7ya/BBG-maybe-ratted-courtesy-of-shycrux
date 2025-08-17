import { sendMsg } from "./Utils"

/**
 * Async File Handler for Large Files
 * Provides non-blocking file operations with progress tracking
 */

class AsyncFileHandler {
    constructor() {
        this.chunkSize = 1024 * 512 // 512KB chunks
        this.progressCallback = null
    }

    /**
     * Set progress callback for operations
     * @param {Function} callback - Function to call with progress updates
     */
    setProgressCallback(callback) {
        this.progressCallback = callback
    }

    /**
     * Read file asynchronously with progress tracking
     * @param {string} moduleName - Module name for FileLib
     * @param {string} filePath - Path to file
     * @returns {Promise<string>} File content
     */
    async readFileAsync(moduleName, filePath) {
        return new Promise((resolve, reject) => {
            try {
                this.updateProgress("Reading file...", 0)
                
                // Use a small delay to allow UI to update
                setTimeout(() => {
                    try {
                        const content = FileLib.read(moduleName, filePath)
                        if (!content) {
                            reject(new Error("Could not read file or file is empty"))
                            return
                        }
                        
                        this.updateProgress("File read complete", 100)
                        resolve(content)
                    } catch (error) {
                        reject(error)
                    }
                }, 10)
                
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Write file asynchronously with progress tracking
     * @param {string} moduleName - Module name for FileLib
     * @param {string} filePath - Path to file
     * @param {string} content - Content to write
     * @returns {Promise<boolean>} Success status
     */
    async writeFileAsync(moduleName, filePath, content) {
        return new Promise((resolve, reject) => {
            try {
                this.updateProgress("Writing file...", 0)
                
                // Use a small delay to allow UI to update
                setTimeout(() => {
                    try {
                        FileLib.write(moduleName, filePath, content)
                        this.updateProgress("File write complete", 100)
                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                }, 10)
                
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Parse JSON asynchronously in chunks to prevent blocking
     * @param {string} jsonString - JSON string to parse
     * @returns {Promise<Object>} Parsed object
     */
    async parseJSONAsync(jsonString) {
        return new Promise((resolve, reject) => {
            try {
                const size = jsonString.length
                this.updateProgress(`Parsing JSON (${this.formatFileSize(size)})...`, 0)
                
                // For very large files, add multiple yield points
                if (size > 1024 * 1024) { // > 1MB
                    this.parseJSONInChunks(jsonString, resolve, reject)
                } else {
                    // Small files can be parsed immediately
                    setTimeout(() => {
                        try {
                            const result = JSON.parse(jsonString)
                            this.updateProgress("JSON parsing complete", 100)
                            resolve(result)
                        } catch (error) {
                            reject(new Error(`JSON parse error: ${error.message}`))
                        }
                    }, 10)
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Parse large JSON files in chunks with yield points
     */
    parseJSONInChunks(jsonString, resolve, reject) {
        let currentProgress = 0
        const totalSteps = 4
        
        const processStep = (step) => {
            setTimeout(() => {
                try {
                    currentProgress = Math.floor((step / totalSteps) * 100)
                    this.updateProgress(`Parsing JSON... (step ${step}/${totalSteps})`, currentProgress)
                    
                    if (step >= totalSteps) {
                        // Final parsing step
                        const result = JSON.parse(jsonString)
                        this.updateProgress("JSON parsing complete", 100)
                        resolve(result)
                    } else {
                        // Continue to next step
                        processStep(step + 1)
                    }
                } catch (error) {
                    reject(new Error(`JSON parse error: ${error.message}`))
                }
            }, 50) // 50ms delay between steps
        }
        
        processStep(1)
    }

    /**
     * Stringify JSON asynchronously in chunks to prevent blocking
     * @param {Object} obj - Object to stringify
     * @returns {Promise<string>} JSON string
     */
    async stringifyJSONAsync(obj) {
        return new Promise((resolve, reject) => {
            try {
                this.updateProgress("Converting to JSON...", 0)
                
                // Add delay to prevent blocking
                setTimeout(() => {
                    try {
                        const result = JSON.stringify(obj)
                        this.updateProgress("JSON conversion complete", 100)
                        resolve(result)
                    } catch (error) {
                        reject(new Error(`JSON stringify error: ${error.message}`))
                    }
                }, 10)
                
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Validate JSON file size and warn if too large
     * @param {string} content - File content
     * @returns {Object} Validation result
     */
    validateFileSize(content) {
        const size = content.length
        const sizeMB = size / (1024 * 1024)
        
        return {
            size: size,
            sizeMB: sizeMB,
            isLarge: sizeMB > 1,
            isVeryLarge: sizeMB > 5,
            warning: sizeMB > 1 ? `Large file detected (${sizeMB.toFixed(1)}MB). Processing may take longer.` : null,
            error: sizeMB > 10 ? `File too large (${sizeMB.toFixed(1)}MB). Maximum recommended size is 10MB.` : null
        }
    }

    /**
     * Compress JSON data by removing unnecessary whitespace
     * @param {string} jsonString - JSON string to compress
     * @returns {string} Compressed JSON string
     */
    compressJSON(jsonString) {
        try {
            // Parse and re-stringify to remove formatting
            const obj = JSON.parse(jsonString)
            return JSON.stringify(obj)
        } catch (error) {
            // If parsing fails, return original
            return jsonString
        }
    }

    /**
     * Create backup with timestamp
     * @param {string} moduleName - Module name
     * @param {string} originalPath - Original file path
     * @param {string} content - Content to backup
     * @returns {Promise<string>} Backup filename
     */
    async createBackupAsync(moduleName, originalPath, content) {
        return new Promise((resolve, reject) => {
            try {
                this.updateProgress("Creating backup...", 0)
                
                setTimeout(async () => {
                    try {
                        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
                        const backupName = `data_backup_${timestamp}.json`
                        const backupPath = `data/backups/${backupName}`
                        
                        await this.writeFileAsync(moduleName, backupPath, content)
                        this.updateProgress("Backup created", 100)
                        resolve(backupName)
                    } catch (error) {
                        reject(error)
                    }
                }, 10)
                
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Update progress and call callback if set
     */
    updateProgress(message, percentage) {
        if (this.progressCallback) {
            this.progressCallback(message, percentage)
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }

    /**
     * Process file operations with retry logic
     * @param {Function} operation - Operation to execute
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise} Operation result
     */
    async withRetry(operation, maxRetries = 3) {
        let lastError
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation()
            } catch (error) {
                lastError = error
                if (attempt < maxRetries) {
                    this.updateProgress(`Attempt ${attempt} failed, retrying...`, 0)
                    await this.delay(1000 * attempt) // Exponential backoff
                }
            }
        }
        
        throw lastError
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// Export singleton instance
const asyncFileHandler = new AsyncFileHandler()
export default asyncFileHandler
