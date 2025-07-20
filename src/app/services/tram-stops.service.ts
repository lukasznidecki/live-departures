import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TramStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TramStopsService {
  private apiUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/stops';

  constructor(private http: HttpClient) { }

  getStops(): Observable<TramStop[]> {
    return this.http.get<TramStop[]>(this.apiUrl);
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degree: number): number {
    return degree * (Math.PI / 180);
  }

  getNearestStops(userLat: number, userLon: number, limit: number = 5): Observable<TramStop[]> {
    return new Observable(observer => {
      this.getStops().subscribe(stops => {
        const stopsWithDistance = stops.map(stop => ({
          ...stop,
          distance: this.calculateDistance(userLat, userLon, stop.lat, stop.lon)
        }));

        const nearestStops = stopsWithDistance
          .sort((a, b) => a.distance! - b.distance!)
          .slice(0, limit);

        observer.next(nearestStops);
        observer.complete();
      });
    });
  }
}
