import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

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

      let resolved = false;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            observer.next(locationData);
            observer.complete();
          }
        },
        (error) => {
          if (!resolved) {
            this.tryLowAccuracy(observer);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );

      setTimeout(() => {
        if (!resolved) {
          this.tryLowAccuracy(observer);
        }
      }, 4000);
    });
  }

  private tryLowAccuracy(observer: any): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        observer.next(locationData);
        observer.complete();
      },
      (error) => {
        observer.error(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

}
