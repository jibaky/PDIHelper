import { Injectable } from '@angular/core';
import { ColorType } from '../model/treeNode.model';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {

  constructor() { }

  /**
   * NEW: Analyzes an image to determine if it is color, greyscale, or binary.
   * @param base64Image The base64 data URL of the source image.
   * @returns A Promise that resolves with the ColorType ('color', 'greyscale', or 'binary').
   */
  async getImageColorType(base64Image: string): Promise<ColorType> {
    return new Promise((resolve, reject) => {
      if (!base64Image) {
        return reject(new Error('No image data provided for color analysis.'));
      }
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // The willReadFrequently hint can improve performance on some browsers
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error('Failed to get 2D context for color analysis.'));

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let isGreyscale = true;
        let isBinary = true;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if the pixel is not greyscale
          if (r !== g || r !== b) {
            isGreyscale = false;
            break; // Exit loop immediately, it's a color image
          }
          // If a greyscale pixel is not pure black or pure white, it's not binary
          if (r !== 0 && r !== 255) {
            isBinary = false;
          }
        }
        
        if (!isGreyscale) {
          resolve('color');
        } else {
          if (isBinary) {
            resolve('binary');
          } else {
            resolve('greyscale');
          }
        }
      };
      img.onerror = (e) => reject(new Error('Failed to load image for color analysis.'));
      img.src = base64Image;
    });
  }

  /**
   * Applies the Zhang-Suen skeletonization algorithm to a binary image.
   * @param base64Image The base64 data URL of the source binary image.
   * @returns A Promise that resolves with the base64 data URL of the skeletonized image.
   */
  applyZhangSuenSkeletonization(base64Image: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('Failed to get 2D context.'));

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Create a binary matrix (1 for foreground, 0 for background)
            let matrix: number[][] = Array.from({ length: img.height }, () => new Array(img.width).fill(0));
            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const index = (y * img.width + x) * 4;
                    // If pixel is not black, it's foreground
                    if (data[index] > 127) {
                        matrix[y][x] = 1;
                    }
                }
            }

            let pixelsToRemove: [number, number][] = [];
            let changed = true;

            while (changed) {
                changed = false;

                // Step 1
                for (let y = 1; y < img.height - 1; y++) {
                    for (let x = 1; x < img.width - 1; x++) {
                        if (matrix[y][x] !== 1) continue;
                        
                        const p2 = matrix[y-1][x];
                        const p3 = matrix[y-1][x+1];
                        const p4 = matrix[y][x+1];
                        const p5 = matrix[y+1][x+1];
                        const p6 = matrix[y+1][x];
                        const p7 = matrix[y+1][x-1];
                        const p8 = matrix[y][x-1];
                        const p9 = matrix[y-1][x-1];

                        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                        if (B < 2 || B > 6) continue;

                        let A = 0;
                        if (p2 === 0 && p3 === 1) A++;
                        if (p3 === 0 && p4 === 1) A++;
                        if (p4 === 0 && p5 === 1) A++;
                        if (p5 === 0 && p6 === 1) A++;
                        if (p6 === 0 && p7 === 1) A++;
                        if (p7 === 0 && p8 === 1) A++;
                        if (p8 === 0 && p9 === 1) A++;
                        if (p9 === 0 && p2 === 1) A++;
                        if (A !== 1) continue;

                        if (p2 * p4 * p6 !== 0) continue;
                        if (p4 * p6 * p8 !== 0) continue;

                        pixelsToRemove.push([y, x]);
                    }
                }

                if (pixelsToRemove.length > 0) {
                    changed = true;
                    pixelsToRemove.forEach(([y, x]) => matrix[y][x] = 0);
                    pixelsToRemove = [];
                }

                // Step 2
                for (let y = 1; y < img.height - 1; y++) {
                    for (let x = 1; x < img.width - 1; x++) {
                        if (matrix[y][x] !== 1) continue;

                        const p2 = matrix[y-1][x];
                        const p3 = matrix[y-1][x+1];
                        const p4 = matrix[y][x+1];
                        const p5 = matrix[y+1][x+1];
                        const p6 = matrix[y+1][x];
                        const p7 = matrix[y+1][x-1];
                        const p8 = matrix[y][x-1];
                        const p9 = matrix[y-1][x-1];

                        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                        if (B < 2 || B > 6) continue;
                        
                        let A = 0;
                        if (p2 === 0 && p3 === 1) A++;
                        if (p3 === 0 && p4 === 1) A++;
                        if (p4 === 0 && p5 === 1) A++;
                        if (p5 === 0 && p6 === 1) A++;
                        if (p6 === 0 && p7 === 1) A++;
                        if (p7 === 0 && p8 === 1) A++;
                        if (p8 === 0 && p9 === 1) A++;
                        if (p9 === 0 && p2 === 1) A++;
                        if (A !== 1) continue;
                        
                        if (p2 * p4 * p8 !== 0) continue;
                        if (p2 * p6 * p8 !== 0) continue;

                        pixelsToRemove.push([y, x]);
                    }
                }

                if (pixelsToRemove.length > 0) {
                    changed = true;
                    pixelsToRemove.forEach(([y, x]) => matrix[y][x] = 0);
                    pixelsToRemove = [];
                }
            }

            // Draw the matrix back to the canvas
            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const color = matrix[y][x] === 1 ? 255 : 0;
                    const index = (y * img.width + x) * 4;
                    data[index] = color;
                    data[index + 1] = color;
                    data[index + 2] = color;
                    data[index + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(new Error('Failed to load image for skeletonization.'));
        img.src = base64Image;
    });
  }
  
  applyMorphology(base64Image: string, operation: 'dilation' | 'erosion', shape: 'square' | 'circle', size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const radius = Math.floor(size / 2);

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return reject(new Error('Failed to get source 2D context.'));
        srcCtx.drawImage(img, 0, 0);
        const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);
        const srcData = srcImageData.data;

        const destCanvas = document.createElement('canvas');
        destCanvas.width = img.width;
        destCanvas.height = img.height;
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) return reject(new Error('Failed to get destination 2D context.'));
        const destImageData = destCtx.createImageData(img.width, img.height);
        const destData = destImageData.data;
        
        const foreground = 255; // White
        const background = 0;   // Black

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            let hit = false;
            for (let ky = -radius; ky <= radius; ky++) {
              for (let kx = -radius; kx <= radius; kx++) {
                if (shape === 'circle' && (kx * kx + ky * ky) > (radius * radius)) {
                  continue;
                }
                const pixelY = y + ky;
                const pixelX = x + kx;

                if (pixelY >= 0 && pixelY < img.height && pixelX >= 0 && pixelX < img.width) {
                  const neighborIndex = (pixelY * img.width + pixelX) * 4;
                  if (srcData[neighborIndex] === foreground) {
                    hit = true;
                    break; 
                  }
                }
              }
              if (hit && operation === 'dilation') break;
            }
            
            const destIndex = (y * img.width + x) * 4;
            let finalColor;

            if (operation === 'dilation') {
                finalColor = hit ? foreground : background;
            } else { // Erosion
                let fit = true;
                for (let ky = -radius; ky <= radius; ky++) {
                  for (let kx = -radius; kx <= radius; kx++) {
                    if (shape === 'circle' && (kx * kx + ky * ky) > (radius * radius)) {
                      continue;
                    }
                    const pixelY = y + ky;
                    const pixelX = x + kx;

                    if (pixelY >= 0 && pixelY < img.height && pixelX >= 0 && pixelX < img.width) {
                       const neighborIndex = (pixelY * img.width + pixelX) * 4;
                       if (srcData[neighborIndex] === background) {
                           fit = false;
                           break;
                       }
                    } else {
                       fit = false;
                       break;
                    }
                  }
                  if (!fit) break;
                }
                finalColor = fit ? foreground : background;
            }

            destData[destIndex] = finalColor;
            destData[destIndex + 1] = finalColor;
            destData[destIndex + 2] = finalColor;
            destData[destIndex + 3] = 255;
          }
        }

        destCtx.putImageData(destImageData, 0, 0);
        resolve(destCanvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(new Error('Failed to load image for morphology operation.'));
      img.src = base64Image;
    });
  }

  async calculateOtsuThreshold(base64Image: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get 2D context.'));

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const greyscale = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          histogram[greyscale]++;
        }

        const totalPixels = img.width * img.height;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;

        let varMax = 0;
        let threshold = 0;

        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;

          wF = totalPixels - wB;
          if (wF === 0) break;

          sumB += t * histogram[t];

          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;

          const varBetween = wB * wF * (mB - mF) * (mB - mF);

          if (varBetween > varMax) {
            varMax = varBetween;
            threshold = t;
          }
        }
        
        resolve(threshold);
      };
      img.onerror = (e) => reject(new Error("Failed to load image for Otsu's method calculation."));
      img.src = base64Image;
    });
  }

  applyNoiseReduction(base64Image: string, operation: 'min' | 'median' | 'max'): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const kernelSize = 3;
        const radius = Math.floor(kernelSize / 2);

        const newWidth = img.width - (2 * radius);
        const newHeight = img.height - (2 * radius);
        
        if (newWidth <= 0 || newHeight <= 0) {
          return reject(new Error('Resulting image has zero or negative dimensions.'));
        }
        
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return reject(new Error('Failed to get 2D context.'));
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, img.width, img.height).data;
        
        const destCanvas = document.createElement('canvas');
        destCanvas.width = newWidth;
        destCanvas.height = newHeight;
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) return reject(new Error('Failed to get 2D context for destination.'));
        const destImageData = destCtx.createImageData(newWidth, newHeight);
        const destData = destImageData.data;

        for (let y = 0; y < newHeight; y++) {
          for (let x = 0; x < newWidth; x++) {
            const neighborhoodR: number[] = [];
            const neighborhoodG: number[] = [];
            const neighborhoodB: number[] = [];

            for (let ky = -radius; ky <= radius; ky++) {
              for (let kx = -radius; kx <= radius; kx++) {
                const pixelY = y + radius + ky;
                const pixelX = x + radius + kx;
                const srcIndex = (pixelY * img.width + pixelX) * 4;
                
                neighborhoodR.push(srcData[srcIndex]);
                neighborhoodG.push(srcData[srcIndex + 1]);
                neighborhoodB.push(srcData[srcIndex + 2]);
              }
            }

            let r = 0, g = 0, b = 0;
            if (operation === 'median') {
              neighborhoodR.sort((a, b) => a - b);
              neighborhoodG.sort((a, b) => a - b);
              neighborhoodB.sort((a, b) => a - b);
              const mid = Math.floor(neighborhoodR.length / 2);
              r = neighborhoodR[mid];
              g = neighborhoodG[mid];
              b = neighborhoodB[mid];
            } else if (operation === 'min') {
              r = Math.min(...neighborhoodR);
              g = Math.min(...neighborhoodG);
              b = Math.min(...neighborhoodB);
            } else { // max
              r = Math.max(...neighborhoodR);
              g = Math.max(...neighborhoodG);
              b = Math.max(...neighborhoodB);
            }
            
            const destIndex = (y * newWidth + x) * 4;
            destData[destIndex] = r;
            destData[destIndex + 1] = g;
            destData[destIndex + 2] = b;
            destData[destIndex + 3] = 255;
          }
        }
        destCtx.putImageData(destImageData, 0, 0);
        resolve(destCanvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(new Error('Failed to load image for noise reduction.'));
      img.src = base64Image;
    });
  }

  applyAddOperation(base64ImageA: string, base64ImageB: string, operation: 'add' | 'average' | 'root'): Promise<string> {
    return new Promise((resolve, reject) => {
      const imgA = new Image();
      const imgB = new Image();
      let loadedCount = 0;

      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount < 2) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get 2D context.'));

        if(imgA.width != imgB.width || imgA.height != imgB.height){
          alert("The images have different sizes");
          return resolve('');
        }

        canvas.width = imgA.width;
        canvas.height = imgA.height;
        
        const canvasA = document.createElement('canvas');
        canvasA.width = canvas.width;
        canvasA.height = canvas.height;
        const ctxA = canvasA.getContext('2d')!;
        ctxA.drawImage(imgA, 0, 0, canvas.width, canvas.height);
        const dataA = ctxA.getImageData(0, 0, canvas.width, canvas.height).data;

        const canvasB = document.createElement('canvas');
        canvasB.width = canvas.width;
        canvasB.height = canvas.height;
        const ctxB = canvasB.getContext('2d')!;
        ctxB.drawImage(imgB, 0, 0, canvas.width, canvas.height);
        const dataB = ctxB.getImageData(0, 0, canvas.width, canvas.height).data;
        
        const resultImageData = ctx.createImageData(canvas.width, canvas.height);
        const resultData = resultImageData.data;

        for (let i = 0; i < resultData.length; i += 4) {
          const rA = dataA[i], gA = dataA[i + 1], bA = dataA[i + 2];
          const rB = dataB[i], gB = dataB[i + 1], bB = dataB[i + 2];
          let r = 0, g = 0, b = 0;

          switch (operation) {
            case 'add':
              r = rA + rB;
              g = gA + gB;
              b = bA + bB;
              break;
            case 'average':
              r = (rA + rB) / 2;
              g = (gA + gB) / 2;
              b = (bA + bB) / 2;
              break;
            case 'root':
              r = Math.sqrt(Math.pow(rA, 2) + Math.pow(rB, 2));
              g = Math.sqrt(Math.pow(gA, 2) + Math.pow(gB, 2));
              b = Math.sqrt(Math.pow(bA, 2) + Math.pow(bB, 2));
              break;
          }

          resultData[i] = Math.max(0, Math.min(255, r));
          resultData[i + 1] = Math.max(0, Math.min(255, g));
          resultData[i + 2] = Math.max(0, Math.min(255, b));
          resultData[i + 3] = 255;
        }

        ctx.putImageData(resultImageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      imgA.crossOrigin = "Anonymous";
      imgB.crossOrigin = "Anonymous";
      imgA.onload = onImageLoad;
      imgB.onload = onImageLoad;
      imgA.onerror = (e) => reject(new Error('Failed to load first image for Add operation'));
      imgB.onerror = (e) => reject(new Error('Failed to load second image for Add operation'));
      imgA.src = base64ImageA;
      imgB.src = base64ImageB;
    });
  }

  applyConvolution(base64Image: string, matrix: number[][], divisor: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const safeDivisor = divisor === 0 ? 1 : divisor;

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const matrixSize = matrix.length;
        const matrixRadius = Math.floor(matrixSize / 2);

        const newWidth = img.width - (2 * matrixRadius);
        const newHeight = img.height - (2 * matrixRadius);

        if (newWidth <= 0 || newHeight <= 0) {
          return reject(new Error('Resulting image has zero or negative dimensions after applying the filter.'));
        }

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return reject(new Error('Failed to get 2D context.'));
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, img.width, img.height).data;

        const destCanvas = document.createElement('canvas');
        destCanvas.width = newWidth;
        destCanvas.height = newHeight;
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) return reject(new Error('Failed to get 2D context.'));
        const destImageData = destCtx.createImageData(newWidth, newHeight);
        const destData = destImageData.data;
        
        for (let y = 0; y < newHeight; y++) {
          for (let x = 0; x < newWidth; x++) {
            let r = 0, g = 0, b = 0;

            const srcY = y;
            const srcX = x;

            for (let matrixY = 0; matrixY < matrixSize; matrixY++) {
              for (let matrixX = 0; matrixX < matrixSize; matrixX++) {
                const pixelY = srcY + matrixY;
                const pixelX = srcX + matrixX;
                
                const srcIndex = (pixelY * img.width + pixelX) * 4;
                const weight = matrix[matrixY][matrixX];

                r += srcData[srcIndex] * weight;
                g += srcData[srcIndex + 1] * weight;
                b += srcData[srcIndex + 2] * weight;
              }
            }
            
            const destIndex = (y * newWidth + x) * 4;

            destData[destIndex] = Math.max(0, Math.min(255, r / safeDivisor));
            destData[destIndex + 1] = Math.max(0, Math.min(255, g / safeDivisor));
            destData[destIndex + 2] = Math.max(0, Math.min(255, b / safeDivisor));
            destData[destIndex + 3] = 255;
          }
        }

        destCtx.putImageData(destImageData, 0, 0);
        resolve(destCanvas.toDataURL('image/png'));
      };
      img.onerror = (error) => reject(error);
      img.src = base64Image;
    });
  }
  
  applyGreyscale(base64Image: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        return reject(new Error('Failed to get 2D context from canvas.'));
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const grey = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          data[i] = grey;
          data[i + 1] = grey;
          data[i + 2] = grey;
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => {
        reject(error);
      };

      img.src = base64Image;
    });
  }

  applyThreshold(base64Image: string, threshold: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        return reject(new Error('Failed to get 2D context from canvas.'));
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const value = data[i] < threshold ? 0 : 255;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => {
        reject(error);
      };

      img.src = base64Image;
    });
  }

  applyHistogramEqualization(base64Image: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Failed to get 2D context.'));

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalPixels = canvas.width * canvas.height;

        const hslPixels: { h: number, s: number, l: number }[] = [];
        const lightnessHistogram: { [key: number]: number } = {};

        for (let i = 0; i < data.length; i += 4) {
          const hsl = this.RGBtoHSL(data[i], data[i + 1], data[i + 2]);
          hslPixels.push({ h: hsl[0], s: hsl[1], l: hsl[2] });
          
          const lValue = hsl[2];
          lightnessHistogram[lValue] = (lightnessHistogram[lValue] || 0) + 1;
        }

        const cdf: { [key: number]: number } = {};
        let cumulative = 0;
        const sortedLightnessKeys = Object.keys(lightnessHistogram).map(Number).sort((a, b) => a - b);
        
        for (const lValue of sortedLightnessKeys) {
          cumulative += lightnessHistogram[lValue];
          cdf[lValue] = cumulative;
        }

        const fEq: { [key: number]: number } = {};
        const cdfMin = cdf[sortedLightnessKeys[0]];

        for (const lValue of sortedLightnessKeys) {
          const numerator = cdf[lValue] - cdfMin;
          const denominator = totalPixels - cdfMin;
          fEq[lValue] = Math.round((numerator / denominator) * 255);
        }

        for (let i = 0; i < hslPixels.length; i++) {
          const pixel = hslPixels[i];
          const equalizedL = fEq[pixel.l];
          const rgb = this.HSLtoRGB(pixel.h, pixel.s, equalizedL);
          
          data[i * 4] = rgb[0];
          data[i * 4 + 1] = rgb[1];
          data[i * 4 + 2] = rgb[2];
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => reject(error);
      img.src = base64Image;
    });
  }

  private RGBtoHSL(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max-min;
    let h = 0, s = 0, l = 0;

    if (delta == 0) h = 0;
    else if(max == r) h = ((g - b) / delta) % 6;
    else if(max == g) h = (b - r) / delta + 2;
    else  h = (r - g) / delta + 4;

    h = Math.round(h*40);
    if(h<0) h+=240;
    
    l = (max + min)/2

    s = delta == 0 ? 0: delta/(1-Math.abs(2*l-1));

    s = +(s * 240)
    l = +(l * 240)

    return [Math.round(h), Math.round(s), Math.round(l)];
  }
  private hue2rgb(p: number, q: number, t: number){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  private HSLtoRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 240, s /= 240, l /= 240
    let r, g, b;
    if(s == 0) r = g = b = l;
    else{
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = this.hue2rgb(p, q, h + 1/3);
      g = this.hue2rgb(p, q, h);
      b = this.hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)]
  }
}
