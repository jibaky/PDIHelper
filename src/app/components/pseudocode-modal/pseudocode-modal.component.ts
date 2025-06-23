import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PseudocodeStep } from '../../components/home/home.component';

@Component({
  selector: 'app-pseudocode-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pseudocode-modal.component.html',
  styleUrls: ['./pseudocode-modal.component.scss']
})
export class PseudocodeModalComponent {
  @Input() steps: PseudocodeStep[] = [];
  @Input() nodeTitle: string = 'Processing Steps';
  @Output() closeModal = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  onCloseButtonClick(): void {
    this.closeModal.emit();
  }
}
