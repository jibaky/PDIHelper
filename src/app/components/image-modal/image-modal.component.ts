import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { treeNode } from '../../model/treeNode.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-modal.component.html',
  styleUrl: './image-modal.component.scss'
})
export class ImageModalComponent {
  @Input() node: treeNode | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() operationChanged = new EventEmitter<'add' | 'average' | 'root'>();
  @Output() noiseReductionChanged = new EventEmitter<'min' | 'median' | 'max'>();
  @Output() differenceSliderChanged = new EventEmitter<number>();
  @Output() thresholdChanged = new EventEmitter<number>(); 
  // NEW: Output to trigger Otsu's method from the modal
  @Output() applyOtsu = new EventEmitter<void>();

  public imageLoadError: boolean = false;

  constructor() { }

  public getModalTitle(): string {
    if (!this.node) {
      return 'Visualizador de Imagem';
    }
    switch (this.node.type) {
      case 'editor-add':
        return 'Visualizador da Operação de Soma';
      case 'editor-difference':
        return 'Visualizador de Diferença';
      case 'editor-threshold':
        return 'Visualizador da Limiarização';
      case 'editor-noise-reduction':
        return 'Visualizador da Redução de Ruído';
      default:
        return 'Visualizador de Imagem';
    }
  }

  onImageError(): void {
    this.imageLoadError = true;
    console.error('Falha ao carregar imagem no modal.');
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  onCloseButtonClick(): void {
    this.closeModal.emit();
  }

  changeOperation(mode: 'add' | 'average' | 'root'): void {
    this.operationChanged.emit(mode);
  }

  changeNoiseReduction(mode: 'min' | 'median' | 'max'): void {
    this.noiseReductionChanged.emit(mode);
  }

  onSliderChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.differenceSliderChanged.emit(Number(value));
  }

  onThresholdSliderChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.thresholdChanged.emit(Number(value));
  }
}
