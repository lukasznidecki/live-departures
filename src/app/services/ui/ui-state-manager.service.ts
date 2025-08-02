import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  isLoadingLocation: boolean;
  loadingMessage: string;
}

export interface ErrorState {
  error: string | null;
}

export interface VehicleSelectionState {
  selectedVehicleId: string | null;
}


@Injectable({
  providedIn: 'root'
})
export class UiStateManagerService {
  private readonly loadingState$ = new BehaviorSubject<LoadingState>({
    isLoading: false,
    isLoadingLocation: false,
    loadingMessage: ''
  });

  private readonly errorState$ = new BehaviorSubject<ErrorState>({
    error: null
  });

  private readonly vehicleSelectionState$ = new BehaviorSubject<VehicleSelectionState>({
    selectedVehicleId: null
  });


  getLoadingState() {
    return this.loadingState$.asObservable();
  }

  getErrorState() {
    return this.errorState$.asObservable();
  }

  getVehicleSelectionState() {
    return this.vehicleSelectionState$.asObservable();
  }


  setLoadingState(state: Partial<LoadingState>): void {
    const currentState = this.loadingState$.value;
    this.loadingState$.next({ ...currentState, ...state });
  }

  setErrorState(error: string | null): void {
    this.errorState$.next({ error });
  }

  selectVehicle(vehicleId: string | null): void {
    this.vehicleSelectionState$.next({ selectedVehicleId: vehicleId });
  }

}