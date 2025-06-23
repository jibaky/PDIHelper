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

// Interface for structured pseudocode steps
export interface PseudocodeStep {
  title: string;
  description: string;
  substeps: string[];
}

type NodeType = 'image' | 'editor-greyscale' | 'editor-threshold' | 'editor-histogram-equalization' | 'editor-convolution' | 'editor-add' | 'editor-difference';

@Component({
  selector: 'app-home',
  imports: [NgFor, NgIf, FormsModule, ImageLoaderComponent, ImageModalComponent, ConvolutionModalComponent, NgClass, PseudocodeModalComponent],
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
  public currentNodeForMatrix: treeNode | null = null;
  public currentNodeForModal: treeNode | null = null;

  public showPseudocodeModal = false;
  public pseudocodeSteps: PseudocodeStep[] = [];
  public pseudocodeNodeTitle: string = '';

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
      
      this.nodeManip.addNode(newNode);
      this.boxes = [...this.nodeManip.tree];

      if (parentNode) {
          this.nodeManip.addConnection(parentNode.id, newNode.id);
      }
      return newNode;
  }
  
  public addNodeFromSidebar(type: NodeType): void {
      const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
      const randomX = Math.random() * (containerRect.width - 220);
      console.log('>>  window.scrollY',  window.scrollY)
      const randomY = (Math.random() * (window.innerHeight - 150)) + window.scrollY;
      this.createAndAddNode(type, randomX, randomY);
  }
  
  public async addChildNode(parentNode: treeNode, childType: NodeType) {
      const newX = parentNode.x;
      const newY = parentNode.y + (parentNode.height * (parentNode.scale || 1)) + 50;
      
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

  public getValidChildrenTypes(node: treeNode): {type: NodeType, label: string}[] {
    const allPossibleChildren: {type: NodeType, label: string}[] = [
        { type: 'editor-add', label: 'Add (2 Images)'},
        { type: 'editor-difference', label: 'Difference (2 Images)'},
        { type: 'editor-greyscale', label: 'Greyscale' },
        { type: 'editor-threshold', label: 'Threshold' },
        { type: 'editor-histogram-equalization', label: 'Histogram Equalization' },
        { type: 'editor-convolution', label: 'Convolution'}
    ];

    const rules: { [key in NodeType]?: NodeType[] } = {
        'image': ['editor-greyscale', 'editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-greyscale': ['editor-threshold', 'editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-threshold': ['editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-histogram-equalization': ['editor-greyscale', 'editor-threshold', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-convolution': ['editor-greyscale', 'editor-threshold', 'editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-add': ['editor-greyscale', 'editor-threshold', 'editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
        'editor-difference': ['editor-greyscale', 'editor-threshold', 'editor-histogram-equalization', 'editor-convolution', 'editor-add', 'editor-difference'],
    };

    const validTypes = rules[node.type] || [];
    return allPossibleChildren.filter(child => validTypes.includes(child.type));
  }


  private closeAllAddMenus() {
      this.boxes.forEach(b => b.isAddMenuOpen = false);
  }

  async onImageLoaded(imageUrl: string | ArrayBuffer | null, nodeId: string): Promise<void> {
    const node = this.boxes.find(n => n.id === nodeId);
    if (node && node.type === 'image') {
      node.imageSrc = imageUrl ? String(imageUrl) : undefined;
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

  public startConnection(event: MouseEvent, node: treeNode): void {
    event.stopPropagation();
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
        const success = this.nodeManip.addConnection(sourceNode.id, destNode.id);
        if (success) {
            await this.updateEditorNode(destNode);
            this.drawConnections();
        } else {
           alert(`Connection failed. The target node may already have the maximum number of parents.`);
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

  private async updateEditorNode(editorNode: treeNode): Promise<void> {
    if (editorNode.parentIds.length === 0) {
      editorNode.imageSrc = undefined;
      editorNode.imageSrcB = undefined;
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
              console.log('>> editorNode.parentIds', editorNode.parentIds)
              editorNode.parentIds.map(el => {
                console.log('>> parent', editorNode.id, el)
              })

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
            }
          }
      }

      if(editorNode.type !== 'editor-difference'){
        editorNode.imageSrc = processedImage;
      }
      
      await this.updateChildEditors(editorNode);
    } catch (error) {
      console.error("Image processing failed:", error);
      editorNode.imageSrc = undefined;
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

  public async onAddOperationChanged(mode: 'add' | 'average' | 'root') {
    if (this.currentNodeForModal && this.currentNodeForModal.type === 'editor-add') {
      await this.setAddOperationMode(this.currentNodeForModal, mode);
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
      case 'editor-convolution': return 'Convolution Filter';
      case 'editor-add': return 'Add (2 Images)';
      case 'editor-difference': return 'Difference (2 Images)';
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
            `Define a threshold value: ${node.threshold}.`,
            'For each pixel in the input image (typically greyscale):',
            '  Read the intensity value of the pixel.',
            `  If the value is less than ${node.threshold}, set the output pixel to black (0).`,
            '  Otherwise, set the output pixel to white (255).'
          ];
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
      }
      if (step.description) {
        steps.push(step);
      }
    }
    return steps;
  }
}
