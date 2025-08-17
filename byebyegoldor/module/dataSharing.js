import config from "../config"
import request from "requestV2"
import { sendMsg } from "../utils/Utils"

/**
 * BBG Data Sharing Network - COMPATIBLE VERSION
 * Optimized for large files but compatible with ChatTriggers/Rhino
 */

// Polyfill Buffer for ChatTriggers/Rhino if not present
if (typeof Buffer === 'undefined') {
    Buffer = {
        from: function(arr) {
            // Only supports array of bytes or string
            if (typeof arr === 'string') {
                // base64 decode if possible, else utf8
                try {
                    return Java.type('java.util.Base64').getDecoder().decode(arr);
                } catch (e) {
                    // fallback: convert string to bytes (utf8)
                    var bytes = [];
                    for (var i = 0; i < arr.length; ++i) bytes.push(arr.charCodeAt(i));
                    return bytes;
                }
            }
            // If already array, just return
            return arr;
        }
    };
}

// API endpoint configuration
var API_BASE = "https://bbg-data-api.onrender.com/api/v1"
var UPLOAD_ENDPOINT = API_BASE + "/data/upload"
var DOWNLOAD_ENDPOINT = API_BASE + "/data/download"
var LIST_ENDPOINT = API_BASE + "/data/list"
var SEARCH_ENDPOINT = API_BASE + "/data/search"

var availableDataFiles = []
var uploadInProgress = false
var downloadInProgress = false

// Progress tracking
var progressData = {
    active: false,
    type: "",
    progress: 0,
    message: "",
    startTime: 0
}

function updateProgress(message, progress) {
    progressData.message = message
    progressData.progress = progress
    if (progressData.active) {
        var elapsed = Date.now() - progressData.startTime
        var estimated = elapsed / (progress / 100)
        var remaining = Math.max(0, estimated - elapsed)
        sendMsg("&7[" + progressData.type + "] " + message + " (" + Math.round(progress) + "%) ETA: " + Math.round(remaining/1000) + "s")
    }
}

function startProgress(type, message) {
    progressData.active = true
    progressData.type = type
    progressData.startTime = Date.now()
    updateProgress(message, 0)
}

function endProgress() {
    progressData.active = false
    progressData.progress = 0
}

// Parse quoted arguments properly
function parseQuotedArgs(args) {
    var parsed = []
    var current = ""
    var inQuotes = false
    
    for (var i = 0; i < args.length; i++) {
        var arg = args[i]
        
        if (!inQuotes && arg.startsWith('"') && arg.endsWith('"') && arg.length > 1) {
            parsed.push(arg.slice(1, -1))
        } else if (!inQuotes && arg.startsWith('"')) {
            inQuotes = true
            current = arg.slice(1)
        } else if (inQuotes && arg.endsWith('"')) {
            current += " " + arg.slice(0, -1)
            parsed.push(current)
            current = ""
            inQuotes = false
        } else if (inQuotes) {
            current += (current ? " " : "") + arg
        } else {
            parsed.push(arg)
        }
    }
    
    if (inQuotes && current) {
        parsed.push(current)
    }
    
    return parsed
}

// Enhanced file reading with progress for large files
function readLargeFile(filePath) {
    try {
        var content = FileLib.read("byebyegoldor", filePath)
        if (!content) return null
        
        var size = content.length
        if (size > 1024 * 1024) {
            sendMsg("&7Processing large file (" + Math.round(size/1024/1024 * 10)/10 + "MB)...")
        }
        
        return content
    } catch (e) {
        sendMsg("&cError reading file: " + e.message)
        return null
    }
}

// Enhanced JSON parsing with progress for large files
function parseJSONSafely(content) {
    try {
        if (content.length > 1024 * 1024) {
            sendMsg("&7Parsing large JSON file...")
            var startTime = Date.now()
            var result = JSON.parse(content)
            var elapsed = Date.now() - startTime
            if (elapsed > 1000) {
                sendMsg("&7JSON parsing completed in " + Math.round(elapsed/1000) + "s")
            }
            return result
        }
        
        return JSON.parse(content)
    } catch (e) {
        sendMsg("&cError parsing JSON: " + e.message)
        return null
    }
}

function DataSharingManager() {
    this.playerName = Player.getName()
    this.loadAvailableData()
}

