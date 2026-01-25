/**
 * Utility to detect mobile devices and handle mobile-specific features
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Also check screen size as a secondary indicator
  const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || (isSmallScreen && hasTouch);
}

export function requestDeviceOrientationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      // DeviceOrientationEvent not available
      resolve(false);
      return;
    }
    
    // Type assertion for iOS 13+ requestPermission API
    const DeviceOrientationEventAny = DeviceOrientationEvent as any;
    
    if (!DeviceOrientationEventAny.requestPermission) {
      // Not iOS 13+, permission not needed
      resolve(true);
      return;
    }
    
    DeviceOrientationEventAny.requestPermission()
      .then((response: string) => {
        resolve(response === 'granted');
      })
      .catch(() => {
        resolve(false);
      });
  });
}
