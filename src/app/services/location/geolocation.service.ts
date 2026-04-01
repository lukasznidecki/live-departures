import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const LOCATION_CACHE_KEY = 'lastKnownLocation';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const SIGNIFICANT_DISTANCE_M = 200;

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor() { }

  getCurrentPosition(): Observable<LocationData> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocation is not supported by this browser.');
        return;
      }

      const cached = this.getCachedLocation();
      let lastEmitted: LocationData | null = null;
      let completedCount = 0;
      const totalRequests = 2;

      if (cached) {
        lastEmitted = cached;
        observer.next(cached);
      }

      const emitIfBetter = (locationData: LocationData) => {
        this.cacheLocation(locationData);
        if (!lastEmitted || this.isSignificantlyDifferent(lastEmitted, locationData) || locationData.accuracy < lastEmitted.accuracy) {
          lastEmitted = locationData;
          observer.next(locationData);
        }
      };

      const onComplete = () => {
        completedCount++;
        if (completedCount >= totalRequests) {
          if (!lastEmitted) {
            observer.error('Could not determine location.');
          } else {
            observer.complete();
          }
        }
      };

      const toLocationData = (position: GeolocationPosition): LocationData => ({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });

      // Fast: low-accuracy request (uses cell/wifi, responds quickly)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          emitIfBetter(toLocationData(position));
          onComplete();
        },
        () => onComplete(),
        {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 300000
        }
      );

      // Precise: high-accuracy request (GPS, may take longer)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          emitIfBetter(toLocationData(position));
          onComplete();
        },
        () => onComplete(),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    });
  }

  private getCachedLocation(): LocationData | null {
    try {
      const raw = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() - entry.timestamp > CACHE_MAX_AGE_MS) {
        localStorage.removeItem(LOCATION_CACHE_KEY);
        return null;
      }
      return entry.location as LocationData;
    } catch {
      return null;
    }
  }

  private cacheLocation(location: LocationData): void {
    try {
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
        location,
        timestamp: Date.now()
      }));
    } catch { /* quota exceeded – ignore */ }
  }

  private isSignificantlyDifferent(a: LocationData, b: LocationData): boolean {
    const R = 6371000;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const lat1 = a.latitude * Math.PI / 180;
    const lat2 = b.latitude * Math.PI / 180;
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
    const distance = 2 * R * Math.asin(Math.sqrt(h));
    return distance > SIGNIFICANT_DISTANCE_M;
  }

}