DataSharingManager.prototype.uploadData = function(name, description, category) {
    if (!category) category = "General"
    
    if (uploadInProgress) {
        sendMsg("&cUpload already in progress!")
        return false
    }

    if (!name || name.trim().length === 0) {
        sendMsg("&cPlease provide a name for your data!")
        return false
    }

    if (!description || description.trim().length === 0) {
        sendMsg("&cPlease provide a description for your data!")
        return false
    }

    uploadInProgress = true
    startProgress("UPLOAD", "Reading data file...")

    try {
        var dataContent = readLargeFile("data/data.json")
        if (!dataContent) {
            sendMsg("&cCouldn't read data.json file!")
            uploadInProgress = false
            endProgress()
            return false
        }

        updateProgress("Validating JSON...", 20)

        var parsedData = parseJSONSafely(dataContent)
        if (!parsedData) {
            sendMsg("&cInvalid JSON in data.json file!")
            uploadInProgress = false
            endProgress()
            return false
        }

        updateProgress("Preparing upload data...", 40)

        var sizeInMB = dataContent.length / 1024 / 1024
        if (sizeInMB > 5) {
            sendMsg("&eWarning: Large file detected (" + Math.round(sizeInMB * 10)/10 + "MB)")
            sendMsg("&eThis may take a while to upload...")
        }

        if (sizeInMB > 10) {
            sendMsg("&cFile too large (" + Math.round(sizeInMB * 10)/10 + "MB)! Maximum size is 10MB.")
            uploadInProgress = false
            endProgress()
            return false
        }

        var uploadData = {
            name: name.trim(),
            description: description.trim(),
            category: category,
            uploaderName: this.playerName,
            uploadDate: new Date().toISOString(),
            dataSize: dataContent.length,
            pointCount: this.countPoints(parsedData),
            configName: parsedData.config || "Unknown",
            data: dataContent,
            version: "0.3.5-Optimized"
        }

        updateProgress("Uploading to server...", 60)

        var self = this
        request({
            url: UPLOAD_ENDPOINT,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "BBG-DataSharing/0.3.5-Optimized"
            },
            body: uploadData,
            json: true,
            timeout: 60000
        })
        .then(function(response) {
            uploadInProgress = false
            endProgress()
            
            var dataId = (response && response.dataId) ? response.dataId : (response && response.data && response.data.id ? response.data.id : undefined)
            
            if (response && response.success) {
                updateProgress("Upload completed!", 100)
                sendMsg("&aSuccessfully uploaded data to BBG Network!")
                
                if (dataId !== undefined) {
                    // Create clickable copy button that puts ID in chat input box
                    var copyMessage = new Message(
                        new TextComponent("&a&l[📋 COPY ID] ").setClick("suggest_command", dataId).setHover("show_text", "&a&lClick to paste ID in chat input\n&7ID: &e" + dataId),
                        new TextComponent("&7(" + dataId + ")")
                    )
                    ChatLib.chat(copyMessage)
                } else {
                    sendMsg("&7Data ID: &cNot found in response")
                }
                
                sendMsg("&7Share this ID with others to let them download your data")
                self.loadAvailableData()
            } else {
                sendMsg("&cUpload failed: " + (response ? response.error : "Unknown server error"))
            }
        })
        .catch(function(error) {
            uploadInProgress = false
            endProgress()
            sendMsg("&cUpload failed: " + error.message)
        })

    } catch (e) {
        uploadInProgress = false
        endProgress()
        sendMsg("&cUpload error: " + e.message)
        return false
    }

    return true
}

