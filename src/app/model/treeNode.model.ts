export type ColorType = 'color' | 'greyscale' | 'binary';

export interface treeNode {
  id: string; // Unique identifier for the node
  imageSrc?: string; // Base64 or URL for image content
  imageSrcB?: string; // Base64 for the second image in difference view
  type: 'image' | 'editor-greyscale' | 'editor-threshold' | 'editor-histogram-equalization' | 'editor-convolution' | 'editor-add' | 'editor-difference' | 'editor-noise-reduction' | 'editor-morphology' | 'editor-skeletonization';
  x: number; // X-coordinate for the box's position in the container
  y: number; // Y-coordinate for the box's position in the container
  width: number; // The base width of the node
  height: number; // The base height of the node
  connections: string[]; // Array of IDs of other nodes this node is connected to (its children)
  parentIds: string[]; // Array of IDs of parent nodes
  isAddMenuOpen?: boolean; // Controls the visibility of the "add child" menu
  scale?: number; // Optional scale multiplier for the node's size
  
  // NEW: Flag to store the color type of the image in the node
  colorType?: ColorType;

  // Properties for specific node types
  threshold?: number; // For threshold nodes
  
  // Properties for convolution nodes
  convolutionMatrix?: number[][];
  matrixSize?: 3 | 5;
  convolutionDivisor?: number;

  // Properties for the 'add' node
  addOperationMode?: 'add' | 'average' | 'root';
  
  // Properties for the 'difference' node
  differenceSliderValue?: number; // Value from 0 to 100

  // Properties for the 'noise-reduction' node
  noiseReductionMode?: 'min' | 'median' | 'max';
  
  // Properties for the 'morphology' node
  morphologyOperation?: 'dilation' | 'erosion';
  structuringElementShape?: 'square' | 'circle';
  structuringElementSize?: number;
}
