// Advanced logging service for Pathfind application

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
  stack?: string
}

interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableStorage: boolean
  maxStorageEntries: number
  enableRemoteLogging: boolean
  remoteEndpoint?: string
  enablePerformanceLogging: boolean
}

class Logger {
  private config: LoggerConfig
  private storageKey = 'pathfind_logs'
  private sessionId: string

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: process.env.NODE_ENV === 'development',
      maxStorageEntries: 1000,
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      enablePerformanceLogging: true,
      ...config
    }
    
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      },
      ...(error && { stack: error.stack })
    }
  }

  private getCurrentUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined
    try {
      return localStorage.getItem('userId') || undefined
    } catch {
      return undefined
    }
  }

  private formatConsoleOutput(entry: LogEntry): any[] {
    const levelColors = {
      [LogLevel.DEBUG]: 'color: #888',
      [LogLevel.INFO]: 'color: #0066cc',
      [LogLevel.WARN]: 'color: #ff9900',
      [LogLevel.ERROR]: 'color: #cc0000',
      [LogLevel.FATAL]: 'color: #ff0000; font-weight: bold'
    }

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.FATAL]: 'FATAL'
    }

    const prefix = `%c[${levelNames[entry.level]}]`
    const contextStr = entry.context ? ` [${entry.context}]` : ''
    const message = `${prefix}${contextStr} ${entry.message}`

    const output = [message, levelColors[entry.level]]
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output.push('\n📋 Metadata:', entry.metadata)
    }
    
    if (entry.stack) {
      output.push('\n📚 Stack:', entry.stack)
    }

    return output
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const output = this.formatConsoleOutput(entry)
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...output)
        break
      case LogLevel.INFO:
        console.info(...output)
        break
      case LogLevel.WARN:
        console.warn(...output)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(...output)
        break
    }
  }

  private writeToStorage(entry: LogEntry): void {
    if (!this.config.enableStorage || typeof window === 'undefined') return

    try {
      const existingLogs = this.getStoredLogs()
      const updatedLogs = [entry, ...existingLogs].slice(0, this.config.maxStorageEntries)
      localStorage.setItem(this.storageKey, JSON.stringify(updatedLogs))
    } catch (error) {
      console.warn('Failed to store log entry:', error)
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemoteLogging || !this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: [entry],
          app: 'pathfind',
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
        })
      })
    } catch (error) {
      console.warn('Failed to send log to remote service:', error)
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, message, context, metadata, error)

    this.writeToConsole(entry)
    this.writeToStorage(entry)
    
    // Send to remote asynchronously (don't wait)
    if (this.config.enableRemoteLogging) {
      this.sendToRemote(entry).catch(() => {
        // Silently fail remote logging to avoid infinite loops
      })
    }
  }

  // Public logging methods
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata)
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata)
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata)
  }

  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata, error)
  }

  fatal(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, metadata, error)
  }

  // Specialized logging methods
  apiCall(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    error?: Error
  ): void {
    const metadata = {
      method,
      url,
      statusCode,
      duration
    }

    if (error) {
      this.error(`API call failed: ${method} ${url}`, error, 'api', metadata)
    } else {
      this.info(`API call: ${method} ${url}`, 'api', metadata)
    }
  }

  userAction(action: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'user', metadata)
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.config.enablePerformanceLogging) return

    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO
    this.log(
      level,
      `Performance: ${operation} took ${duration}ms`,
      'performance',
      { ...metadata, duration, operation }
    )
  }

  navigation(from: string, to: string, metadata?: Record<string, any>): void {
    this.info(`Navigation: ${from} → ${to}`, 'navigation', { ...metadata, from, to })
  }

  // Utility methods
  getStoredLogs(): LogEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const logs = localStorage.getItem(this.storageKey)
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  clearStoredLogs(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.warn('Failed to clear stored logs:', error)
    }
  }

  exportLogs(): string {
    const logs = this.getStoredLogs()
    return JSON.stringify(logs, null, 2)
  }

  getLogStats(): {
    totalEntries: number
    entriesByLevel: Record<string, number>
    oldestEntry?: string
    newestEntry?: string
  } {
    const logs = this.getStoredLogs()
    const entriesByLevel: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      FATAL: 0
    }

    logs.forEach(log => {
      const levelName = LogLevel[log.level] || 'UNKNOWN'
      entriesByLevel[levelName] = (entriesByLevel[levelName] || 0) + 1
    })

    return {
      totalEntries: logs.length,
      entriesByLevel,
      oldestEntry: logs[logs.length - 1]?.timestamp,
      newestEntry: logs[0]?.timestamp
    }
  }
}

// Performance timing utility
export class PerformanceTimer {
  private startTime: number
  private operation: string
  private logger: Logger

  constructor(operation: string, logger: Logger) {
    this.operation = operation
    this.logger = logger
    this.startTime = performance.now()
  }

  end(metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime
    this.logger.performance(this.operation, duration, metadata)
    return duration
  }
}

// Hook for React components
export function useLogger() {
  return logger
}

// Performance measurement decorator
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(`${target.constructor.name}.${propertyName}`, logger)
      
      try {
        const result = await method.apply(this, args)
        timer.end({ operation: `${operation || propertyName}`, success: true })
        return result
      } catch (error) {
        timer.end({ operation: `${operation || propertyName}`, success: false, error: error.message })
        throw error
      }
    }

    return descriptor
  }
}

// Create singleton logger instance
const logger = new Logger({
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT
})

export { logger }
export default logger

// Auto-capture unhandled errors and rejections
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error(
      `Unhandled error: ${event.message}`,
      event.error,
      'global',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error(
      `Unhandled promise rejection: ${event.reason}`,
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'global'
    )
  })
}

// Capture Next.js router events if available
if (typeof window !== 'undefined') {
  // This will be set up when Next.js router is available
  let currentPath = ''
  
  const captureNavigation = () => {
    const newPath = window.location.pathname
    if (currentPath && currentPath !== newPath) {
      logger.navigation(currentPath, newPath)
    }
    currentPath = newPath
  }

  // Initial capture
  captureNavigation()
  
  // Listen for navigation changes
  window.addEventListener('popstate', captureNavigation)
  
  // Monkey patch pushState and replaceState to capture programmatic navigation
  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState
  
  window.history.pushState = function(...args) {
    originalPushState.apply(this, args)
    setTimeout(captureNavigation, 0)
  }
  
  window.history.replaceState = function(...args) {
    originalReplaceState.apply(this, args)
    setTimeout(captureNavigation, 0)
  }
}