DataSharingManager.prototype.downloadData = function(dataId, backup) {
    if (backup === undefined) backup = true
    
    if (downloadInProgress) {
        sendMsg("&cDownload already in progress!")
        return false
    }

    if (!dataId || dataId.trim().length === 0) {
        sendMsg("&cPlease provide a data ID!")
        return false
    }

    downloadInProgress = true
    startProgress("DOWNLOAD", "Requesting data from server...")

    var self = this
    
    if (backup) {
        updateProgress("Backing up current data...", 10)
        try {
            this.backupCurrentData()
        } catch (e) {
            sendMsg("&eWarning: Couldn't backup current data: " + e.message)
        }
    }

    updateProgress("Downloading from server...", 30);
    request({
        url: DOWNLOAD_ENDPOINT + "/" + dataId.trim(),
        method: "GET",
        headers: {
            "User-Agent": "BBG-DataSharing/0.3.5-Optimized"
        },
        json: true, // Expect JSON response
        timeout: 60000
    })
    .then(function(response) {
        try {
            // Expect response to be an object with a 'data' field containing the file content as a string
            if (!response || typeof response.data !== 'string') {
                downloadInProgress = false;
                endProgress();
                sendMsg("&cDownload failed: Invalid response from server (no data field)");
                return;
            }
            var dataContent = response.data;
            var parsedData = parseJSONSafely(dataContent);
            if (!parsedData) {
                downloadInProgress = false;
                endProgress();
                sendMsg("&cDownloaded data is invalid JSON!");
                return;
            }
            var sizeInMB = dataContent.length / 1024 / 1024;
            updateProgress("Processing downloaded data (" + Math.round(sizeInMB * 10)/10 + "MB)...", 60);
            if (sizeInMB > 5) {
                sendMsg("&eProcessing large file (" + Math.round(sizeInMB * 10)/10 + "MB)...");
                sendMsg("&eThis may take a moment to save...");
            }
            updateProgress("Saving to file...", 80);
            try {
                if (sizeInMB > 1) {
                    sendMsg("&7Saving large file - please wait...");
                }
                FileLib.write("byebyegoldor", "data/data.json", dataContent);
                updateProgress("Download completed!", 100);
                downloadInProgress = false;
                endProgress();
                sendMsg("&aSuccessfully downloaded and applied data from BBG Network! Do /CT RELOAD to apply changes.");
            } catch (e) {
                downloadInProgress = false;
                endProgress();
                sendMsg("&cFailed to save downloaded data: " + e.message);
            }
        } catch (e) {
            downloadInProgress = false;
            endProgress();
            sendMsg("&cDownload failed: " + e.message);
        }
    })
    .catch(function(error) {
        downloadInProgress = false;
        endProgress();
        sendMsg("&cDownload failed: " + error.message);
        sendMsg("&7Check your internet connection and try again");
    })

    return true
}

DataSharingManager.prototype.countPoints = function(dataObj) {
    var count = 0
    if (dataObj && dataObj.points) {
        for (var room in dataObj.points) {
            if (dataObj.points[room] && Array.isArray(dataObj.points[room])) {
                count += dataObj.points[room].length
            }
        }
    }
    return count
}

DataSharingManager.prototype.backupCurrentData = function() {
    try {
        var currentData = FileLib.read("byebyegoldor", "data/data.json")
        if (currentData) {
            var timestamp = new Date().toISOString().replace(/:/g, "-")
            var backupName = "data_backup_" + timestamp + ".json"
            FileLib.write("byebyegoldor", "data/backups/" + backupName, currentData)
            sendMsg("&7Current data backed up as: " + backupName)
        }
    } catch (e) {
        throw new Error("Backup failed: " + e.message)
    }
}

DataSharingManager.prototype.loadAvailableData = function() {
    // Implementation for loading available data list
}

