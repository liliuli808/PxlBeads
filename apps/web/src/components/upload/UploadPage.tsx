import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';

const MAX_IMAGE_DIMENSION = 512;

function resizeToMaxDimension(bitmap: ImageBitmap): ImageData {
  let { width, height } = bitmap;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function UploadPage() {
  const navigate = useNavigate();
  const setImageData = useProjectStore((s) => s.setImageData);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (imageFile) {
          e.preventDefault();
          processFile(imageFile);
        }
        return;
      }

      const items = e.clipboardData?.items;
      if (items) {
        const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
        const file = imageItem?.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件（JPEG/PNG/WebP）');
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const imageData = resizeToMaxDimension(bitmap);
      setImageData(imageData);
      navigate('/editor');
    } catch {
      setError('无法读取图片，请尝试其他文件');
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold mb-4">图片转拼豆图纸</h1>
        <p className="text-gray-600 mb-8">上传任意图片，自动匹配品牌色号并生成可打印图纸。</p>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            'border-2 border-dashed rounded-xl p-12 transition-colors cursor-pointer',
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400',
          ].join(' ')}
        >
          <label className="flex flex-col items-center cursor-pointer">
            <span className="text-5xl mb-4">📷</span>
            <span className="text-lg font-medium mb-2">拖拽图片到此处，或点击上传</span>
            <span className="text-sm text-gray-500">支持 JPEG、PNG、WebP，也可直接 Ctrl+V 粘贴</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onInputChange}
            />
          </label>
        </div>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    </div>
  );
}
