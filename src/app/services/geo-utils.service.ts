import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeoUtilsService {
  private readonly EARTH_RADIUS_KM = 6371;

  constructor() { }

  calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const deltaLat = this.toRadians(lat2 - lat1);
    const deltaLon = this.toRadians(lon2 - lon1);
    
    const haversineA = this.calculateHaversineA(lat1, lat2, deltaLat, deltaLon);
    const centralAngle = this.calculateCentralAngle(haversineA);
    
    return this.EARTH_RADIUS_KM * centralAngle;
  }

  private calculateHaversineA(lat1: number, lat2: number, deltaLat: number, deltaLon: number): number {
    return Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
           Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
           Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  }

  private calculateCentralAngle(haversineA: number): number {
    return 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}