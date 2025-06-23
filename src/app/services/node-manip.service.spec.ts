import { TestBed } from '@angular/core/testing';

import { MainServService } from './main-serv.service';



describe('MainServService', () => {
  let service: MainServService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MainServService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
