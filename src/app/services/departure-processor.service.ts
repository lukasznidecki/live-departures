import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StopTime, Departure, StopTimesResponse } from './tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class DepartureProcessorService {
  private readonly MAX_HOURS_AHEAD = 1;

  constructor(private http: HttpClient) {}

  getStopDirections(apiUrl: string, stopName: string, stopNum: string, category: 'tram' | 'bus'): Observable<string[]> {
    const url = `${apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const directions = this.extractDirectionsFromResponse(response, stopNum, category);
          observer.next(directions);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getDeparturesList(apiUrl: string, stopName: string, stopNum: string, category: 'tram' | 'bus'): Observable<Departure[]> {
    const url = `${apiUrl}/${encodeURIComponent(stopName)}/current_stop_times`;
    
    return new Observable(observer => {
      this.http.get<StopTimesResponse>(url).subscribe({
        next: (response) => {
          const departures = this.processDeparturesFromResponse(response, stopNum, category);
          observer.next(departures);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  private extractDirectionsFromResponse(response: StopTimesResponse, stopNum: string, category: 'tram' | 'bus'): string[] {
    return response.current_stop_times
      .filter(stopTime => this.isMatchingStopTime(stopTime, stopNum, category))
      .map(stopTime => stopTime.trip_headsign)
      .filter(this.getUniqueDirections());
  }

  private processDeparturesFromResponse(response: StopTimesResponse, stopNum: string, category: 'tram' | 'bus'): Departure[] {
    const now = new Date();
    const currentTimestamp = Math.floor(now.getTime() / 1000);
    const maxTimestamp = currentTimestamp + (60 * 60 * this.MAX_HOURS_AHEAD);

    return response.current_stop_times
      .filter(stopTime => this.isMatchingStopTime(stopTime, stopNum, category))
      .map(stopTime => this.createDepartureFromStopTime(stopTime, now, currentTimestamp))
      .filter(departure => this.isValidDeparture(departure, maxTimestamp))
      .sort(this.sortByDepartureTime());
  }

  private isMatchingStopTime(stopTime: StopTime, stopNum: string, category: 'tram' | 'bus'): boolean {
    return stopTime.category === category && stopTime.stop_num === stopNum;
  }

  private getUniqueDirections() {
    return (direction: string, index: number, array: string[]) => 
      array.indexOf(direction) === index;
  }

  private createDepartureFromStopTime(stopTime: StopTime, now: Date, currentTimestamp: number): Departure {
    const { departureTimestamp, departureTime } = this.calculateDepartureTime(stopTime, now);
    const minutesUntil = Math.round((departureTimestamp - currentTimestamp) / 60);

    return {
      line: stopTime.route_short_name,
      direction: stopTime.trip_headsign,
      vehicleNumber: stopTime.kmk_id,
      departureTime: departureTime,
      minutesUntilDeparture: minutesUntil,
      departureTimestamp: departureTimestamp
    };
  }

  private calculateDepartureTime(stopTime: StopTime, now: Date): { departureTimestamp: number; departureTime: string } {
    if (stopTime.predicted_departure_timestamp) {
      return this.getPredictedDepartureTime(stopTime.predicted_departure_timestamp);
    } else {
      return this.getPlannedDepartureTime(stopTime.planned_departure_time, now);
    }
  }

  private getPredictedDepartureTime(predictedTimestamp: number): { departureTimestamp: number; departureTime: string } {
    const predictedDate = new Date(predictedTimestamp * 1000);
    const departureTime = predictedDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return {
      departureTimestamp: predictedTimestamp,
      departureTime: departureTime
    };
  }

  private getPlannedDepartureTime(plannedTime: string, now: Date): { departureTimestamp: number; departureTime: string } {
    const [hours, minutes] = plannedTime.split(':').map(Number);
    const plannedDate = new Date(now);
    plannedDate.setHours(hours, minutes, 0, 0);
    
    if (plannedDate.getTime() < now.getTime()) {
      plannedDate.setDate(plannedDate.getDate() + 1);
    }
    
    return {
      departureTimestamp: Math.floor(plannedDate.getTime() / 1000),
      departureTime: plannedTime
    };
  }

  private isValidDeparture(departure: Departure, maxTimestamp: number): boolean {
    return departure.departureTimestamp !== undefined && 
           departure.departureTimestamp <= maxTimestamp && 
           departure.minutesUntilDeparture >= 0;
  }

  private sortByDepartureTime() {
    return (a: Departure, b: Departure) => a.minutesUntilDeparture - b.minutesUntilDeparture;
  }
}