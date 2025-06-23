import { Injectable } from '@angular/core';
import { treeNode } from '../model/treeNode.model';

@Injectable({
  providedIn: 'root'
})
export class NodeManipService {
  public tree: treeNode[];

  constructor() {
    this.tree = [];
  }

  addNode(node: treeNode): void {
    if (node.parentIds === undefined) {
      node.parentIds = [];
    }
    this.tree.push(node);
    console.log('Node added to service:', node);
  }

  updateNodePosition(nodeId: string, newX: number, newY: number): void {
    const node = this.tree.find(n => n.id === nodeId);
    if (node) {
      node.x = newX;
      node.y = newY;
    }
  }

  updateNodeImage(nodeId: string, imageSrc: string): void {
    const node = this.tree.find(n => n.id === nodeId);
    if (node) {
      node.imageSrc = imageSrc;
    }
  }

  /**
   * @method addConnection
   * @param sourceNodeId The ID of the potential parent node.
   * @param targetNodeId The ID of the potential child node.
   * @description Adds a directed connection (parent -> child) between two nodes.
   * Enforces parent constraints based on the target node's type.
   * @returns boolean - true if connection was successful, false otherwise.
   */
  addConnection(sourceNodeId: string, targetNodeId: string): boolean {
    const sourceNode = this.tree.find(n => n.id === sourceNodeId);
    const targetNode = this.tree.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode || sourceNodeId === targetNodeId) {
        console.warn('Connection failed: Invalid nodes or self-connection.');
        return false;
    }

    // FIXED: Allow both 'editor-add' and 'editor-difference' to have 2 parents
    const maxParents = (targetNode.type === 'editor-add' || targetNode.type === 'editor-difference') ? 2 : 1;

    if (targetNode.parentIds.length >= maxParents) {
        console.warn(`Target node ${targetNodeId} cannot accept more parents.`);
        return false;
    }
    
    if (targetNode.parentIds.includes(sourceNodeId)) {
       console.warn(`Connection from ${sourceNodeId} to ${targetNodeId} already exists.`);
       return false;
    }

    if (!sourceNode.connections.includes(targetNodeId)) {
      sourceNode.connections.push(targetNodeId);
      targetNode.parentIds.push(sourceNodeId);
      console.log(`Connection added: ${sourceNodeId} -> ${targetNodeId}`);
      return true;
    }

    return false;
  }

  removeConnection(sourceNodeId: string, targetNodeId: string): void {
    const sourceNode = this.tree.find(n => n.id === sourceNodeId);
    const targetNode = this.tree.find(n => n.id === targetNodeId);

    if (sourceNode) {
      sourceNode.connections = sourceNode.connections.filter(id => id !== targetNodeId);
    }
    
    if (targetNode) {
      targetNode.parentIds = targetNode.parentIds.filter(id => id !== sourceNodeId);
    }
  }
  
  deleteNode(nodeId: string): void {
    const nodeIndex = this.tree.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
        console.warn(`Node with ID ${nodeId} not found for deletion.`);
        return;
    }

    const nodeToDelete = this.tree[nodeIndex];

    nodeToDelete.parentIds.forEach(parentId => {
      const parentNode = this.tree.find(n => n.id === parentId);
      if (parentNode) {
        parentNode.connections = parentNode.connections.filter(id => id !== nodeId);
      }
    });

    nodeToDelete.connections.forEach(childId => {
      const childNode = this.tree.find(n => n.id === childId);
      if (childNode) {
        childNode.parentIds = childNode.parentIds.filter(id => id !== nodeId);
      }
    });

    this.tree.splice(nodeIndex, 1);
    console.log(`Node ${nodeId} and its connections have been removed.`);
  }
}
