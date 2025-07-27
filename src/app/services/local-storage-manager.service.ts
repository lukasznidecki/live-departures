import { Injectable } from '@angular/core';
import { TransportStop } from './tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageManagerService {
  private readonly STORAGE_KEY = 'mpk_stops_cache';
  private readonly TIMESTAMP_KEY = 'mpk_stops_timestamp';
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  saveStopsToStorage(stops: TransportStop[]): void {
    try {
      this.setStorageItem(this.STORAGE_KEY, JSON.stringify(stops));
      this.setStorageItem(this.TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save stops to localStorage:', error);
    }
  }

  loadStopsFromStorage(): TransportStop[] | null {
    try {
      const cachedData = this.getStorageItem(this.STORAGE_KEY);
      const timestamp = this.getStorageItem(this.TIMESTAMP_KEY);
      
      if (cachedData && timestamp && !this.isCacheExpired()) {
        return JSON.parse(cachedData);
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load stops from localStorage:', error);
      return null;
    }
  }

  isCacheExpired(): boolean {
    try {
      const timestamp = this.getCacheTimestamp();
      return !timestamp || this.isTimestampExpired(timestamp);
    } catch (error) {
      return true;
    }
  }

  private setStorageItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  private getStorageItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  private getCacheTimestamp(): number | null {
    const timestamp = this.getStorageItem(this.TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  private isTimestampExpired(timestamp: number): boolean {
    const now = Date.now();
    return (now - timestamp) > this.CACHE_DURATION_MS;
  }
}