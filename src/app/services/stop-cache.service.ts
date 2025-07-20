import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { TransportStop, ApiResponse } from './tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class StopCacheService {
  private apiUrl = 'https://mpk-gtfs-proxy.lnidecki.workers.dev/api/stops';
  private stopsCache: TransportStop[] = [];
  private isLoaded = false;
  private loadingSubject = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  loadStops(): Observable<TransportStop[]> {
    if (this.isLoaded) {
      return of(this.stopsCache);
    }

    if (this.loadingSubject.value) {
      return new Observable(observer => {
        const subscription = this.loadingSubject.subscribe(loading => {
          if (!loading && this.isLoaded) {
            observer.next(this.stopsCache);
            observer.complete();
            subscription.unsubscribe();
          }
        });
      });
    }

    this.loadingSubject.next(true);

    return new Observable(observer => {
      this.http.get<ApiResponse>(this.apiUrl).subscribe({
        next: (response) => {
          this.stopsCache = response.stops;
          this.isLoaded = true;
          this.loadingSubject.next(false);
          observer.next(this.stopsCache);
          observer.complete();
        },
        error: (error) => {
          this.loadingSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  getStops(): Observable<TransportStop[]> {
    if (this.isLoaded) {
      return of(this.stopsCache);
    }
    return this.loadStops();
  }

  isStopsLoaded(): boolean {
    return this.isLoaded;
  }
}