DataSharingManager.prototype.getCategories = function() {
    sendMsg("&7Requesting categories from API...")
    
    request({
        url: API_BASE + "/data/categories",
        method: "GET",
        json: true,
        timeout: 30000
    })
    .then(function(response) {
        // Enhanced debugging for API response
        sendMsg("&7API Response received. Type: " + typeof response)
        
        // Handle string responses (likely HTML error pages)
        if (typeof response === "string") {
            if (response.indexOf("<") === 0 || response.indexOf("<!DOCTYPE") === 0) {
                sendMsg("&eAPI returned HTML error page - categories endpoint not available")
                sendMsg("&7Falling back to default categories...")
                showDefaultCategories()
                return
            }
            sendMsg("&eAPI returned unexpected string response")
            sendMsg("&7Response preview: " + response.substring(0, 100) + "...")
            showDefaultCategories()
            return
        }
        
        // Handle null/undefined responses
        if (!response) {
            sendMsg("&eAPI returned empty response - categories endpoint may not exist")
            showDefaultCategories()
            return
        }
        
        // Check for API success with categories
        if (response && response.success && response.categories) {
            sendMsg("&aSuccessfully loaded categories from API!")
            displayCategories(response.categories, true)
        } else {
            // Log what we actually received for debugging
            if (response.error) {
                sendMsg("&eAPI Error: " + response.error)
            } else {
                sendMsg("&eAPI response missing categories field")
                sendMsg("&7Response keys: " + Object.keys(response).join(", "))
            }
            sendMsg("&7Using default categories...")
            showDefaultCategories()
        }
    })
    .catch(function(error) {
        sendMsg("&eCategories endpoint not available: " + error.message)
        sendMsg("&7This is normal - the API doesn't support categories yet")
        sendMsg("&7Using default categories...")
        showDefaultCategories()
    })
    
    function showDefaultCategories() {
        var defaultCategories = [
            {name: "General", count: "?"},
            {name: "P3", count: "?"},
            {name: "P5", count: "?"},
            {name: "Speed", count: "?"},
            {name: "Consistency", count: "?"},
            {name: "Routes", count: "?"},
            {name: "Setup", count: "?"}
        ]
        displayCategories(defaultCategories, false)
    }
    
    function displayCategories(categories, fromAPI) {
        sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
        sendMsg("&d&l✦ Available Categories &8&l✦")
        if (!fromAPI) {
            sendMsg("&7&l(Default categories - API endpoint not available)")
        }
        sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
        sendMsg("")
        
        categories.forEach(function(category, index) {
            var count = category.count || "?"
            var categoryName = category.name || category
            
            sendMsg("&e" + (index + 1) + ". &d&l" + categoryName + " &7(" + count + " configs)")
            
            // Create clickable category button
            var categoryMessage = new Message(
                new TextComponent("   &a&l[📋 VIEW CATEGORY] ").setClick("suggest_command", "/bbgdata list " + categoryName).setHover("show_text", "&a&lClick to view configs in " + categoryName + "\n&7Command: &e/bbgdata list " + categoryName),
                new TextComponent("&7&l│ &e/bbgdata list " + categoryName)
            )
            ChatLib.chat(categoryMessage)
            sendMsg("")
        })
        
        sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
        sendMsg("&7Use &e/bbgdata list [category] &7to view configs in a specific category")
        sendMsg("&7Use &e/bbgdata list all &7to view all configs")
        sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
    }
}

