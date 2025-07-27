import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LoadingState {
  isLoading: boolean;
  isLoadingLocation: boolean;
  loadingMessage: string;
}

export interface ErrorState {
  error: string | null;
}

export interface TabState {
  activeTab: 'tram' | 'bus' | 'map';
  transportTab: 'tram' | 'bus';
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

  private readonly tabState$ = new BehaviorSubject<TabState>({
    activeTab: 'tram',
    transportTab: 'tram'
  });

  getLoadingState() {
    return this.loadingState$.asObservable();
  }

  getErrorState() {
    return this.errorState$.asObservable().pipe(
      map(state => state.error)
    );
  }

  get tabState() {
    return this.tabState$.asObservable();
  }

  setLoadingState(state: Partial<LoadingState>): void {
    const currentState = this.loadingState$.value;
    this.loadingState$.next({ ...currentState, ...state });
  }

  setErrorState(error: string | null): void {
    this.errorState$.next({ error });
  }

  setActiveTab(tab: 'tram' | 'bus' | 'map'): void {
    const currentState = this.tabState$.value;
    const newState = { ...currentState, activeTab: tab };
    
    if (tab !== 'map') {
      newState.transportTab = tab;
    }
    
    this.tabState$.next(newState);
  }

  setTransportTab(tab: 'tram' | 'bus'): void {
    const currentState = this.tabState$.value;
    this.tabState$.next({ ...currentState, transportTab: tab });
  }
}