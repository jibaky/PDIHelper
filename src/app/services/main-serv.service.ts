import { Injectable } from '@angular/core';
import { treeNode } from '../model/treeNode.model'; // Import the new TreeNode interface

@Injectable({
  providedIn: 'root'
})
export class MainServService {
  public tree: treeNode[];

  constructor() {
    this.tree = [];
  }

  /**
   * @method addNode
   * @param node The TreeNode object to add to the service's collection.
   * @description Adds a new TreeNode to the tree array.
   */
  addNode(node: treeNode): void {
    // Ensure parentId is initialized to null for new standalone nodes
    if (node.parentId === undefined) {
      node.parentId = null;
    }
    this.tree.push(node);
    console.log('Node added to service:', node);
    console.log('Current tree:', this.tree);
  }

  /**
   * @method updateNodePosition
   * @param nodeId The ID of the node to update.
   * @param newX The new X-coordinate.
   * @param newY The new Y-coordinate.
   * @description Updates the position of a specific node in the tree array.
   */
  updateNodePosition(nodeId: string, newX: number, newY: number): void {
    const node = this.tree.find(n => n.id === nodeId);
    if (node) {
      node.x = newX;
      node.y = newY;
      console.log(`Node ${nodeId} position updated to (${newX}, ${newY})`);
    } else {
      console.warn(`Node with ID ${nodeId} not found for position update.`);
    }
  }

  /**
   * @method updateNodeImage
   * @param nodeId The ID of the node to update.
   * @param imageSrc The new image data URL.
   * @description Updates the image source of a specific node.
   */
  updateNodeImage(nodeId: string, imageSrc: string): void {
    const node = this.tree.find(n => n.id === nodeId);
    if (node) {
      node.imageSrc = imageSrc;
      console.log(`Node ${nodeId} image updated.`);
    } else {
      console.warn(`Node with ID ${nodeId} not found for image update.`);
    }
  }

  /**
   * @method addConnection
   * @param sourceNodeId The ID of the potential parent node.
   * @param targetNodeId The ID of the potential child node.
   * @description Adds a directed connection (parent -> child) between two nodes.
   * Enforces a single parent constraint for the target node.
   * @returns boolean - true if connection was successful, false otherwise.
   */
  addConnection(sourceNodeId: string, targetNodeId: string): boolean {
    const sourceNode = this.tree.find(n => n.id === sourceNodeId);
    const targetNode = this.tree.find(n => n.id === targetNodeId);

    if (sourceNode && targetNode) {
      // Prevent self-connection
      if (sourceNodeId === targetNodeId) {
        console.warn('Cannot connect a node to itself.');
        return false;
      }

      // Enforce single parent constraint for the target node
      if (targetNode.parentId !== null && targetNode.parentId !== sourceNodeId) {
        console.warn(`Target node ${targetNodeId} already has a parent (${targetNode.parentId}). Cannot add connection from ${sourceNodeId}.`);
        return false;
      }

      // Prevent adding duplicate connection (child already exists for this parent)
      if (!sourceNode.connections.includes(targetNodeId)) {
        sourceNode.connections.push(targetNodeId); // Add target as a child to source
        targetNode.parentId = sourceNodeId; // Set the parent ID for the target node
        console.log(`Connection added: ${sourceNodeId} (parent) -> ${targetNodeId} (child)`);
        return true; // Connection successful
      } else {
        console.warn(`Connection already exists from ${sourceNodeId} to ${targetNodeId}.`);
        return false;
      }
    } else {
      console.warn(`One or both nodes not found for connection: Source ID ${sourceNodeId}, Target ID ${targetNodeId}`);
      return false;
    }
  }

  /**
   * @method removeConnection
   * @param sourceNodeId The ID of the source (parent) node.
   * @param targetNodeId The ID of the target (child) node.
   * @description Removes a directed connection between two nodes.
   * Also clears the parentId of the target node if it was connected to this source.
   */
  removeConnection(sourceNodeId: string, targetNodeId: string): void {
    const sourceNode = this.tree.find(n => n.id === sourceNodeId);
    const targetNode = this.tree.find(n => n.id === targetNodeId);

    if (sourceNode) {
      sourceNode.connections = sourceNode.connections.filter(id => id !== targetNodeId);
      console.log(`Connection removed: ${sourceNodeId} -X> ${targetNodeId}`);
    } else {
      console.warn(`Source node with ID ${sourceNodeId} not found for connection removal.`);
    }

    // Also clear parentId if the target node is no longer connected to this source
    if (targetNode && targetNode.parentId === sourceNodeId) {
      targetNode.parentId = null; // Clear parent if this was its parent
      console.log(`Parent ID cleared for node ${targetNodeId}`);
    }
  }
  /**
   * @method deleteNode
   * @param nodeId The ID of the node to delete.
   * @description Removes a node from the tree and handles cleanup of its connections.
   * This includes removing the connection from its parent and setting the parentId of its children to null.
   */
  deleteNode(nodeId: string): void {
    const nodeIndex = this.tree.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      console.warn(`Node with ID ${nodeId} not found for deletion.`);
      return;
    }

    const nodeToDelete = this.tree[nodeIndex];

    // 1. Remove connection from the parent node
    if (nodeToDelete.parentId) {
      const parentNode = this.tree.find(n => n.id === nodeToDelete.parentId);
      if (parentNode) {
        parentNode.connections = parentNode.connections.filter(id => id !== nodeId);
      }
    }

    // 2. Clear parentId for all direct children, making them orphans
    if (nodeToDelete.connections.length > 0) {
      nodeToDelete.connections.forEach(childId => {
        const childNode = this.tree.find(n => n.id === childId);
        if (childNode) {
          childNode.parentId = null;
        }
      });
    }

    // 3. Remove the node itself from the tree
    this.tree.splice(nodeIndex, 1);
    console.log(`Node ${nodeId} and its connections have been removed.`);
    console.log('Current tree:', this.tree);
  }
}