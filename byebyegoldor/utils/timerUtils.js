class timerUtils {
    constructor() {
        this.startTime = Date.now();
    }

    /**
     * Returns if the specified time has passed
    */
    hasReached(time) {
        if (Date.now() - this.startTime > time) return true
        return false
    }

    /**
     * Returns how long its been since the timer started
    */
    getTimePassed() {
        return Date.now() - this.startTime
    }

    /**
     * Resets the timer
    */
    reset() {
        this.startTime = Date.now();
    }
}

export default timerUtils;