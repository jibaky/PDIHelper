import { NgFor, NgIf, NgClass } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ViewChildren, QueryList, AfterViewChecked, HostListener, ChangeDetectorRef } from '@angular/core';
import { NodeManipService } from '../../services/node-manip.service';
import { treeNode } from '../../model/treeNode.model';
import { ImageLoaderComponent } from '../../components/image-loader/image-loader.component';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';
import { ImageProcessingService } from '../../services/image-processing.service';
import { FormsModule } from '@angular/forms';
import { ConvolutionModalComponent } from '../../components/convolution-modal/convolution-modal.component';
import { PseudocodeModalComponent } from '../../components/pseudocode-modal/pseudocode-modal.component';
import { MorphologyModalComponent, MorphologySettings } from '../../components/morphology-modal/morphology-modal.component';

// Interface for structured pseudocode steps
export interface PseudocodeStep {
  title: string;
  description: string;
  substeps: string[];
}

type NodeType = 'image' | 'editor-greyscale' | 'editor-threshold' | 'editor-histogram-equalization' | 'editor-convolution' | 'editor-add' | 'editor-difference' | 'editor-noise-reduction' | 'editor-morphology' | 'editor-skeletonization';

@Component({
  selector: 'app-home',
  imports: [NgFor, NgIf, FormsModule, ImageLoaderComponent, ImageModalComponent, ConvolutionModalComponent, NgClass, PseudocodeModalComponent, MorphologyModalComponent],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {

  @ViewChild('containerRef') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svgCanvas') svgCanvas!: ElementRef<SVGElement>;
  @ViewChildren('boxElement') boxElements!: QueryList<ElementRef<HTMLDivElement>>;

  public isDragging = false;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public boxes: treeNode[] = [];

  public draggedNode: treeNode | null = null;
  public isConnecting = false;
  public startNode: treeNode | null = null;
  public startPoint: { x: number, y: number } | null = null;

  public showImageModal: boolean = false;
  public showConvolutionModal: boolean = false;
  public showMorphologyModal: boolean = false;
  public currentNodeForMatrix: treeNode | null = null;
  public currentNodeForModal: treeNode | null = null;
  public currentNodeForMorphology: treeNode | null = null;

  public showPseudocodeModal = false;
  public pseudocodeSteps: PseudocodeStep[] = [];
  public pseudocodeNodeTitle: string = '';

  public isSidebarCollapsed: boolean = false;

  private resizeObserver: ResizeObserver | null = null;
  private numteste = 0;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedElement = event.target as HTMLElement;
    if (!clickedElement.closest('.boxes') && !clickedElement.closest('.modal-content')) {
      this.closeAllAddMenus();
    }
  }

  constructor(
    public nodeManip: NodeManipService,
    private imageProcessor: ImageProcessingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.boxes = this.nodeManip.tree;
  }

  ngAfterViewInit(): void {
    this.updateSvgDimensions();
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSvgDimensions();
      this.drawConnections();
    });
    if (this.containerRef) {
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }
  }

  ngAfterViewChecked(): void {
    let updated = false;
    this.boxElements.forEach(elRef => {
        const id = elRef.nativeElement.dataset['nodeId'];
        if (!id) return;

        const box = this.boxes.find(b => b.id === id);
        if (box && box.width === 0) {
            const el = elRef.nativeElement;
            setTimeout(() => {
                box.width = el.clientWidth;
                box.height = el.clientHeight;
                updated = true;
            }, 0);
        }
    });

    if (updated) {
       this.cdr.detectChanges();
       this.drawConnections();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private updateSvgDimensions(): void {
    if (this.containerRef && this.svgCanvas) {
      const container = this.containerRef.nativeElement;
      this.svgCanvas.nativeElement.setAttribute('width', container.clientWidth.toString());
      this.svgCanvas.nativeElement.setAttribute('height', container.clientHeight.toString());
    }
  }

  private generateUniqueId(): string {
    return `node-${this.numteste++}`;
  }
  
  private createAndAddNode(type: NodeType, x: number, y: number, parentNode?: treeNode): treeNode {
      const newNode: treeNode = {
          id: this.generateUniqueId(),
          type: type,
          imageSrc: undefined,
          x: x,
          y: y,
          width: 0,
          height: 0,
          connections: [],
          parentIds: [],
          scale: 1,
          isAddMenuOpen: false
      };

      if (type === 'editor-threshold') {
          newNode.threshold = 128;
      }
      
      if (type === 'editor-convolution') {
        newNode.matrixSize = 3;
        newNode.convolutionDivisor = 1;
        newNode.convolutionMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      }

      if (type === 'editor-add') {
        newNode.addOperationMode = 'average';
      }

      if (type === 'editor-difference') {
        newNode.differenceSliderValue = 50;
      }
      
      if (type === 'editor-noise-reduction') {
        newNode.noiseReductionMode = 'median';
      }
      
      if (type === 'editor-morphology') {
        newNode.morphologyOperation = 'dilation';
        newNode.structuringElementShape = 'square';
        newNode.structuringElementSize = 3;
      }
      
      this.nodeManip.addNode(newNode);
      this.boxes = [...this.nodeManip.tree];

      if (parentNode) {
          this.nodeManip.addConnection(parentNode.id, newNode.id);
      }
      return newNode;
  }

    public addSobelDetector(): void {
      const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
      const startX = Math.random() * (containerRect.width - 500); 
      const startY = (Math.random() * (window.innerHeight - 300)) + window.scrollY;

      const nodeWidth = 220;
      const nodeSpacing = 40;

      const sobelXNode = this.createAndAddNode('editor-convolution', startX, startY);
      sobelXNode.convolutionMatrix = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];
      sobelXNode.matrixSize = 3;
      sobelXNode.convolutionDivisor = 1;

      const sobelYNode = this.createAndAddNode('editor-convolution', startX + nodeWidth + nodeSpacing, startY);
      sobelYNode.convolutionMatrix = [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];
      sobelYNode.matrixSize = 3;
      sobelYNode.convolutionDivisor = 1;

      const addNodeY = startY + 150 + 50;
      const addNodeX = startX + nodeWidth / 2 + nodeSpacing / 2;
      const addNode = this.createAndAddNode('editor-add', addNodeX, addNodeY);
      addNode.addOperationMode = 'root';
      
      this.nodeManip.addConnection(sobelXNode.id, addNode.id);
      this.nodeManip.addConnection(sobelYNode.id, addNode.id);

      setTimeout(() => this.drawConnections(), 0);
  }

  public addGaussianBlurNode(): void {
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const randomX = Math.random() * (containerRect.width - 220);
    const randomY = (Math.random() * (window.innerHeight - 150)) + window.scrollY;

    const blurNode = this.createAndAddNode('editor-convolution', randomX, randomY);
    blurNode.convolutionMatrix = [[1,4,7,4,1],[4,16,26,16,4],[7,26,41,26,7],[4,16,26,16,4],[1,4,7,4,1]];
    blurNode.matrixSize = 5;
    blurNode.convolutionDivisor = 273;
  }

  public addBoxBlurNode(): void {
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const randomX = Math.random() * (containerRect.width - 220);
    const randomY = (Math.random() * (window.innerHeight - 150)) + window.scrollY;

    const blurNode = this.createAndAddNode('editor-convolution', randomX, randomY);
    blurNode.convolutionMatrix = [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]];
    blurNode.matrixSize = 5;
    blurNode.convolutionDivisor = 25;
  }

  public addLaplacianNode(): void {
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const randomX = Math.random() * (containerRect.width - 220);
    const randomY = (Math.random() * (window.innerHeight - 150)) + window.scrollY;

    const laplacianNode = this.createAndAddNode('editor-convolution', randomX, randomY);
    laplacianNode.convolutionMatrix = [[0,-1,0],[-1,5,-1],[0,-1,0]];
    laplacianNode.matrixSize = 3;
    laplacianNode.convolutionDivisor = 1;
  }
  
  public addNodeFromSidebar(type: NodeType): void {
      const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
      const randomX = Math.random() * (containerRect.width - 220);
      const randomY = (Math.random() * (window.innerHeight - 150)) + window.scrollY;
      this.createAndAddNode(type, randomX, randomY);
  }
  
  public async addChildNode(parentNode: treeNode, childType: NodeType) {
      const newX = parentNode.x;
      const newY = parentNode.y + (parentNode.height * (parentNode.scale || 1)) + 50;
      
      // Create a temporary node for the compatibility check without adding it to the tree
      const tempNodeForCheck: treeNode = { 
          id: 'temp', 
          type: childType,
          x:0, y:0, width:0, height:0, connections:[], parentIds: [] // Dummy properties
      };
      this.checkConnectionCompatibility(parentNode, tempNodeForCheck);

      // Create the real node and establish the connection
      const newNode = this.createAndAddNode(childType, newX, newY, parentNode);
      
      await this.updateEditorNode(newNode);
      this.drawConnections();
      this.closeAllAddMenus();
  }

  public toggleAddMenu(node: treeNode, event: MouseEvent) {
    event.stopPropagation();
    const currentMenuState = node.isAddMenuOpen;
    this.closeAllAddMenus();
    node.isAddMenuOpen = !currentMenuState;
  }

  /**
   * MODIFIED: Reworked to allow almost any node to be a child, with exceptions.
   * 'image' nodes cannot be children.
   * 'editor-difference' nodes cannot have children.
   */
  public getValidChildrenTypes(node: treeNode): {type: NodeType, label: string}[] {
    // MODIFIED: 'editor-difference' is a terminal node and cannot have children.
    if (node.type === 'editor-difference') {
        return [];
    }

    const allPossibleChildren: {type: NodeType, label: string}[] = [
        { type: 'editor-add', label: 'Add (2 Images)'},
        { type: 'editor-difference', label: 'Difference (2 Images)'},
        { type: 'editor-greyscale', label: 'Greyscale' },
        { type: 'editor-threshold', label: 'Threshold' },
        { type: 'editor-histogram-equalization', label: 'Histogram Equalization' },
        { type: 'editor-convolution', label: 'Convolution'},
        { type: 'editor-noise-reduction', label: 'Noise Reduction'},
        { type: 'editor-morphology', label: 'Morphology'},
        { type: 'editor-skeletonization', label: 'Skeletonization'}
    ];
    
    // Returns all possible children for any valid parent node.
    return allPossibleChildren;
  }
  
  /**
   * NEW: This function checks for non-ideal connections and alerts the user.
   * It does not prevent the connection, only warns about potential issues.
   * @param parentNode The node that will be the parent in the connection.
   * @param childNode The node that will be the child.
   */
  private checkConnectionCompatibility(parentNode: treeNode, childNode: treeNode): void {
    const parentColorType = parentNode.colorType;

    // If the parent has no image/colorType yet, we can't make a determination.
    if (!parentColorType) {
      return;
    }

    switch (childNode.type) {
      case 'editor-greyscale':
        if (parentColorType === 'greyscale' || parentColorType === 'binary') {
          alert("Warning: Applying a Greyscale filter to an image that is already greyscale or binary will have no effect.");
        }
        break;
      
      case 'editor-threshold':
        if (parentColorType === 'color') {
          alert("Warning: Thresholding works best on greyscale images. The input will be converted to greyscale, which might lead to unexpected results if the color information is important.");
        } else if (parentColorType === 'binary') {
          alert("Warning: Applying a threshold to an already binary image will likely have no effect or produce a solid black or white image.");
        }
        break;

      case 'editor-histogram-equalization':
        if (parentColorType === 'binary') {
          alert("Warning: Histogram Equalization has no effect on binary (black and white) images as there are only two color values.");
        }
        break;

      case 'editor-morphology':
        if (parentColorType === 'color' || parentColorType === 'greyscale') {
          alert("Warning: Morphological operations (like Dilation and Erosion) are designed for binary images. Applying them to color or greyscale images may produce unexpected results.");
        }
        break;

      case 'editor-skeletonization':
         if (parentColorType === 'color' || parentColorType === 'greyscale') {
          alert("Warning: Skeletonization is designed for binary images. Applying it to color or greyscale inputs may produce unexpected or empty results.");
        }
        break;
    }
  }

  private closeAllAddMenus() {
      this.boxes.forEach(b => b.isAddMenuOpen = false);
  }

  async onImageLoaded(imageUrl: string | ArrayBuffer | null, nodeId: string): Promise<void> {
    const node = this.boxes.find(n => n.id === nodeId);
    if (node && node.type === 'image') {
      node.imageSrc = imageUrl ? String(imageUrl) : undefined;
      // Analyze and set the color type for the newly loaded image
      if (node.imageSrc) {
        try {
          node.colorType = await this.imageProcessor.getImageColorType(node.imageSrc);
        } catch (error) {
          console.error("Failed to analyze image color type:", error);
          node.colorType = undefined;
        }
      } else {
        node.colorType = undefined;
      }
      await this.updateChildEditors(node);
    }
  }

  public grabFunc(event: MouseEvent, node: treeNode): void {
    if ((event.target as HTMLElement).closest('.maximize-icon') ||
        (event.target as HTMLElement).closest('.delete-icon') ||
        (event.target as HTMLElement).closest('.pseudocode-icon') ||
        (event.target as HTMLElement).closest('.connection-point') ||
        (event.target as HTMLElement).closest('.add-child-icon') ||
        (event.target as HTMLElement).closest('.node-button') ||
        (event.target as HTMLElement).closest('.op-button') ||
        (event.target as HTMLElement).closest('input[type="range"]')) {
      return;
    }
    if (event.button === 0 && !this.isConnecting) {
      event.stopPropagation();
      this.isDragging = true;
      this.draggedNode = node;
      
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.offsetX = event.clientX - rect.left;
      this.offsetY = event.clientY - rect.top;
    }
  }

  onContainerMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.draggedNode) {
        const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
        const scale = this.draggedNode.scale || 1;
        const boxWidth = (this.draggedNode.width || 120) * scale;
        const boxHeight = (this.draggedNode.height || 100) * scale;

        let newX = event.clientX - containerRect.left - this.offsetX;
        let newY = event.clientY - containerRect.top - this.offsetY;

        newX = Math.max(0, Math.min(newX, containerRect.width - boxWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - boxHeight));

        this.draggedNode.x = newX;
        this.draggedNode.y = newY;
        this.drawConnections();
    } else if (this.isConnecting && this.startPoint) {
        const tempLine = this.svgCanvas.nativeElement.querySelector('#temp-connection-line') || document.createElementNS('http://www.w3.org/2000/svg', 'line');
        if (!tempLine.id) {
            tempLine.setAttribute('id', 'temp-connection-line');
            tempLine.setAttribute('stroke', 'blue');
            tempLine.setAttribute('stroke-width', '1');
            tempLine.setAttribute('stroke-dasharray', '5,5');
            this.svgCanvas.nativeElement.appendChild(tempLine);
        }
        const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
        tempLine.setAttribute('x1', this.startPoint.x.toString());
        tempLine.setAttribute('y1', this.startPoint.y.toString());
        tempLine.setAttribute('x2', (event.clientX - containerRect.left).toString());
        tempLine.setAttribute('y2', (event.clientY - containerRect.top).toString());
    }
  }

  public letItGo(): void {
    this.isDragging = false;
    this.draggedNode = null;

    if (this.isConnecting) {
      this.isConnecting = false;
      this.startNode = null;
      this.startPoint = null;
      const tempLine = this.svgCanvas.nativeElement.querySelector('#temp-connection-line');
      if (tempLine) {
          tempLine.remove();
      }
    }
  }

  private getConnectionPointCoords(node: treeNode, type: 'top' | 'bottom'): { x: number, y: number } {
    const scale = node.scale || 1;
    const boxWidth = (node.width || 120) * scale;
    const boxHeight = (node.height || 100) * scale;
    const pointX = node.x + boxWidth / 2;
    const pointY = type === 'top' ? node.y : node.y + boxHeight;
    return { x: pointX, y: pointY };
  }

  /**
   * MODIFIED: Prevents starting a connection from a 'Difference' node.
   */
  public startConnection(event: MouseEvent, node: treeNode): void {
    event.stopPropagation();

    // MODIFIED: Add check to prevent 'editor-difference' from having children.
    if (node.type === 'editor-difference') {
        alert("A 'Difference' node is a terminal node and cannot be connected to a child.");
        return;
    }

    this.isConnecting = true;
    this.startNode = node;

    const targetElement = event.target as HTMLElement;
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();

    this.startPoint = {
      x: targetRect.left + targetRect.width / 2 - containerRect.left,
      y: targetRect.top + targetRect.height / 2 - containerRect.top
    };
  }

   public async endConnection(event: MouseEvent, targetNode: treeNode): Promise<void> {
    if (!this.isConnecting || !this.startNode || this.startNode.id === targetNode.id) {
      return;
    }

    event.stopPropagation();
    const sourceNode = this.startNode;
    const destNode = targetNode;
    
    if (this.isAncestor(destNode.id, sourceNode.id)) {
        alert(`Cannot connect nodes. This would create a cycle.`);
    } else {
        this.checkConnectionCompatibility(sourceNode, destNode);
        
        const success = this.nodeManip.addConnection(sourceNode.id, destNode.id);
        if (success) {
            await this.updateEditorNode(destNode);
            this.drawConnections();
        } else {
           alert(`Connection failed. The target node may already have the maximum number of parents or is an invalid type (e.g., Image Source).`);
        }
    }
    
    this.letItGo();
  }

  public deleteNode(nodeToDelete: treeNode, event: MouseEvent): void {
    event.stopPropagation();

    if (!confirm(`Are you sure you want to delete the "${this.getBoxTitle(nodeToDelete)}" node?`)) {
      return;
    }

    const orphanedChildrenIds = [...nodeToDelete.connections];
    this.nodeManip.deleteNode(nodeToDelete.id);
    this.boxes = [...this.nodeManip.tree];
    
    setTimeout(async () => {
      const orphanedChildren = this.boxes.filter(node => orphanedChildrenIds.includes(node.id));
      for (const child of orphanedChildren) {
        await this.updateEditorNode(child);
      }
      this.drawConnections();
    }, 0);
  }
  
  private isAncestor(ancestorId: string, descendantId: string): boolean {
    const node = this.boxes.find(n => n.id === descendantId);
    if (!node) return false;

    let queue = [...node.parentIds];
    const visited = new Set<string>();

    while(queue.length > 0) {
      const currentParentId = queue.shift()!;
      if (currentParentId === ancestorId) return true;
      if (visited.has(currentParentId)) continue;
      
      visited.add(currentParentId);
      const currentParentNode = this.boxes.find(n => n.id === currentParentId);
      if (currentParentNode) {
        queue.push(...currentParentNode.parentIds);
      }
    }
    return false;
  }

  public onThresholdChange(node: treeNode): void {
    this.updateEditorNode(node);
  }

  public async applyOtsuThreshold(node: treeNode): Promise<void> {
    if (node.type !== 'editor-threshold' || node.parentIds.length === 0) {
      alert("Otsu's method can only be applied to a Threshold node with a connected parent.");
      return;
    }
    
    const parentNode = this.boxes.find(n => n.id === node.parentIds[0]);
    if (!parentNode || !parentNode.imageSrc) {
      alert("Parent node does not have an image to process.");
      return;
    }

    try {
      const optimalThreshold = await this.imageProcessor.calculateOtsuThreshold(parentNode.imageSrc);
      node.threshold = optimalThreshold;
      await this.updateEditorNode(node);
    } catch (error) {
      console.error("Failed to apply Otsu's method:", error);
      alert("An error occurred while calculating the optimal threshold.");
    }
  }

  public onDifferenceSliderChange(node: treeNode): void {
    // Placeholder for direct changes on the node
  }

  public async setAddOperationMode(node: treeNode, mode: 'add' | 'average' | 'root', event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (node.type === 'editor-add') {
      node.addOperationMode = mode;
      await this.updateEditorNode(node);
    }
  }

  public async setNoiseReductionMode(node: treeNode, mode: 'min' | 'median' | 'max', event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (node.type === 'editor-noise-reduction') {
      node.noiseReductionMode = mode;
      await this.updateEditorNode(node);
    }
  }

  private async updateEditorNode(editorNode: treeNode): Promise<void> {
    if (editorNode.parentIds.length === 0) {
      editorNode.imageSrc = undefined;
      editorNode.imageSrcB = undefined;
      editorNode.colorType = undefined; // Clear the color type
      await this.updateChildEditors(editorNode);
      this.drawConnections();
      return;
    }

    try {
      let processedImage: string | undefined;

      if (editorNode.type === 'editor-add') {
        if (editorNode.parentIds.length === 2) {
          const parentA = this.boxes.find(n => n.id === editorNode.parentIds[0]);
          const parentB = this.boxes.find(n => n.id === editorNode.parentIds[1]);
          if (parentA?.imageSrc && parentB?.imageSrc) {
            processedImage = await this.imageProcessor.applyAddOperation(
              parentA.imageSrc,
              parentB.imageSrc,
              editorNode.addOperationMode || 'average'
            );
            if (processedImage === '') {
              editorNode.parentIds.forEach(parentId => {
                  const parentNode = this.nodeManip.tree.find(n => n.id === parentId);
                  if (parentNode) {
                    parentNode.connections = parentNode.connections.filter(id => id !== editorNode.id);
                  }
                });
                editorNode.parentIds = [];
            }
          }
        }
      } else if (editorNode.type === 'editor-difference') {
          if (editorNode.parentIds.length === 2) {
              const parentA = this.boxes.find(n => n.id === editorNode.parentIds[0]);
              const parentB = this.boxes.find(n => n.id === editorNode.parentIds[1]);
              editorNode.imageSrc = parentA?.imageSrc;
              editorNode.imageSrcB = parentB?.imageSrc;
              processedImage = parentA?.imageSrc;
          } else {
              editorNode.imageSrc = undefined;
              editorNode.imageSrcB = undefined;
          }
      } else { 
          const parentNode = this.boxes.find(n => n.id === editorNode.parentIds[0]);
          if (parentNode && parentNode.imageSrc) {
            let sourceImage = parentNode.imageSrc;
            switch (editorNode.type) {
              case 'editor-greyscale':
                processedImage = await this.imageProcessor.applyGreyscale(sourceImage);
                break;
              case 'editor-threshold':
                processedImage = await this.imageProcessor.applyThreshold(sourceImage, editorNode.threshold || 128);
                break;
              case 'editor-histogram-equalization':
                processedImage = await this.imageProcessor.applyHistogramEqualization(sourceImage);
                break;
              case 'editor-convolution':
                if (editorNode.convolutionMatrix) {
                  processedImage = await this.imageProcessor.applyConvolution(sourceImage, editorNode.convolutionMatrix, editorNode.convolutionDivisor || 1);
                }
                break;
              case 'editor-noise-reduction':
                processedImage = await this.imageProcessor.applyNoiseReduction(sourceImage, editorNode.noiseReductionMode || 'median');
                break;
              case 'editor-morphology':
                 if (editorNode.morphologyOperation && editorNode.structuringElementShape && editorNode.structuringElementSize) {
                    processedImage = await this.imageProcessor.applyMorphology(
                        sourceImage,
                        editorNode.morphologyOperation,
                        editorNode.structuringElementShape,
                        editorNode.structuringElementSize
                    );
                 }
                 break;
              case 'editor-skeletonization':
                processedImage = await this.imageProcessor.applyZhangSuenSkeletonization(sourceImage);
                break;
            }
          }
      }

      if(editorNode.type !== 'editor-difference'){
        editorNode.imageSrc = processedImage;
      }
      
      // Analyze and set color type for the processed image
      if (editorNode.imageSrc) {
        editorNode.colorType = await this.imageProcessor.getImageColorType(editorNode.imageSrc);
      } else {
        editorNode.colorType = undefined;
      }
      
      await this.updateChildEditors(editorNode);
    } catch (error) {
      console.error("Image processing failed:", error);
      editorNode.imageSrc = undefined;
      editorNode.colorType = undefined; // Also clear on error
      await this.updateChildEditors(editorNode);
    }
    this.drawConnections();
  }

  private async updateChildEditors(parentNode: treeNode): Promise<void> {
    const childEditors = this.boxes.filter(n => n.parentIds.includes(parentNode.id));
    for (const editor of childEditors) {
      await this.updateEditorNode(editor);
    }
  }

  public drawConnections(): void {
    if (!this.svgCanvas || !this.containerRef) return;
    this.cdr.detectChanges();

    const svg = this.svgCanvas.nativeElement;
    Array.from(svg.querySelectorAll('line:not(#temp-connection-line)')).forEach(line => line.remove());

    this.boxes.forEach(sourceNode => {
      sourceNode.connections.forEach(targetNodeId => {
        const targetNode = this.boxes.find(n => n.id === targetNodeId);
        if (targetNode) {
          const sourceCoords = this.getConnectionPointCoords(sourceNode, 'bottom');
          const targetCoords = this.getConnectionPointCoords(targetNode, 'top');

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', sourceCoords.x.toString());
          line.setAttribute('y1', sourceCoords.y.toString());
          line.setAttribute('x2', targetCoords.x.toString());
          line.setAttribute('y2', targetCoords.y.toString());
          line.setAttribute('stroke', 'black');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('marker-end', 'url(#arrowhead)');
          svg.appendChild(line);
        }
      });
    });

    if (!svg.querySelector('#arrowhead')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '0');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('fill', 'black');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.prepend(defs);
    }
  }

  public openImageModal(event: MouseEvent, node: treeNode): void {
    event.stopPropagation();
    if (node.imageSrc || node.imageSrcB) {
      this.currentNodeForModal = node;
      this.showImageModal = true;
    } else {
      alert('No image to view for this node.');
    }
  }
  
  public closeImageModal(): void {
    this.showImageModal = false;
    this.currentNodeForModal = null;
  }

  public openConvolutionModal(node: treeNode): void {
    if (node.type === 'editor-convolution') {
      this.currentNodeForMatrix = node;
      this.showConvolutionModal = true;
    }
  }

  public closeConvolutionModal(): void {
    this.showConvolutionModal = false;
    this.currentNodeForMatrix = null;
  }

  public async onSaveConvolutionMatrix(data: { matrix: number[][], size: 3 | 5, divisor: number }): Promise<void> {
    if (this.currentNodeForMatrix) {
      this.currentNodeForMatrix.convolutionMatrix = data.matrix;
      this.currentNodeForMatrix.matrixSize = data.size;
      this.currentNodeForMatrix.convolutionDivisor = data.divisor;
      await this.updateEditorNode(this.currentNodeForMatrix);
    }
    this.closeConvolutionModal();
  }

  public openMorphologyModal(node: treeNode, event: MouseEvent): void {
    event.stopPropagation();
    if (node.type === 'editor-morphology') {
      this.currentNodeForMorphology = node;
      this.showMorphologyModal = true;
    }
  }

  public closeMorphologyModal(): void {
    this.showMorphologyModal = false;
    this.currentNodeForMorphology = null;
  }

  public async onSaveMorphologySettings(settings: MorphologySettings): Promise<void> {
    if (this.currentNodeForMorphology) {
      this.currentNodeForMorphology.morphologyOperation = settings.operation;
      this.currentNodeForMorphology.structuringElementShape = settings.shape;
      this.currentNodeForMorphology.structuringElementSize = settings.size;
      await this.updateEditorNode(this.currentNodeForMorphology);
    }
    this.closeMorphologyModal();
  }

  public async onAddOperationChanged(mode: 'add' | 'average' | 'root') {
    if (this.currentNodeForModal && this.currentNodeForModal.type === 'editor-add') {
      await this.setAddOperationMode(this.currentNodeForModal, mode);
    }
  }
  
  public async onNoiseReductionChanged(mode: 'min' | 'median' | 'max') {
    if (this.currentNodeForModal && this.currentNodeForModal.type === 'editor-noise-reduction') {
      await this.setNoiseReductionMode(this.currentNodeForModal, mode);
    }
  }

  public async onApplyOtsuFromModal(): Promise<void> {
    if (this.currentNodeForModal) {
      await this.applyOtsuThreshold(this.currentNodeForModal);
    }
  }

  public async onThresholdChangedFromModal(value: number) {
    if (this.currentNodeForModal && this.currentNodeForModal.type === 'editor-threshold') {
      this.currentNodeForModal.threshold = value;
      await this.updateEditorNode(this.currentNodeForModal);
    }
  }

  public onDifferenceSliderChangedFromModal(value: number) {
      if (this.currentNodeForModal && this.currentNodeForModal.type === 'editor-difference') {
          this.currentNodeForModal.differenceSliderValue = value;
      }
  }

  public resizeNode(node: treeNode, event: MouseEvent): void {
    event.stopPropagation();
    node.scale = (node.scale === 1) ? 1.7 : 1;
    this.drawConnections();
  }

  public getBoxTitle(box: treeNode): string {
    switch (box.type) {
      case 'image': return 'Image Source';
      case 'editor-greyscale': return 'Greyscale';
      case 'editor-threshold': return 'Threshold';
      case 'editor-histogram-equalization': return 'Hist. Equalization';
      case 'editor-convolution': 
        if(JSON.stringify(box.convolutionMatrix) === JSON.stringify([[1, 0, -1], [2, 0, -2], [1, 0, -1]])) return 'Sobel X';
        if(JSON.stringify(box.convolutionMatrix) === JSON.stringify([[1, 2, 1], [0, 0, 0], [-1, -2, -1]])) return 'Sobel Y';
        if(JSON.stringify(box.convolutionMatrix) === JSON.stringify([[1,4,7,4,1],[4,16,26,16,4],[7,26,41,26,7],[4,16,26,16,4],[1,4,7,4,1]]) && box.convolutionDivisor === 273) return 'Gaussian Blur (5x5)';
        if(JSON.stringify(box.convolutionMatrix) === JSON.stringify([[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]]) && box.convolutionDivisor === 25) return 'Box Blur (5x5)';
        if(JSON.stringify(box.convolutionMatrix) === JSON.stringify([[0,-1,0],[-1,5,-1],[0,-1,0]]) && box.convolutionDivisor === 1) return 'Laplacian Sharpen';
        return 'Convolution Filter';
      case 'editor-add': return 'Add (2 Images)';
      case 'editor-difference': return 'Difference (2 Images)';
      case 'editor-noise-reduction': return 'Noise Reduction';
      case 'editor-morphology': return 'Morphology';
      case 'editor-skeletonization': return 'Skeletonization';
      default: return 'Node';
    }
  }

   boxTrackBy(index: number, box: treeNode): string {
    return box.id;
  }

  public openPseudocodeModal(node: treeNode, event: MouseEvent): void {
    event.stopPropagation();
    this.pseudocodeSteps = this.generatePseudocode(node);
    this.pseudocodeNodeTitle = `Steps for: ${this.getBoxTitle(node)}`;
    this.showPseudocodeModal = true;
  }

  public closePseudocodeModal(): void {
    this.showPseudocodeModal = false;
    this.pseudocodeSteps = [];
    this.pseudocodeNodeTitle = '';
  }

  private generatePseudocode(targetNode: treeNode): PseudocodeStep[] {
    const processingOrder: treeNode[] = [];
    const visited = new Set<string>();
    const findNodeById = (id: string) => this.boxes.find(b => b.id === id);

    const visit = (node: treeNode | undefined) => {
      if (!node || visited.has(node.id) || node.type === 'editor-difference') {
        return;
      }
      visited.add(node.id);
      node.parentIds.forEach(parentId => visit(findNodeById(parentId)));
      processingOrder.push(node);
    };

    visit(targetNode);

    const steps: PseudocodeStep[] = [];
    for (const node of processingOrder) {
      const step: PseudocodeStep = { title: '', description: '', substeps: [] };
      const outputVar = `${node.type.replace('editor-', '')}_${node.id.replace('node-', '')}`;
      
      const getParentVar = (parentId: string) => {
        const parentNode = findNodeById(parentId);
        return parentNode ? `${parentNode.type.replace('editor-', '')}_${parentNode.id.replace('node-', '')}` : 'unknown_input';
      };

      step.title = this.getBoxTitle(node);

      switch (node.type) {
        case 'image':
          step.description = `Load a source image. The resulting image data is named '${outputVar}'.`;
          break;
        
        case 'editor-greyscale':
          step.description = `Apply a greyscale filter to image '${getParentVar(node.parentIds[0])}' and store the result in '${outputVar}'.`;
          step.substeps = [
            'For each pixel in the input image:',
            '  Read the Red (R), Green (G), and Blue (B) values.',
            '  Calculate the luminance value using the formula: L = 0.299*R + 0.587*G + 0.114*B.',
            '  Set the R, G, and B values of the output pixel to L.'
          ];
          break;

        case 'editor-threshold':
          step.description = `Apply a binary threshold to image '${getParentVar(node.parentIds[0])}' and store the result in '${outputVar}'.`;
          step.substeps = [
            `Define a threshold value: ${node.threshold}. (This can be set manually or automatically using Otsu's method).`,
            'For each pixel in the input image (typically greyscale):',
            '  Read the intensity value of the pixel.',
            `  If the value is less than ${node.threshold}, set the output pixel to black (0).`,
            '  Otherwise, set the output pixel to white (255).'
          ];
          if (processingOrder.some(p => p.type === 'editor-threshold')) {
            const otsuStep: PseudocodeStep = {
              title: "About: Otsu's Method (Automatic Thresholding)",
              description: "Otsu's method is an algorithm used to automatically find an optimal threshold value for a greyscale image. It works by iterating through all possible thresholds and selecting the one that maximizes the separability (variance) between the two classes of pixels (foreground and background).",
              substeps: [
                "1. Calculate a histogram of the image's greyscale intensity levels (0-255).",
                "2. For each possible threshold 't' from 0 to 255:",
                "   a. Split the histogram into two groups: pixels below or equal to 't' (background) and pixels above 't' (foreground).",
                "   b. Calculate the weight of each group (number of pixels in group / total pixels).",
                "   c. Calculate the mean intensity of each group.",
                "   d. Calculate the 'between-class variance' using the weights and means. This value measures how well-separated the two groups are.",
                "3. The threshold 't' that results in the maximum 'between-class variance' is chosen as the optimal threshold."
              ]
            };
            if (!steps.some(s => s.title.includes("Otsu's Method"))) {
              steps.push(otsuStep);
            }
          }
          break;

        case 'editor-histogram-equalization':
          step.description = `Apply histogram equalization to image '${getParentVar(node.parentIds[0])}' to improve contrast. Result is stored in '${outputVar}'.`;
          step.substeps = [
              "Convert the image from RGB to a color space with a lightness/intensity component (like HSL or HSV).",
              "Build a histogram of the lightness (L) values from all pixels.",
              "Calculate the Cumulative Distribution Function (CDF) from the histogram.",
              "Remap the original lightness values to new, equalized values using the CDF.",
              "Create the output image by combining the original Hue and Saturation with the new equalized Lightness.",
              "Convert the final image back to RGB."
          ];
          break;
          
        case 'editor-convolution':
          step.description = `Apply a convolution filter to image '${getParentVar(node.parentIds[0])}' and store the result in '${outputVar}'.`;
          step.substeps = [
            `Define the convolution kernel (matrix): ${JSON.stringify(node.convolutionMatrix)}.`,
            `Define the divisor: ${node.convolutionDivisor}.`,
            'Create a new blank output image with slightly smaller dimensions to account for the kernel border.',
            'For each pixel (x, y) in the new output image:',
            '  Initialize sumR, sumG, sumB to 0.',
            '  Place the center of the kernel over the corresponding pixel in the input image.',
            '  For each element in the kernel:',
            '    Multiply the kernel value by the color value of the underlying input pixel.',
            '    Add the result to sumR, sumG, and sumB.',
            '  Divide sumR, sumG, and sumB by the divisor.',
            '  Assign the final (clamped to 0-255) R, G, B values to the output pixel at (x, y).'
          ];
          break;

        case 'editor-add':
          if (node.parentIds.length < 2) {
            step.description = 'The "Add" node is waiting for a second parent connection to generate steps.';
          } else {
            const inputVar1 = getParentVar(node.parentIds[0]);
            const inputVar2 = getParentVar(node.parentIds[1]);
            let opDesc = '';
            switch (node.addOperationMode) {
              case 'add': 
                opDesc = `NewValue = ValueA + ValueB`;
                break;
              case 'average': 
                opDesc = `NewValue = (ValueA + ValueB) / 2`;
                break;
              case 'root':
                opDesc = `NewValue = sqrt(ValueA^2 + ValueB^2)`;
                break;
            }
            step.description = `Combine images '${inputVar1}' (Image A) and '${inputVar2}' (Image B) using the '${node.addOperationMode}' operation. The result is stored in '${outputVar}'.`;
            step.substeps = [
              'Create a new blank output image with dimensions large enough to fit both input images.',
              'For each corresponding pixel in Image A and Image B:',
              '  For each color channel (R, G, B):',
              `    Calculate the new channel value using the formula: ${opDesc}.`,
              '    Clamp the result to the valid range [0, 255].',
              '  Set the R, G, B values of the output pixel.'
            ];
          }
          break;
        
        case 'editor-noise-reduction':
            step.description = `Apply a ${node.noiseReductionMode} filter to image '${getParentVar(node.parentIds[0])}' and store the result in '${outputVar}'.`;
            step.substeps = [
              'Create a new blank output image.',
              'For each pixel in the input image (excluding borders):',
              '  Create a list of pixel values from the 3x3 neighborhood around the current pixel for each color channel (R, G, B).',
              `  For each channel, find the ${node.noiseReductionMode} value in the list.`,
              '  Set the R, G, B values of the output pixel to the calculated min, median, or max values.'
            ];
            break;

        case 'editor-morphology':
            step.description = `Apply a morphological '${node.morphologyOperation}' operation to the binary image '${getParentVar(node.parentIds[0])}' using a ${node.structuringElementSize}x${node.structuringElementSize} '${node.structuringElementShape}' structuring element. The result is stored in '${outputVar}'.`;
            if (node.morphologyOperation === 'dilation') {
                step.substeps = [
                    'Create a new blank output image.',
                    'For each pixel in the input image:',
                    '  Place the structuring element (SE) centered on the pixel.',
                    '  If ANY pixel under the SE in the input image is white (foreground),',
                    '    Then set the corresponding output pixel to white.',
                    '  Else, set the output pixel to black.'
                ];
            } else { // Erosion
                step.substeps = [
                    'Create a new blank output image.',
                    'For each pixel in the input image:',
                    '  Place the structuring element (SE) centered on the pixel.',
                    '  If ALL pixels under the SE in the input image are white (foreground),',
                    '    Then set the corresponding output pixel to white.',
                    '  Else (if any pixel is black), set the output pixel to black.'
                ];
            }
            break;
            
        case 'editor-skeletonization':
          step.description = `Apply the Zhang-Suen thinning algorithm to the binary image '${getParentVar(node.parentIds[0])}' to produce a one-pixel-wide skeleton. The result is stored in '${outputVar}'.`;
          step.substeps = [
              "Initialize a loop that continues as long as pixels are being removed in an iteration.",
              "Step 1: Identify and mark pixels for deletion based on a set of conditions:",
              "  a. The pixel must be a foreground pixel (white).",
              "  b. It must have between 2 and 6 foreground neighbors.",
              "  c. The number of 0-to-1 transitions in its ordered neighbors must be exactly 1.",
              "  d. At least one of its North, East, or South neighbors must be background.",
              "  e. At least one of its East, South, or West neighbors must be background.",
              "Remove all marked pixels from the image.",
              "Step 2: Identify and mark pixels for deletion with a slightly different set of conditions:",
              "  a, b, c are the same as Step 1.",
              "  d. At least one of its North, East, or West neighbors must be background.",
              "  e. At least one of its North, South, or West neighbors must be background.",
              "Remove all marked pixels from the image.",
              "Repeat both steps until no pixels are removed in a full iteration.",
          ];
          break;
      }
      if (step.description) {
        steps.push(step);
      }
    }

    if (processingOrder.some(p => p.type === 'editor-threshold')) {
      const otsuStepIndex = steps.findIndex(s => s.title.includes("Otsu's Method"));
      if (otsuStepIndex !== -1) {
        const otsuStep = steps.splice(otsuStepIndex, 1)[0];
        steps.push(otsuStep);
      }
    }

    return steps;
  }
}
