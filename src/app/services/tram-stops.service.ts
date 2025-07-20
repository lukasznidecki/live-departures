import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StopCacheService } from './stop-cache.service';

export interface TransportStop {
  stop_num: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  tram: boolean;
  bus: boolean;
  distance?: number;
  directions?: string[];
  loadingDirections?: boolean;
  expanded?: boolean;
  departures?: Departure[];
  loadingDepartures?: boolean;
}

export interface TramStop extends TransportStop {}

export interface StopTime {
  category: string;
  trip_headsign: string;
  route_short_name: string;
  stop_num: string;
  planned_departure_time: string;
  predicted_departure_timestamp?: number;
  trip_id: string;
  kmk_id: string;
}

export interface Departure {
  line: string;
  direction: string;
  vehicleNumber: string;
  departureTime: string;
  minutesUntilDeparture: number;
  departureTimestamp?: number;
}

export interface StopTimesResponse {
  current_stop_times: StopTime[];
}

export interface ApiResponse {
  stops: TransportStop[];
}

@Injectable({
  providedIn: 'root'
})
export class TramStopsService {
  private apiUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/stops';

  constructor(private http: HttpClient, private stopCacheService: StopCacheService) { }

  getStops(): Observable<TransportStop[]> {
    return this.stopCacheService.getStops();
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

  getStopTimes(stopName: string, stopNum: string, category: 'tram' | 'bus' = 'tram'): Observable<string[]> {
    const url = `${this.apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const directions = response.current_stop_times
            .filter(stopTime => stopTime.category === category && stopTime.stop_num === stopNum)
            .map(stopTime => stopTime.trip_headsign)
            .filter((direction, index, array) => array.indexOf(direction) === index);

          observer.next(directions);
          observer.complete();
        },
        error: (err) => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getDepartures(stopName: string, stopNum: string, category: 'tram' | 'bus' = 'tram'): Observable<Departure[]> {
    const url = `${this.apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const now = new Date();
          const currentTimestamp = Math.floor(now.getTime() / 1000);
          const maxTimestamp = currentTimestamp + (60 * 60);

          const departures = response.current_stop_times
            .filter(stopTime => stopTime.category === category && stopTime.stop_num === stopNum)
            .map(stopTime => {
              let departureTimestamp: number;
              let departureTime: string;
              
              if (stopTime.predicted_departure_timestamp) {
                departureTimestamp = stopTime.predicted_departure_timestamp;
                const predictedDate = new Date(departureTimestamp * 1000);
                departureTime = predictedDate.toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
              } else {
                const [hours, minutes] = stopTime.planned_departure_time.split(':').map(Number);
                const plannedDate = new Date(now);
                plannedDate.setHours(hours, minutes, 0, 0);
                
                if (plannedDate.getTime() < now.getTime()) {
                  plannedDate.setDate(plannedDate.getDate() + 1);
                }
                
                departureTimestamp = Math.floor(plannedDate.getTime() / 1000);
                departureTime = stopTime.planned_departure_time;
              }

              const minutesUntil = Math.round((departureTimestamp - currentTimestamp) / 60);

              return {
                line: stopTime.route_short_name,
                direction: stopTime.trip_headsign,
                vehicleNumber: stopTime.kmk_id,
                departureTime: departureTime,
                minutesUntilDeparture: minutesUntil,
                departureTimestamp: departureTimestamp
              };
            })
            .filter(departure => departure.departureTimestamp <= maxTimestamp && departure.minutesUntilDeparture >= 0)
            .sort((a, b) => a.minutesUntilDeparture - b.minutesUntilDeparture);

          observer.next(departures);
          observer.complete();
        },
        error: (err) => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getNearestStops(userLat: number, userLon: number, limit: number = 5, category: 'tram' | 'bus' = 'tram'): Observable<TransportStop[]> {
    return new Observable(observer => {
      this.stopCacheService.getStops().subscribe(stops => {
        const stopsWithDistance = stops.map(stop => ({
          ...stop,
          distance: this.calculateDistance(userLat, userLon, stop.stop_lat, stop.stop_lon)
        }));

        const nearestStops = stopsWithDistance
          .filter(stop => category === 'tram' ? stop.tram : stop.bus)
          .sort((a, b) => a.distance! - b.distance!)
          .slice(0, limit);

        observer.next(nearestStops);
        observer.complete();
      });
    });
  }
}