// In listAvailableData, show version and last_changes if present
DataSharingManager.prototype.listAvailableData = function(category, page, callback) {
    if (!page) page = 1
    
    var url = LIST_ENDPOINT + "?page=" + page
    if (category && category !== "all") {
        url += "&category=" + encodeURIComponent(category)
        if (!callback) sendMsg("&7Searching for category: &e" + category)
    }
    
    if (!callback) sendMsg("&7Loading data from: &e" + url)

    request({
        url: url,
        method: "GET",        json: true,
        timeout: 30000
    })
    .then(function(response) {
        // Enhanced error handling for non-JSON responses
        if (typeof response === "string") {
            if (response.indexOf("<") === 0 || response.indexOf("<!DOCTYPE") === 0) {
                sendMsg("&cList failed: API server returned HTML error page")
                sendMsg("&7This usually means the API server is down or unreachable")
                sendMsg("&7Server URL: &e" + url)
                sendMsg("&7Please try again later")
                return
            }
            // Try to parse string as JSON
            try {
                response = JSON.parse(response)
            } catch (e) {
                sendMsg("&cList failed: Server returned invalid response")
                sendMsg("&7Response preview: &e" + response.substring(0, 100) + "...")
                return
            }
        }
        
        // Handle null or undefined response
        if (!response) {
            sendMsg("&cList failed: Server returned empty response")
            sendMsg("&7This may indicate server connectivity issues")
            return
        }
          if (response && response.success && response.data) {
            // Call callback if provided (for GUI)
            if (callback) {
                callback({
                    success: true,
                    files: response.data,
                    hasMore: response.hasMore,
                    page: page,
                    category: category
                })
                return
            }
            
            // Enhanced header with better formatting
            sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
            sendMsg("&d&l✦ BBG Data Network &8&l| &e&lPage " + page + " &8&l✦")
            if (category && category !== "all") {
                sendMsg("&7&l➤ Category: &e&l" + category.toUpperCase())
            }
            sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
              if (response.data.length === 0) {
                sendMsg("")
                if (category && category !== "all") {
                    sendMsg("&c&l❌ No data found in category: &e" + category.toUpperCase())
                    sendMsg("&7This category may be empty or doesn't exist.")
                    sendMsg("&7Use &e/bbgdata categories &7to see all available categories.")
                } else {
                    sendMsg("&c&l❌ No data found")
                    sendMsg("&7The database appears to be empty. Try uploading some data!")
                }
                sendMsg("")
                return
            }

            response.data.forEach(function(item, index) {
                var sizeText = item.dataSize ? " &8(" + Math.round(item.dataSize/1024/1024 * 10)/10 + "MB)" : ""
                var configNumber = "&8[&e" + (index + 1) + "&8]"
                var versionText = item.version ? ` &7| &bVersion: &a${item.version}` : ""
                var changesText = item.last_changes ? `\n&7&l├─ &eLast Changes: &f${item.last_changes}` : ""
                
                // Main config header with better spacing and colors
                sendMsg("")
                sendMsg("&8▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
                sendMsg(configNumber + " &f&l" + item.name + sizeText + versionText)
                sendMsg("&7&l├─ &eCreated by: &f" + item.uploaderName)
                sendMsg("&7&l├─ &eCategory: &d" + item.category + " &7&l| &ePoints: &a" + item.pointCount)
                sendMsg("&7&l├─ &eID: &6" + item.id)
                if (changesText) sendMsg(changesText);
                sendMsg("&7&l└─ &eDescription: &f" + item.description)
                  // Create enhanced clickable download command
                var downloadMessage = new Message(
                    new TextComponent("&a&l[⬇ DOWNLOAD] ").setClick("suggest_command", "/bbgdata download " + item.id).setHover("show_text", "&a&lClick to download this config!\n&7Command: &e/bbgdata download " + item.id + "\n\n&f" + item.description),
                    new TextComponent("&7&l│ &e/bbgdata download " + item.id)
                )
                ChatLib.chat(downloadMessage)
                
                // Add copy ID button
                var copyIdMessage = new Message(
                    new TextComponent("&e&l[📋 COPY ID] ").setClick("suggest_command", item.id).setHover("show_text", "&e&lClick to paste ID in chat input\n&7ID: &6" + item.id),
                    new TextComponent("&7&l│ &6" + item.id)
                )
                ChatLib.chat(copyIdMessage)
            })
            
            // Enhanced footer
            sendMsg("")
            sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")
            
            if (response.hasMore) {
                var nextPageCmd = "/bbgdata list " + (category && category !== "all" ? category + " " : "") + (page + 1)
                var nextPageMessage = new Message(
                    new TextComponent("&e&l[NEXT PAGE →] ").setClick("suggest_command", nextPageCmd).setHover("show_text", "&e&lClick for next page\n&7Command: &e" + nextPageCmd),
                    new TextComponent("&7Use &e" + nextPageCmd + " &7for more results")
                )
                ChatLib.chat(nextPageMessage)
            } else {
                sendMsg("&7&l✓ &aShowing all available results")
            }
            
            sendMsg("&8&l▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬")        } else {
            // Call callback with error if provided (for GUI)
            if (callback) {
                callback({
                    success: false,
                    error: response ? response.error : "Unknown error",
                    files: [],
                    hasMore: false,
                    page: page,
                    category: category
                })
                return
            }
            
            if (category && category !== "all") {
                sendMsg("&c&l❌ Failed to load data for category: &e" + category.toUpperCase())
                sendMsg("&7Error: " + (response ? response.error : "Unknown error"))
                sendMsg("&7Try using &e/bbgdata categories &7to see available categories")
            } else {
                sendMsg("&c&l❌ Failed to load data list: " + (response ? response.error : "Unknown error"))
                sendMsg("&7This may indicate API server issues or network problems")
            }
        }})    .catch(function(error) {
        // Call callback with error if provided (for GUI)
        if (callback) {
            callback({
                success: false,
                error: error.message,
                files: [],
                hasMore: false,
                page: page,
                category: category
            })
            return
        }
        
        if (category && category !== "all") {
            sendMsg("&cFailed to load data for category &e" + category + "&c: " + error.message)
            sendMsg("&7Check if the category exists with &e/bbgdata categories")
        } else {
            sendMsg("&cFailed to load data list: " + error.message)
        }
        sendMsg("&7Check your internet connection and try again later")
        sendMsg("&7If the problem persists, the API server may be down")
    })
}

// Create the manager instance
var dataManager = new DataSharingManager()

// Add progressData to the manager for GUI access
dataManager.progressData = progressData

// Register command with enhanced argument parsing
register("command", function() {
    var args = Array.prototype.slice.call(arguments)
    var parsed = parseQuotedArgs(args)
    var command = parsed[0] ? parsed[0].toLowerCase() : ""
      switch (command) {
        case "upload":
            if (parsed.length < 3) {
                sendMsg("&cUsage: /bbgdata upload \"name\" \"description\" [category]")
                sendMsg("&7Example: /bbgdata upload \"My Config\" \"Fast P5 setup\" \"Speed\"")
                return
            }
            var name = parsed[1]
            var description = parsed[2] 
            var category = parsed[3] || "General"
            dataManager.uploadData(name, description, category)
            break
            
        case "download":
            if (parsed.length < 2) {
                sendMsg("&cUsage: /bbgdata download <id> [backup]")
                return
            }
            var dataId = parsed[1]
            var backup = parsed[2] !== "false" && parsed[2] !== "no"
            dataManager.downloadData(dataId, backup)
            break
              case "list":
            var category = parsed[1] || "all"
            var page = parseInt(parsed[2]) || 1
            dataManager.listAvailableData(category, page)
            break
            
        case "categories":
            dataManager.getCategories()
            break
            
        case "backup":
            try {
                dataManager.backupCurrentData()
                sendMsg("&aCurrent data backed up successfully!")
            } catch (e) {
                sendMsg("&cBackup failed: " + e.message)
            }
            break
            
        case "status":
            if (progressData.active) {
                sendMsg("&7Current operation: &e" + progressData.type)
                sendMsg("&7Progress: &e" + Math.round(progressData.progress) + "%")
                sendMsg("&7Status: &e" + progressData.message)
                var elapsed = Math.round((Date.now() - progressData.startTime) / 1000)
                sendMsg("&7Elapsed: &e" + elapsed + "s")
            } else {
                sendMsg("&7No active operations")
            }
            break
              case "cancel":
            if (progressData.active) {
                progressData.active = false
                uploadInProgress = false
                downloadInProgress = false
                sendMsg("&eOperation cancelled")            } else {
                sendMsg("&7No active operations to cancel")
            }
            break
            
        case "delete":
            if (parsed.length < 3) {
                sendMsg("&cUsage: /bbgdata delete <id> <password>");
                return;
            }
            var delId = parsed[1];
            var delPassword = parsed[2];
            startProgress("DELETE", "Deleting config...");
            request({
                url: DOWNLOAD_ENDPOINT.replace("/download", "/delete/") + delId + "?password=" + encodeURIComponent(delPassword),
                method: "DELETE",
                headers: {
                    "User-Agent": "BBG-DataSharing/0.3.5-Optimized"
                },
                json: true,
                timeout: 30000
            })
            .then(function(response) {
                endProgress();
                if (response && response.success) {
                    sendMsg("&aConfig deleted successfully! ID: " + delId);
                } else {
                    sendMsg("&cDelete failed: " + (response && response.error ? response.error : "Unknown error"));
                }
            })
            .catch(function(error) {
                endProgress();
                sendMsg("&cDelete failed: " + error.message);
            });
            break
            
        case "token":
            if (parsed.length < 2) {
                sendMsg("&cUsage: /bbgdata token <id>");
                return;
            }
            var tokenId = parsed[1];
            startProgress("TOKEN", "Requesting update token...");
            request({
                url: DOWNLOAD_ENDPOINT.replace("/download", "/token/") + tokenId,
                method: "GET",
                headers: {
                    "User-Agent": "BBG-DataSharing/0.3.5-Optimized"
                },
                json: true,
                timeout: 30000
            })
            .then(function(response) {
                endProgress();
                if (response && response.success && response.token) {
                    var updateCmd = `/bbgdata update ${tokenId} \"Put your Changes in here\" ${response.token}`;
                    var tokenMsg = new Message(
                        new TextComponent("&a&l[📋 COPY UPDATE CMD] ")
                            .setClick("suggest_command", updateCmd)
                            .setHover("show_text", `&a&lClick to paste update command in chat input\n&7Command: &e${updateCmd}`)
                    );
                    ChatLib.chat(tokenMsg);
                    sendMsg("&7Use this command to update your config:");
                    sendMsg(`&e${updateCmd}`);
                } else {
                    sendMsg("&cToken request failed: " + (response && response.error ? response.error : "Unknown error"));
                }
            })
            .catch(function(error) {
                endProgress();
                sendMsg("&cToken request failed: " + error.message);
            });
            break;
        case "update":
            if (parsed.length < 4) {
                sendMsg("&cUsage: /bbgdata update <id> \"<changes>\" <token>");
                return;
            }
            var updateId = parsed[1];
            var updateChanges = parsed[2];
            var updateToken = parsed[3];
            var updateData = readLargeFile("data/data.json");
            if (!updateData) {
                sendMsg("&cCouldn't read data.json file for update!");
                return;
            }
            startProgress("UPDATE", "Updating config...");
            request({
                url: DOWNLOAD_ENDPOINT.replace("/download", "/update/") + updateId,
                method: "POST",
                headers: {
                    "User-Agent": "BBG-DataSharing/0.3.5-Optimized",
                    "Content-Type": "application/json"
                },
                body: {
                    changes: updateChanges,
                    token: updateToken,
                    data: updateData
                },
                json: true,
                timeout: 60000
            })
            .then(function(response) {
                endProgress();
                if (response && response.success) {
                    sendMsg("&aConfig updated successfully! New version: &e" + response.version);
                } else {
                    sendMsg("&cUpdate failed: " + (response && response.error ? response.error : "Unknown error"));
                }
            })
            .catch(function(error) {
                endProgress();
                sendMsg("&cUpdate failed: " + error.message);
            });
            break
        case "changelog":
            if (parsed.length < 2) {
                sendMsg("&cUsage: /bbgdata changelog <id>");
                return;
            }
            var changelogId = parsed[1];
            startProgress("CHANGELOG", "Fetching changelog...");
            request({
                url: DOWNLOAD_ENDPOINT.replace("/download", "/changelog/") + changelogId,
                method: "GET",
                headers: {
                    "User-Agent": "BBG-DataSharing/0.3.5-Optimized"
                },
                json: true,
                timeout: 30000
            })
            .then(function(response) {
                endProgress();
                if (response && response.success && Array.isArray(response.changelog)) {
                    if (response.changelog.length === 0) {
                        sendMsg("&eNo changelog entries found for this config.");
                        return;
                    }
                    sendMsg("&d&lChangelog for ID: &e" + changelogId);
                    response.changelog.forEach(function(entry, idx) {
                        var version = entry.version ? "&b[" + entry.version + "] " : "";
                        var date = entry.date ? "&7(" + entry.date.replace("T", " ").replace(/\..*$/, "") + ") " : "";
                        var changes = entry.changes ? entry.changes : "";
                        sendMsg(`&e${idx+1}. ${version}${date}&f${changes}`);
                    });
                } else {
                    sendMsg("&cFailed to fetch changelog: " + (response && response.error ? response.error : "Unknown error"));
                }
            })
            .catch(function(error) {
                endProgress();
                sendMsg("&cFailed to fetch changelog: " + error.message);
            });
            break;
            
        default:
            sendMsg("&d=== BBG Data Sharing Network ===")
            sendMsg("&d/bbgdata upload \"name\" \"description\" [category] &7- Upload your data.json")
            sendMsg("&d/bbgdata download <id> [backup] &7- Download data by ID")
            sendMsg("&d/bbgdata list [category] [page] &7- List available data")
            sendMsg("&d/bbgdata categories &7- Show all available categories")
            sendMsg("&d/bbgdata backup &7- Backup current data.json")
            sendMsg("&d/bbgdata status &7- Show current operation status")
            sendMsg("&d/bbgdata cancel &7- Cancel current operation")
            sendMsg("&7Use &e/bbgdata categories &7to see all available categories")
            sendMsg("&d/bbgdata token <id> &7- Gives you a one time token to update your upload")
            sendMsg("&d/bbgdata update <id> \"<changes>\" <token>  &7- Lets you update you upload. you need the \" \" for changes.")    
            sendMsg("&d/bbgdata Changelog <id> &7- Shows the changelog of a config")
        //    sendMsg("&d/bbgdata  &7- ")    
        //    sendMsg("&d/bbgdata  &7- ")                                       
            break
    }
}).setName("bbgdata")

export default dataManager
