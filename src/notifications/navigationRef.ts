import { createNavigationContainerRef } from '@react-navigation/native';

// Generic any route ref for simple usage
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    // @ts-ignore simplifying generic usage
    navigationRef.navigate(name, params);
  }
}
