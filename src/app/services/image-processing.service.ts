import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {

  constructor() { }

  /**
   * NEW: Calculates the optimal threshold for an image using Otsu's method.
   * @param base64Image The base64 data URL of the source image.
   * @returns A Promise that resolves with the optimal threshold value (0-255).
   */
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

        // 1. Create a grayscale histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          // Using luminance formula for grayscale conversion
          const greyscale = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          histogram[greyscale]++;
        }

        const totalPixels = img.width * img.height;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0; // weight background
        let wF = 0; // weight foreground

        let varMax = 0;
        let threshold = 0;

        // 2. Iterate through all possible thresholds
        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;

          wF = totalPixels - wB;
          if (wF === 0) break;

          sumB += t * histogram[t];

          const mB = sumB / wB; // mean background
          const mF = (sum - sumB) / wF; // mean foreground

          // 3. Calculate Between-Class Variance
          const varBetween = wB * wF * (mB - mF) * (mB - mF);

          // 4. Check if new maximum found
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

  /**
   * NEW: Applies a noise reduction filter to an image using one of several methods.
   * @param base64Image The base64 data URL of the source image.
   * @param operation The noise reduction operation: 'min', 'median', or 'max'.
   * @returns A Promise that resolves with the base64 data URL of the resulting image.
   */
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

  /**
   * Combines two images pixel by pixel based on a specified operation.
   * @param base64ImageA The base64 data URL of the first source image.
   * @param base64ImageB The base64 data URL of the second source image.
   * @param operation The operation to perform: 'add', 'average', or 'rms'.
   * @returns A Promise that resolves with the base64 data URL of the resulting image.
   */
  applyAddOperation(base64ImageA: string, base64ImageB: string, operation: 'add' | 'average' | 'root'): Promise<string> {
    return new Promise((resolve, reject) => {
      const imgA = new Image();
      const imgB = new Image();
      let loadedCount = 0;

      const onImageLoad = () => {
        loadedCount++;
        if (loadedCount < 2) return; // Wait for both images to load

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get 2D context.'));

        if(imgA.width != imgB.width || imgA.height != imgB.height){
          alert("The images have different sizes");
          return resolve('');
        }

        canvas.width = imgA.width;
        canvas.height = imgA.height;
        
        // Draw and get data for both images, scaling them to the new dimension
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
            case 'root': // Root of sum of squares
              r = Math.sqrt(Math.pow(rA, 2) + Math.pow(rB, 2));
              g = Math.sqrt(Math.pow(gA, 2) + Math.pow(gB, 2));
              b = Math.sqrt(Math.pow(bA, 2) + Math.pow(bB, 2));
              break;
          }

          resultData[i] = Math.max(0, Math.min(255, r));
          resultData[i + 1] = Math.max(0, Math.min(255, g));
          resultData[i + 2] = Math.max(0, Math.min(255, b));
          resultData[i + 3] = 255; // Alpha
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

  /**
   * Applies a convolution matrix (kernel) to an image.
   * @param base64Image The base64 data URL of the source image.
   * @param matrix The convolution matrix (e.g., 3x3 or 5x5).
   * @param divisor The number to divide the resulting pixel value by.
   * @returns A Promise that resolves with the base64 data URL of the filtered image.
   */
  applyConvolution(base64Image: string, matrix: number[][], divisor: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use a local variable for the divisor, defaulting to 1 to prevent division by zero.
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
  
  /**
   * Applies a greyscale filter to an image.
   * @param base64Image The base64 data URL of the source image.
   * @returns A Promise that resolves with the base64 data URL of the greyscaled image.
   */
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
