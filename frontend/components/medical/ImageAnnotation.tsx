'use client'

/**
 * 影像标注组件
 * 
 * 支持矩形、圆形、箭头、文本等标注工具
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface ImageAnnotationProps {
  imageUrl: string
  annotations?: Annotation[]
  onAnnotationsChange?: (annotations: Annotation[]) => void
  onAnnotationSelect?: (annotation: Annotation | null) => void
  readOnly?: boolean
  className?: string
}

interface Annotation {
  id: string
  type: 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand'
  points: Point[]
  text?: string
  color: string
  strokeWidth: number
  created: string
  createdBy: string
}

interface Point {
  x: number
  y: number
}

interface AnnotationTool {
  type: Annotation['type']
  name: string
  icon: string
}

const ImageAnnotation: React.FC<ImageAnnotationProps> = ({
  imageUrl,
  annotations = [],
  onAnnotationsChange,
  onAnnotationSelect,
  readOnly = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [currentTool, setCurrentTool] = useState<Annotation['type']>('rectangle')
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const tools: AnnotationTool[] = [
    { type: 'rectangle', name: '矩形', icon: '⬜' },
    { type: 'circle', name: '圆形', icon: '⭕' },
    { type: 'arrow', name: '箭头', icon: '➡️' },
    { type: 'text', name: '文本', icon: '📝' },
    { type: 'freehand', name: '自由绘制', icon: '✏️' }
  ]

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ffffff', '#000000'
  ]

  // 加载图像
  useEffect(() => {
    if (!imageUrl) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      resizeCanvas()
      redrawCanvas()
    }

    img.src = imageUrl
  }, [imageUrl])

  // 调整画布大小
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const img = imageRef.current

    if (!canvas || !container || !img) return

    const containerRect = container.getBoundingClientRect()
    const imgAspect = img.width / img.height
    const containerAspect = containerRect.width / containerRect.height

    let canvasWidth, canvasHeight

    if (imgAspect > containerAspect) {
      canvasWidth = containerRect.width
      canvasHeight = containerRect.width / imgAspect
    } else {
      canvasWidth = containerRect.height * imgAspect
      canvasHeight = containerRect.height
    }

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    setScale(Math.min(canvasWidth / img.width, canvasHeight / img.height))
    setOffset({
      x: (containerRect.width - canvasWidth) / 2,
      y: (containerRect.height - canvasHeight) / 2
    })

  }, [imageLoaded])

  // 重绘画布
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制图像
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // 绘制标注
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation)
    })

    // 绘制当前正在创建的标注
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation)
    }

  }, [annotations, currentAnnotation, imageLoaded])

  // 绘制标注
  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color
    ctx.lineWidth = annotation.strokeWidth
    ctx.fillStyle = annotation.color

    const points = annotation.points.map(p => ({
      x: p.x * scale,
      y: p.y * scale
    }))

    switch (annotation.type) {
      case 'rectangle':
        if (points.length >= 2) {
          const width = points[1].x - points[0].x
          const height = points[1].y - points[0].y
          ctx.strokeRect(points[0].x, points[0].y, width, height)
        }
        break

      case 'circle':
        if (points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) + 
            Math.pow(points[1].y - points[0].y, 2)
          )
          ctx.beginPath()
          ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
        break

      case 'arrow':
        if (points.length >= 2) {
          drawArrow(ctx, points[0], points[1])
        }
        break

      case 'text':
        if (points.length >= 1 && annotation.text) {
          ctx.font = `${annotation.strokeWidth * 8}px Arial`
          ctx.fillText(annotation.text, points[0].x, points[0].y)
        }
        break

      case 'freehand':
        if (points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
          }
          ctx.stroke()
        }
        break
    }

    // 如果是选中的标注，绘制选择框
    if (annotation === selectedAnnotation) {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      
      if (points.length >= 2) {
        const minX = Math.min(...points.map(p => p.x))
        const minY = Math.min(...points.map(p => p.y))
        const maxX = Math.max(...points.map(p => p.x))
        const maxY = Math.max(...points.map(p => p.y))
        
        ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10)
      }
      
      ctx.setLineDash([])
    }
  }

  // 绘制箭头
  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const headLength = 15
    const angle = Math.atan2(end.y - start.y, end.x - start.x)

    // 绘制线条
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    // 绘制箭头头部
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
  }

  // 重绘画布
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // 窗口大小变化时调整画布
  useEffect(() => {
    const handleResize = () => {
      resizeCanvas()
      redrawCanvas()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [resizeCanvas, redrawCanvas])

  // 获取鼠标在画布上的坐标
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    }
  }

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return

    const point = getCanvasPoint(e)
    setStartPoint(point)
    setIsDrawing(true)

    // 检查是否点击了现有标注
    const clickedAnnotation = findAnnotationAtPoint(point)
    if (clickedAnnotation) {
      setSelectedAnnotation(clickedAnnotation)
      onAnnotationSelect?.(clickedAnnotation)
      return
    }

    setSelectedAnnotation(null)
    onAnnotationSelect?.(null)

    // 开始创建新标注
    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}`,
      type: currentTool,
      points: [point],
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      created: new Date().toISOString(),
      createdBy: 'current_user'
    }

    if (currentTool === 'text') {
      const text = prompt('请输入文本:')
      if (text) {
        newAnnotation.text = text
        newAnnotation.points = [point]
        const updatedAnnotations = [...annotations, newAnnotation]
        onAnnotationsChange?.(updatedAnnotations)
      }
      setIsDrawing(false)
      return
    }

    setCurrentAnnotation(newAnnotation)
  }

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !currentAnnotation || readOnly) return

    const point = getCanvasPoint(e)

    if (currentAnnotation.type === 'freehand') {
      // 自由绘制：添加点
      setCurrentAnnotation(prev => prev ? {
        ...prev,
        points: [...prev.points, point]
      } : null)
    } else {
      // 其他工具：更新终点
      setCurrentAnnotation(prev => prev ? {
        ...prev,
        points: [startPoint, point]
      } : null)
    }

    redrawCanvas()
  }

  // 鼠标抬起
  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation || readOnly) return

    setIsDrawing(false)
    setStartPoint(null)

    // 添加到标注列表
    const updatedAnnotations = [...annotations, currentAnnotation]
    onAnnotationsChange?.(updatedAnnotations)
    
    setCurrentAnnotation(null)
  }

  // 查找点击位置的标注
  const findAnnotationAtPoint = (point: Point): Annotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      if (isPointInAnnotation(point, annotation)) {
        return annotation
      }
    }
    return null
  }

  // 检查点是否在标注内
  const isPointInAnnotation = (point: Point, annotation: Annotation): boolean => {
    const points = annotation.points

    switch (annotation.type) {
      case 'rectangle':
        if (points.length >= 2) {
          const minX = Math.min(points[0].x, points[1].x)
          const maxX = Math.max(points[0].x, points[1].x)
          const minY = Math.min(points[0].y, points[1].y)
          const maxY = Math.max(points[0].y, points[1].y)
          return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
        }
        break

      case 'circle':
        if (points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) + 
            Math.pow(points[1].y - points[0].y, 2)
          )
          const distance = Math.sqrt(
            Math.pow(point.x - points[0].x, 2) + 
            Math.pow(point.y - points[0].y, 2)
          )
          return distance <= radius
        }
        break

      case 'text':
        if (points.length >= 1) {
          // 简单的文本边界检查
          const textWidth = (annotation.text?.length || 0) * annotation.strokeWidth * 4
          const textHeight = annotation.strokeWidth * 8
          return point.x >= points[0].x && point.x <= points[0].x + textWidth &&
                 point.y >= points[0].y - textHeight && point.y <= points[0].y
        }
        break
    }

    return false
  }

  // 删除选中的标注
  const deleteSelectedAnnotation = () => {
    if (selectedAnnotation) {
      const updatedAnnotations = annotations.filter(a => a.id !== selectedAnnotation.id)
      onAnnotationsChange?.(updatedAnnotations)
      setSelectedAnnotation(null)
      onAnnotationSelect?.(null)
    }
  }

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedAnnotation && !readOnly) {
        deleteSelectedAnnotation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotation, readOnly])

  return (
    <div className={`image-annotation ${className} flex flex-col h-full`}>
      {/* 工具栏 */}
      {!readOnly && (
        <div className="annotation-toolbar bg-gray-100 border-b p-3">
          <div className="flex items-center space-x-4">
            {/* 工具选择 */}
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium">工具:</span>
              {tools.map(tool => (
                <button
                  key={tool.type}
                  onClick={() => setCurrentTool(tool.type)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentTool === tool.type 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border hover:bg-gray-50'
                  }`}
                  title={tool.name}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            <div className="border-l border-gray-300 h-6"></div>

            {/* 颜色选择 */}
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium">颜色:</span>
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-6 h-6 rounded border-2 ${
                    currentColor === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="border-l border-gray-300 h-6"></div>

            {/* 线宽选择 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">线宽:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={currentStrokeWidth}
                onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm w-6">{currentStrokeWidth}</span>
            </div>

            <div className="border-l border-gray-300 h-6"></div>

            {/* 操作按钮 */}
            <button
              onClick={deleteSelectedAnnotation}
              disabled={!selectedAnnotation}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除选中
            </button>
          </div>
        </div>
      )}

      {/* 图像显示区域 */}
      <div 
        ref={containerRef}
        className="annotation-container flex-1 relative overflow-hidden bg-gray-900"
      >
        <canvas
          ref={canvasRef}
          className={`absolute ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          style={{ left: offset.x, top: offset.y }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">加载图像中...</div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="annotation-status bg-gray-800 text-white p-2 text-xs">
        <div className="flex items-center justify-between">
          <div>
            标注数量: {annotations.length}
            {selectedAnnotation && (
              <span className="ml-4">
                选中: {selectedAnnotation.type} ({selectedAnnotation.color})
              </span>
            )}
          </div>
          <div>
            {!readOnly && '左键绘制 • Delete键删除选中 • 点击标注选择'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageAnnotation
