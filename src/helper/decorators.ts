export type AnyFn = (...args: any[]) => any

/**
 * debounce 装饰器工厂
 * 用法:
 *   @debounce(500)
 *   onClick() { ... }
 *
 * 注意：建议在组件的 onDestroy 中调用 clearDebounces(this) 清理定时器。
 */
export function debounce(wait = 300) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as AnyFn
    const timerKey = `__debounce_timer__${propertyKey}`
    const pendingKey = `__debounce_pending__${propertyKey}`

    descriptor.value = function (...args: any[]) {
      // 确保对象上有容器
      if (!this.__debounceTimers) this.__debounceTimers = {}
      // 清除旧定时器
      if (this.__debounceTimers[timerKey]) {
        clearTimeout(this.__debounceTimers[timerKey])
      }
      // 设置新定时器
      this.__debounceTimers[timerKey] = setTimeout(() => {
        // 执行原函数
        original.apply(this, args)
        delete this.__debounceTimers[timerKey]
      }, wait) as any
      // 标记有待处理（可用于外部检查）
      this.__debounceTimers[pendingKey] = true
    }

    return descriptor
  }
}

/**
 * 清理装饰器创建的所有计时器（在组件 onDestroy 中调用）
 */
export function clearDebounces(instance: any) {
  if (!instance || !instance.__debounceTimers) return
  const keys = Object.keys(instance.__debounceTimers)
  for (const k of keys) {
    const v = instance.__debounceTimers[k]
    if (typeof v === 'number' || v instanceof Number) {
      clearTimeout(v as any)
    }
    delete instance.__debounceTimers[k]
  }
}

// safer per-instance throttle decorator
export function throttle(wait = 300) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: any[]) => any

    descriptor.value = function (...args: any[]) {
      const key = `__throttle_lastcall__${propertyKey}`
      const now = performance.now()
      if (!this[key]) this[key] = 0
      if (now - this[key] >= wait) {
        this[key] = now
        return original.apply(this, args)
      }
    }

    return descriptor
  }
}
