import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TramStop {
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
}

export interface StopTimesResponse {
  current_stop_times: StopTime[];
}

export interface ApiResponse {
  stops: TramStop[];
}

@Injectable({
  providedIn: 'root'
})
export class TramStopsService {
  private apiUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/stops';

  constructor(private http: HttpClient) { }

  getStops(): Observable<TramStop[]> {
    return new Observable(observer => {
      this.http.get<ApiResponse>(this.apiUrl).subscribe(response => {
        observer.next(response.stops);
        observer.complete();
      });
    });
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

  getStopTimes(stopName: string, stopNum: string): Observable<string[]> {
    const url = `${this.apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const tramDirections = response.current_stop_times
            .filter(stopTime => stopTime.category === 'tram' && stopTime.stop_num === stopNum)
            .map(stopTime => stopTime.trip_headsign)
            .filter((direction, index, array) => array.indexOf(direction) === index);
          
          observer.next(tramDirections);
          observer.complete();
        },
        error: (err) => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getDepartures(stopName: string, stopNum: string): Observable<Departure[]> {
    const url = `${this.apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const tramDepartures = response.current_stop_times
            .filter(stopTime => stopTime.category === 'tram' && stopTime.stop_num === stopNum)
            .map(stopTime => ({
              line: stopTime.route_short_name,
              direction: stopTime.trip_headsign,
              vehicleNumber: stopTime.kmk_id,
              departureTime: stopTime.planned_departure_time
            }))
            .sort((a, b) => a.departureTime.localeCompare(b.departureTime));
          
          observer.next(tramDepartures);
          observer.complete();
        },
        error: (err) => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getNearestStops(userLat: number, userLon: number, limit: number = 5): Observable<TramStop[]> {
    return new Observable(observer => {
      this.getStops().subscribe(stops => {
        const stopsWithDistance = stops.map(stop => ({
          ...stop,
          distance: this.calculateDistance(userLat, userLon, stop.stop_lat, stop.stop_lon)
        }));

        const nearestStops = stopsWithDistance
          .filter(stop => stop.tram)
          .sort((a, b) => a.distance! - b.distance!)
          .slice(0, limit);

        observer.next(nearestStops);
        observer.complete();
      });
    });
  }
}
