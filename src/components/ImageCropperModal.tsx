import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ImageCropperModalProps {
  imageUrl: string;
  onCrop: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropperModal({ imageUrl, onCrop, onCancel }: ImageCropperModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCrop = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to a reasonable resolution (800x600 max)
      const maxWidth = 800;
      const maxHeight = 600;
      
      let { width, height } = img;
      
      // Scale down if image is too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image to canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedImageUrl = URL.createObjectURL(blob);
          console.log('Image cropped successfully, URL:', croppedImageUrl);
          onCrop(croppedImageUrl);
        } else {
          console.error('Failed to create blob from canvas');
          alert('Failed to process image. Please try again.');
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  }, [onCrop]);

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
  };

  const handleImageError = () => {
    console.error('Failed to load image');
    alert('Failed to load image. Please try again.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-[#ffffff] border-[#a8b892] max-w-2xl w-full max-h-[90vh] overflow-auto">
        <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
          <CardTitle>Add Photo</CardTitle>
          <p className="text-[#a8b892] text-sm">
            Preview your image and click "Add Photo" to confirm
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="max-w-full max-h-96 overflow-hidden rounded-lg border-2 border-[#a8b892]">
                <img
                  ref={imgRef}
                  alt="Preview"
                  src={imageUrl}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className="max-w-full max-h-96 object-contain"
                />
              </div>
            </div>
            
            {/* Hidden canvas for processing */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            <div className="flex gap-3">
              <Button
                onClick={handleCrop}
                disabled={isProcessing}
                className="flex-1 bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
              >
                {isProcessing ? 'Processing...' : 'Add Photo'}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}