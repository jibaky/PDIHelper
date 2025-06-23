import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-convolution-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './convolution-modal.component.html',
  styleUrls: ['./convolution-modal.component.scss']
})
export class ConvolutionModalComponent implements OnInit {
  @Input() initialMatrix!: number[][];
  @Input() initialMatrixSize!: 3 | 5;
  @Input() initialDivisor!: number;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveMatrix = new EventEmitter<{ matrix: number[][], size: 3 | 5, divisor: number }>();

  public currentMatrix: number[][] = [];
  public matrixSize!: 3 | 5;
  public currentDivisor!: number;

  ngOnInit(): void {
    this.matrixSize = this.initialMatrixSize;
    this.currentDivisor = this.initialDivisor;
    this.currentMatrix = this.initialMatrix.map(row => [...row]);
  }

  setMatrixSize(size: 3 | 5): void {
    if (this.matrixSize === size) return;
    
    this.matrixSize = size;
    // MODIFIED: Create a matrix of all zeros and set the divisor to 1
    this.currentMatrix = this.createAllZerosMatrix(size);
    this.currentDivisor = 1;
  }

  // MODIFIED: Renamed to createAllZerosMatrix and changed logic
  createAllZerosMatrix(size: 3 | 5): number[][] {
    // Creates a 3x3 or 5x5 matrix filled entirely with the number 0
    return Array(size).fill(0).map(() => Array(size).fill(0));
  }

  onSave(): void {
    const sanitizedMatrix = this.currentMatrix.map(row => 
      row.map(cell => Number(cell) || 0)
    );
    this.saveMatrix.emit({
      matrix: sanitizedMatrix,
      size: this.matrixSize,
      divisor: Number(this.currentDivisor) || 1
    });
    this.closeModal.emit();
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}