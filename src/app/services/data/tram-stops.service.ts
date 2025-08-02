import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StopCacheService } from './stop-cache.service';
import { GeoUtilsService } from '../location/geo-utils.service';

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
  collapsing?: boolean;
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
  minutesUntilDeparture: number;
  departureTimestamp?: number;
}

export interface StopTimesResponse {
  current_stop_times: StopTime[];
}

export interface Vehicle {
  kmk_id: string;
  ttss_vehicle_id: string;
  route_short_name: string;
  category: string;
  latitude: number;
  longitude: number;
  bearing: number;
  trip_headsign: string;
  service_id: string;
  timestamp: number;
  source: string;
  shift?: string;
  stop_name?: string;
}

export interface VehicleInfo {
  category: string;
  floor: string;
  full_kmk_id: string;
  full_model_name: string;
  kmk_id: string;
  short_model_name: string;
}

export interface VehicleInfoResponse {
  vehicles: VehicleInfo[];
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
}

export interface ApiResponse {
  stops: TransportStop[];
}

@Injectable({
  providedIn: 'root'
})
export class TransportStopsService {
  private readonly apiUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/stops';
  private readonly vehiclesUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/vehicles/active/ttss';
  private readonly vehicleInfoUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/vehicles';

  constructor(
    private http: HttpClient,
    private stopCacheService: StopCacheService,
    private geoUtilsService: GeoUtilsService
  ) { }

  getStops(): Observable<TransportStop[]> {
    return this.stopCacheService.getStops();
  }

  getActiveVehicles(): Observable<Vehicle[]> {
    return this.http.get<VehiclesResponse>(this.vehiclesUrl).pipe(
      map(response => response.vehicles)
    );
  }

  getVehicleInfo(): Observable<VehicleInfo[]> {
    return this.http.get<VehicleInfoResponse>(this.vehicleInfoUrl).pipe(
      map(response => response.vehicles)
    );
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

  getNearestStops(userLatitude: number, userLongitude: number, maxStops: number = 5, transportType: 'tram' | 'bus' = 'tram'): Observable<TransportStop[]> {
    return new Observable(observer => {
      this.stopCacheService.getStops().subscribe(stops => {
        const stopsWithDistance = stops.map(stop => ({
          ...stop,
          distance: this.calculateDistanceFromUser(userLatitude, userLongitude, stop)
        }));

        const nearestStops = stopsWithDistance
          .filter(stop => transportType === 'tram' ? stop.tram : stop.bus)
          .sort((a, b) => a.distance! - b.distance!)
          .slice(0, maxStops);

        observer.next(nearestStops);
        observer.complete();
      });
    });
  }

  private calculateDistanceFromUser(userLatitude: number, userLongitude: number, stop: TransportStop): number {
    return this.geoUtilsService.calculateDistanceInKm(userLatitude, userLongitude, stop.stop_lat, stop.stop_lon);
  }
}
