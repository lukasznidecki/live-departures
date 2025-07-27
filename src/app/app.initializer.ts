import { Injectable } from '@angular/core';
import { StopCacheService } from './services/data/stop-cache.service';

@Injectable()
export class AppInitializer {
  constructor(private stopCacheService: StopCacheService) {}

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopCacheService.loadStops().subscribe({
        next: () => {
          resolve();
        },
        error: (error) => {
          console.error('Failed to load stops at startup:', error);
          resolve();
        }
      });
    });
  }
}

export function initializeApp(appInitializer: AppInitializer): () => Promise<void> {
  return () => appInitializer.init();
}