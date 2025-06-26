import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MorphologyModalComponent } from './morphology-modal.component';

describe('MorphologyModalComponent', () => {
  let component: MorphologyModalComponent;
  let fixture: ComponentFixture<MorphologyModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorphologyModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MorphologyModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
