import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PseudocodeModalComponent } from './pseudocode-modal.component';

describe('PseudocodeModalComponent', () => {
  let component: PseudocodeModalComponent;
  let fixture: ComponentFixture<PseudocodeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PseudocodeModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PseudocodeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
