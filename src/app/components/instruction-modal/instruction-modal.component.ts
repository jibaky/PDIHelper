import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-instruction-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instruction-modal.component.html',
  styleUrls: ['./instruction-modal.component.scss']
})
export class InstructionModalComponent implements OnInit{
  @Output() closeModal = new EventEmitter<boolean>(); // Emite true se deve salvar a preferencia

  public dontShowAgain: boolean = false;
  
  ngOnInit(): void {
    const storedPreference = localStorage.getItem('hideInstructions');
    this.dontShowAgain = storedPreference === 'true';
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closeModal.emit(this.dontShowAgain);
  }
}