import { Component, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core'; // Added ViewChild, ElementRef
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-image-loader',
  standalone: true,

  templateUrl: './image-loader.component.html',
  styleUrl: './image-loader.component.scss'
})
export class ImageLoaderComponent {


  @Input() node: any; // Using 'any' for simplicity with treeNode for now
  @Output() imageLoaded = new EventEmitter<string | ArrayBuffer | null>();

  public imageLoadError: boolean = false;

  // Add ViewChild to get a reference to the hidden file input
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>; //

  constructor() { }

  /**
   * @method triggerFileInput
   * @description Programmatically clicks the hidden file input element.
   * This allows the button to act as the visual trigger for file selection.
   */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click(); //
  }


  /**
   * @method onFileSelected
   * @param event The change event from the file input.
   * @description Handles the selection of a file from the user's computer.
   * Reads the selected image file as a Data URL and emits it.
   */
  public onFileSelected(event: Event): void {
    this.imageLoadError = false; // Reset error state
    const input = event.target as HTMLInputElement; //

    if (input.files && input.files[0]) { //
      const file = input.files[0]; //

      // Check if the selected file is an image
      if (!file.type.startsWith('image/')) { //
        this.imageLoadError = true; //
        this.imageLoaded.emit(null); // Emit null to indicate an error or invalid file
        console.error('Selected file is not an image.'); //
        // Optionally, reset the input to allow selecting the same file again after an error
        input.value = ''; //
        return; //
      }

      const reader = new FileReader(); //

      reader.onload = (e) => { //
        this.imageLoaded.emit(e.target?.result || null); // Emit the Data URL
      };

      reader.onerror = (e) => { //
        this.imageLoadError = true; //
        this.imageLoaded.emit(null); //
        console.error('Error reading file:', e); //
        // Optionally, reset the input
        input.value = ''; //
      };

      reader.readAsDataURL(file); // Read the file as a Data URL (base64)
    } else {
      this.imageLoaded.emit(null); // Clear image if no file is selected
      this.imageLoadError = false; //
    }
  }
}
