import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchoolHolidayService } from './school-holiday.service';
import { SchoolHolidaysConfig } from '../models/types';

describe('SchoolHolidayService', () => {
  let service: SchoolHolidayService;
  let httpMock: HttpTestingController;

  const mockConfig: SchoolHolidaysConfig = {
    holidays: [
      { name: 'Vacances de Noël', start: '2025-12-20', end: '2026-01-05', zones: ['Zone A'] }
    ],
    siteAssociations: {
      'Lyon': 'Zone A'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SchoolHolidayService]
    });

    service = TestBed.inject(SchoolHolidayService);
    httpMock = TestBed.inject(HttpTestingController);

    // Respond to the initial configuration load request
    const req = httpMock.expectOne('assets/school-holidays.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config and set signal', () => {
    const config = service.config();
    expect(config).toEqual(mockConfig);
  });

  it('should get zone for site', () => {
    expect(service.getZoneForSite('Lyon')).toBe('Zone A');
    expect(service.getZoneForSite('Unknown')).toBeNull();
  });

  it('should identify holiday correctly in zone', () => {
    expect(service.isHolidayInZone('2025-12-25', 'Zone A')).toBe(true);
    expect(service.isHolidayInZone('2025-12-19', 'Zone A')).toBe(false);
  });

  it('should get holiday name in zone', () => {
    expect(service.getHolidayNameInZone('2025-12-25', 'Zone A')).toBe('Vacances de Noël');
    expect(service.getHolidayNameInZone('2025-12-19', 'Zone A')).toBeNull();
  });

  it('should identify holiday for site', () => {
    expect(service.isHolidayForSite('2025-12-25', 'Lyon')).toBe(true);
    expect(service.isHolidayForSite('2025-12-25', 'Unknown')).toBe(false);
  });
});
