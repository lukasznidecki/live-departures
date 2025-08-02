import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ExtendedVehicleData } from './tram-stops.service';

@Injectable({
  providedIn: 'root'
})
export class ExtendedVehicleDataService {
  private readonly vehicleDatabase: Map<string, ExtendedVehicleData> = new Map();

  constructor() {
    this.initializeVehicleDatabase();
  }

  getExtendedVehicleData(modelName: string): Observable<ExtendedVehicleData | null> {
    const data = this.vehicleDatabase.get(modelName);
    return of(data || null);
  }

  private initializeVehicleDatabase(): void {
    // Solaris Urbino family
    this.vehicleDatabase.set('Solaris Urbino 12 IV', {
      model: 'Urbino 12 IV',
      manufacturer: 'Solaris Bus & Coach',
      category: 'bus',
      yearIntroduced: 2014,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 110,
      seatedCapacity: 39,
      doors: 3,
      engineType: 'Diesel',
      emissionStandard: 'Euro 6',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Nowoczesny autobus miejski o długości 12 metrów z silnikiem spełniającym normę Euro 6. Wyposażony w klimatyzację i przystosowany dla osób niepełnosprawnych.',
      imageUrl: 'https://example.com/solaris-urbino-12.jpg',
      technicalSpecs: {
        engine: 'Cummins ISL EEV 8.9l',
        power: '280 KM / 206 kW',
        transmission: 'Automatyczna Voith DIWA 854.5',
        fuel: 'Diesel',
        fuelConsumption: '32-38 l/100km'
      }
    });

    this.vehicleDatabase.set('Solaris Urbino 18 IV', {
      model: 'Urbino 18 IV',
      manufacturer: 'Solaris Bus & Coach',
      category: 'bus',
      yearIntroduced: 2014,
      length: 18.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 150,
      seatedCapacity: 47,
      doors: 4,
      engineType: 'Diesel',
      emissionStandard: 'Euro 6',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: true,
      description: 'Przegubowy autobus miejski Solaris Urbino 18 IV generacji. Pojazd o wysokiej pojemności pasażerskiej z nowoczesnym napędem Euro 6.',
      technicalSpecs: {
        engine: 'Cummins ISL EEV 8.9l',
        power: '320 KM / 235 kW',
        transmission: 'Automatyczna Voith DIWA 864.5',
        fuel: 'Diesel',
        fuelConsumption: '40-48 l/100km'
      }
    });

    this.vehicleDatabase.set('Solaris Urbino 18 hybrid', {
      model: 'Urbino 18 hybrid',
      manufacturer: 'Solaris Bus & Coach',
      category: 'bus',
      yearIntroduced: 2012,
      length: 18.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 150,
      seatedCapacity: 47,
      doors: 4,
      engineType: 'Diesel-Electric Hybrid',
      emissionStandard: 'Euro 5/EEV',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: true,
      description: 'Ekologiczny autobus hybrydowy łączący napęd diesla z silnikiem elektrycznym. Znacznie zmniejsza emisję spalin i zużycie paliwa.',
      technicalSpecs: {
        engine: 'Cummins ISL + silnik elektryczny',
        power: '240 KM + 120 kW elektryczny',
        transmission: 'Automatyczna hybrydowa',
        fuel: 'Diesel + energia elektryczna',
        fuelConsumption: '28-35 l/100km'
      }
    });

    this.vehicleDatabase.set('Solaris Urbino 12 mild hybrid', {
      model: 'Urbino 12 mild hybrid',
      manufacturer: 'Solaris Bus & Coach',
      category: 'bus',
      yearIntroduced: 2018,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 110,
      seatedCapacity: 39,
      doors: 3,
      engineType: 'Mild Hybrid',
      emissionStandard: 'Euro 6d',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Autobus z systemem mild hybrid wspomagającym silnik spalinowy dodatkowym motorem elektrycznym podczas rozruchu i hamowania.',
      technicalSpecs: {
        engine: 'Cummins L9 + asystent elektryczny',
        power: '280 KM + wspomaganie elektryczne',
        transmission: 'Automatyczna Allison T275',
        fuel: 'Diesel + rekuperacja energii',
        fuelConsumption: '30-36 l/100km'
      }
    });

    // Mercedes-Benz family
    this.vehicleDatabase.set('Mercedes-Benz O530 Citaro', {
      model: 'Citaro O530',
      manufacturer: 'Mercedes-Benz',
      category: 'bus',
      yearIntroduced: 2008,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 109,
      seatedCapacity: 37,
      doors: 3,
      engineType: 'Diesel',
      emissionStandard: 'Euro 5/EEV',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Jeden z najpopularniejszych autobusów miejskich w Europie. Niezawodny, komfortowy i ekonomiczny w eksploatacji.',
      technicalSpecs: {
        engine: 'Mercedes-Benz OM 906 hLA',
        power: '231 KM / 170 kW',
        transmission: 'Automatyczna Voith DIWA 854.5',
        fuel: 'Diesel',
        fuelConsumption: '34-40 l/100km'
      }
    });

    this.vehicleDatabase.set('Mercedes-Benz O530 Citaro C2', {
      model: 'Citaro C2',
      manufacturer: 'Mercedes-Benz',
      category: 'bus',
      yearIntroduced: 2018,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 110,
      seatedCapacity: 39,
      doors: 3,
      engineType: 'Mild Hybrid',
      emissionStandard: 'Euro 6d',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Najnowsza generacja Citaro z systemem mild hybrid. Wyposażony w superkondensatory wspomagające silnik podczas rozruchu.',
      technicalSpecs: {
        engine: 'Mercedes-Benz OM 936 + system EHPS',
        power: '220 KM + wspomaganie elektryczne',
        transmission: 'Automatyczna Allison T200R',
        fuel: 'Diesel + superkondensatory',
        fuelConsumption: '28-34 l/100km'
      }
    });

    // Autosan family
    this.vehicleDatabase.set('Autosan M09LE Sancity', {
      model: 'SanCity M09LE',
      manufacturer: 'Autosan',
      category: 'bus',
      yearIntroduced: 2009,
      length: 9.0,
      width: 2.3,
      height: 3.0,
      maxCapacity: 65,
      seatedCapacity: 26,
      doors: 2,
      engineType: 'Diesel',
      emissionStandard: 'Euro 4/5',
      accessibility: true,
      airConditioning: false,
      lowFloor: true,
      articulated: false,
      description: 'Kompaktowy autobus midi polskiej produkcji. Idealny do obsługi linii o mniejszym natężeniu ruchu i węższych ulic.',
      technicalSpecs: {
        engine: 'Iveco Tector F4AE3481C',
        power: '150 KM / 110 kW',
        transmission: 'Mechaniczna ZF 6S-850',
        fuel: 'Diesel',
        fuelConsumption: '22-28 l/100km'
      }
    });

    // Volvo family
    this.vehicleDatabase.set('Volvo 7900 Hybrid', {
      model: '7900 Hybrid',
      manufacturer: 'Volvo Buses',
      category: 'bus',
      yearIntroduced: 2013,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 105,
      seatedCapacity: 37,
      doors: 3,
      engineType: 'Diesel-Electric Hybrid',
      emissionStandard: 'Euro 6',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Zaawansowany autobus hybrydowy Volvo z systemem równoległego napędu diesel-elektrycznego. Bardzo cichy i ekonomiczny.',
      technicalSpecs: {
        engine: 'Volvo D5K + silnik elektryczny',
        power: '210 KM + 150 kW elektryczny',
        transmission: 'I-SAM hybrydowa',
        fuel: 'Diesel + energia elektryczna',
        fuelConsumption: '25-32 l/100km'
      }
    });

    // Irizar
    this.vehicleDatabase.set('Irizar ie bus 12', {
      model: 'ie bus 12',
      manufacturer: 'Irizar',
      category: 'bus',
      yearIntroduced: 2020,
      length: 12.0,
      width: 2.55,
      height: 3.4,
      maxCapacity: 85,
      seatedCapacity: 35,
      doors: 3,
      engineType: 'Electric',
      emissionStandard: 'Zero Emission',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'W pełni elektryczny autobus miejski o zerowej emisji spalin. Wyposażony w nowoczesne baterie litowo-jonowe.',
      technicalSpecs: {
        engine: 'Silnik elektryczny asynchroniczny',
        power: '160 kW / 218 KM',
        transmission: 'Bezpośredni napęd elektryczny',
        fuel: 'Energia elektryczna',
        fuelConsumption: '80-120 kWh/100km'
      }
    });

    // Karsan
    this.vehicleDatabase.set('Karsan Jest', {
      model: 'Jest',
      manufacturer: 'Karsan',
      category: 'minibus',
      yearIntroduced: 2018,
      length: 6.0,
      width: 2.07,
      height: 2.65,
      maxCapacity: 22,
      seatedCapacity: 15,
      doors: 1,
      engineType: 'Diesel',
      emissionStandard: 'Euro 6',
      accessibility: true,
      airConditioning: true,
      lowFloor: true,
      articulated: false,
      description: 'Kompaktowy minibus turecki produkcji. Doskonały do obsługi linii podmiejskich i obszarów o ograniczonej dostępności.',
      technicalSpecs: {
        engine: 'Iveco F1C',
        power: '140 KM / 103 kW',
        transmission: 'Automatyczna Allison 1000',
        fuel: 'Diesel',
        fuelConsumption: '18-24 l/100km'
      }
    });
  }
}