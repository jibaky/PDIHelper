import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConvolutionModalComponent } from './convolution-modal.component';

describe('ConvolutionModalComponent', () => {
  let component: ConvolutionModalComponent;
  let fixture: ComponentFixture<ConvolutionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConvolutionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConvolutionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
