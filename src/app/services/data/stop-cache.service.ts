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
  private readonly STORAGE_KEY = 'mpk_stops_cache';
  private readonly TIMESTAMP_KEY = 'mpk_stops_timestamp';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }

  loadStops(): Observable<TransportStop[]> {
    if (this.isLoaded && !this.shouldUpdateCache()) {
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
          this.saveToLocalStorage();
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


  private loadFromLocalStorage(): void {
    try {
      const cachedData = localStorage.getItem(this.STORAGE_KEY);
      const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      
      if (cachedData && timestamp && !this.shouldUpdateCache()) {
        this.stopsCache = JSON.parse(cachedData);
        this.isLoaded = true;
      }
    } catch (error) {
      console.warn('Failed to load stops from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stopsCache));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save stops to localStorage:', error);
    }
  }

  private shouldUpdateCache(): boolean {
    try {
      const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      if (!timestamp) return true;
      
      const lastUpdate = parseInt(timestamp, 10);
      const now = Date.now();
      return (now - lastUpdate) > this.CACHE_DURATION;
    } catch (error) {
      return true;
    }
  }
}