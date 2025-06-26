import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { treeNode } from '../../model/treeNode.model';

export interface MorphologySettings {
  operation: 'dilation' | 'erosion';
  shape: 'square' | 'circle';
  size: number;
}

@Component({
  selector: 'app-morphology-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './morphology-modal.component.html',
  styleUrls: ['./morphology-modal.component.scss']
})
export class MorphologyModalComponent implements OnInit {
  @Input() node!: treeNode;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveSettings = new EventEmitter<MorphologySettings>();

  public settings: MorphologySettings = {
    operation: 'dilation',
    shape: 'square',
    size: 3
  };

  ngOnInit(): void {
    if (this.node) {
      this.settings = {
        operation: this.node.morphologyOperation || 'dilation',
        shape: this.node.structuringElementShape || 'square',
        size: this.node.structuringElementSize || 3
      };
    }
  }

  onSave(): void {
    // Ensure size is an odd number, default to 1 if not
    if (this.settings.size < 1) {
      this.settings.size = 1;
    }
    if(this.settings.size % 2 === 0){
        this.settings.size++;
    }
    this.saveSettings.emit(this.settings);
    this.closeModal.emit();
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
