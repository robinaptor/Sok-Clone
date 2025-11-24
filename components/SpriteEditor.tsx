import React, { useState, useEffect, useRef } from 'react';
import { Actor } from '../types';
import { CANVAS_SIZE } from '../constants';
import { Trash2, Pencil, Eraser, PaintBucket, RefreshCw, Plus, Copy, Circle, ChevronRight, Play, Square, Layers, Lasso, Scissors, Clipboard, X } from 'lucide-react';

interface SpriteEditorProps {
    actor: Actor;
    onUpdate: (updatedActor: Actor) => void;
    onDelete: (actorId: string) => void;
    isHero: boolean;
}
interface FloatingLayer {
    imageData: ImageData;
    x: number;
    y: number;
    width: number;
    height: number;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({ actor, onUpdate, onDelete, isHero }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const [name, setName] = useState(actor.name);
    const [color, setColor] = useState('#000000');
    const [tool, setTool] = useState<'PENCIL' | 'ERASER' | 'FILL' | 'SELECT'>('PENCIL');

    // Commit floating layer when tool changes (if not SELECT)
    useEffect(() => {
        if (tool !== 'SELECT' && floatingLayer) {
            commitFloatingLayer();
        }
    }, [tool]);

    const [brushSize, setBrushSize] = useState<number>(5); // Default Medium
    const [isDrawing, setIsDrawing] = useState(false);

    // SELECTION STATE
    const [selectionPath, setSelectionPath] = useState<{ x: number, y: number }[]>([]);
    const [isSelectionActive, setIsSelectionActive] = useState(false);
    const [selectionClipboard, setSelectionClipboard] = useState<ImageData | null>(null);

    // TRANSFORM STATE
    const [floatingLayer, setFloatingLayer] = useState<FloatingLayer | null>(null);
    const [transformMode, setTransformMode] = useState<'NONE' | 'MOVE' | 'RESIZE_TL' | 'RESIZE_TR' | 'RESIZE_BL' | 'RESIZE_BR'>('NONE');
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [initialLayerState, setInitialLayerState] = useState<FloatingLayer | null>(null);
    const [cursor, setCursor] = useState('crosshair');

    // UI STATE
    const [showBrushSizes, setShowBrushSizes] = useState(false);

    // ANIMATION STATE
    const [frames, setFrames] = useState<string[]>(actor.frames || [actor.imageData]);
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);

    // ONION COLORS
    const [onionPrevColor, setOnionPrevColor] = useState('#ff0000'); // Red
    const [onionNextColor, setOnionNextColor] = useState('#0000ff'); // Blue

    // Initialize canvas with High DPI support (User Logic Merged)
    useEffect(() => {
        if (actor.frames && actor.frames.length > 0) {
            setFrames(actor.frames);
            if (currentFrameIdx >= actor.frames.length) setCurrentFrameIdx(0);
        } else {
            setFrames([actor.imageData]);
            setCurrentFrameIdx(0);
        }
        setName(actor.name);
    }, [actor.id]);

    // Load current frame onto canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = CANVAS_SIZE * dpr;
            canvas.height = CANVAS_SIZE * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

                // Draw ONLY the current frame (onion skin is handled by CSS now)
                const img = new Image();
                img.src = frames[currentFrameIdx] || frames[0];
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                };
            }
        }
    }, [currentFrameIdx, frames]);

    // Draw Selection Overlay & Floating Layer
    useEffect(() => {
        const canvas = selectionCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== CANVAS_SIZE * dpr) {
            canvas.width = CANVAS_SIZE * dpr;
            canvas.height = CANVAS_SIZE * dpr;
            ctx.scale(dpr, dpr);
        }

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.imageSmoothingEnabled = false;

        // Draw Floating Layer
        if (floatingLayer) {
            // Create temp canvas to draw ImageData
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = floatingLayer.imageData.width;
            tempCanvas.height = floatingLayer.imageData.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.putImageData(floatingLayer.imageData, 0, 0);
                ctx.drawImage(tempCanvas, floatingLayer.x, floatingLayer.y, floatingLayer.width, floatingLayer.height);
            }

            // Draw Border around floating layer
            ctx.strokeStyle = '#9333ea'; // Purple
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(floatingLayer.x, floatingLayer.y, floatingLayer.width, floatingLayer.height);
            ctx.setLineDash([]);

            // Draw Resize Handles
            const handleSize = 6;
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#9333ea';

            const handles = [
                { x: floatingLayer.x, y: floatingLayer.y }, // TL
                { x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y }, // TR
                { x: floatingLayer.x, y: floatingLayer.y + floatingLayer.height }, // BL
                { x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y + floatingLayer.height } // BR
            ];

            handles.forEach(h => {
                ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            });
        }

        // Draw Selection Path (only if no floating layer, or if we want to show original selection?)
        // If floating layer exists, the selection path is technically "moved" with it. 
        // For simplicity, let's hide the original selection path when floating layer is active.
        if (selectionPath.length > 0 && !floatingLayer) {
            ctx.beginPath();
            ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
            for (let i = 1; i < selectionPath.length; i++) {
                ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
            }
            if (isSelectionActive) {
                ctx.closePath();
            }

            ctx.strokeStyle = '#000'; // Black dashed line
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();

            // White contrast line
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([0, 4, 4, 0]); // Offset dash
            ctx.stroke();

            ctx.setLineDash([]); // Reset

            if (isSelectionActive) {
                ctx.fillStyle = 'rgba(147, 51, 234, 0.1)'; // Light purple fill
                ctx.fill();
            }
        }
    }, [selectionPath, isSelectionActive, floatingLayer]);

    // Preview Animation Loop
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setCurrentFrameIdx(curr => (curr + 1) % frames.length);
        }, 200); // 5 FPS Preview
        return () => clearInterval(interval);
    }, [isPlaying, frames.length]);

    const saveCurrentFrame = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const newImageData = canvas.toDataURL();
            const newFrames = [...frames];
            newFrames[currentFrameIdx] = newImageData;
            setFrames(newFrames);

            const mainImage = currentFrameIdx === 0 ? newImageData : actor.imageData;
            onUpdate({ ...actor, name, imageData: mainImage, frames: newFrames });
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            saveCurrentFrame();
        }
    };

    // --- FRAME MANAGEMENT ---
    const addFrame = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        const blankFrame = canvas.toDataURL();

        const newFrames = [...frames, blankFrame];
        setFrames(newFrames);
        const newIdx = newFrames.length - 1;
        setCurrentFrameIdx(newIdx);
        onUpdate({ ...actor, frames: newFrames });
    };

    const duplicateFrame = () => {
        const currentData = frames[currentFrameIdx];
        const newFrames = [...frames];
        // Insert copy after current
        newFrames.splice(currentFrameIdx + 1, 0, currentData);
        setFrames(newFrames);
        const newIdx = currentFrameIdx + 1;
        setCurrentFrameIdx(newIdx);
        onUpdate({ ...actor, frames: newFrames });
    };

    const deleteFrame = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        if (frames.length <= 1) return;
        const newFrames = frames.filter((_, i) => i !== idx);
        setFrames(newFrames);
        if (currentFrameIdx >= newFrames.length) {
            setCurrentFrameIdx(newFrames.length - 1);
        } else if (idx < currentFrameIdx) {
            setCurrentFrameIdx(currentFrameIdx - 1);
        }
        onUpdate({
            ...actor,
            frames: newFrames,
            imageData: idx === 0 ? newFrames[0] : actor.imageData
        });
    };

    const getCoordinates = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (CANVAS_SIZE / rect.width),
            y: (e.clientY - rect.top) * (CANVAS_SIZE / rect.height)
        };
    };

    // --- FLOOD FILL LOGIC ---
    const liftSelection = (): FloatingLayer | null => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || selectionPath.length < 3) return null;

        const dpr = window.devicePixelRatio || 1;

        // 1. Calculate bounding box of selection
        let minX = CANVAS_SIZE, minY = CANVAS_SIZE, maxX = 0, maxY = 0;
        selectionPath.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        // Add some padding or ensure integers
        minX = Math.floor(minX);
        minY = Math.floor(minY);
        maxX = Math.ceil(maxX);
        maxY = Math.ceil(maxY);
        const w = maxX - minX;
        const h = maxY - minY;

        if (w <= 0 || h <= 0) return null;

        // 2. Extract pixels
        // We need to mask it first to only get the selected pixels, not the bounding box rect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w * dpr;
        tempCanvas.height = h * dpr;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;

        // Draw image offset by -minX, -minY
        tempCtx.drawImage(canvas, -minX * dpr, -minY * dpr);

        // Mask with selection path (shifted)
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.beginPath();
        tempCtx.moveTo((selectionPath[0].x - minX) * dpr, (selectionPath[0].y - minY) * dpr);
        selectionPath.forEach(p => tempCtx.lineTo((p.x - minX) * dpr, (p.y - minY) * dpr));
        tempCtx.closePath();
        tempCtx.fill();

        const imageData = tempCtx.getImageData(0, 0, w * dpr, h * dpr);

        // 3. Create Floating Layer
        const newLayer: FloatingLayer = {
            imageData,
            x: minX,
            y: minY,
            width: w,
            height: h
        };
        setFloatingLayer(newLayer);

        // 4. Clear from Main Canvas
        ctx.save();
        const path = new Path2D();
        path.moveTo(selectionPath[0].x, selectionPath[0].y);
        selectionPath.forEach(p => path.lineTo(p.x, p.y));
        path.closePath();
        ctx.clip(path);
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.restore();

        saveCurrentFrame(); // Save the "cut" state
        return newLayer;
    };

    const commitFloatingLayer = () => {
        if (!floatingLayer) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = floatingLayer.imageData.width;
        tempCanvas.height = floatingLayer.imageData.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            tempCtx.putImageData(floatingLayer.imageData, 0, 0);
            ctx.drawImage(tempCanvas, floatingLayer.x, floatingLayer.y, floatingLayer.width, floatingLayer.height);
            saveCurrentFrame();
        }

        setFloatingLayer(null);
        // Keep selection active? Or clear it? 
        // Usually committing clears selection or updates it to new bounds.
        // For simplicity, let's clear selection path as it no longer matches the pixels if moved.
        setSelectionPath([]);
        setIsSelectionActive(false);
    };

    const hexToRgba = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b, 255];
    };

    // --- SELECTION OPERATIONS ---
    const deleteSelection = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || selectionPath.length < 3) return;

        ctx.save();
        const path = new Path2D();
        path.moveTo(selectionPath[0].x, selectionPath[0].y);
        selectionPath.forEach(p => path.lineTo(p.x, p.y));
        path.closePath();
        ctx.clip(path);
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.restore();
        saveCurrentFrame();
    };

    const copySelection = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || selectionPath.length < 3) return;

        const dpr = window.devicePixelRatio || 1;

        // Calculate bounding box
        let minX = CANVAS_SIZE, minY = CANVAS_SIZE, maxX = 0, maxY = 0;
        selectionPath.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        minX = Math.floor(minX);
        minY = Math.floor(minY);
        maxX = Math.ceil(maxX);
        maxY = Math.ceil(maxY);
        const w = maxX - minX;
        const h = maxY - minY;

        if (w <= 0 || h <= 0) return;

        // Create a temp canvas to extract the selected area
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w * dpr;
        tempCanvas.height = h * dpr;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw image offset
        tempCtx.drawImage(canvas, -minX * dpr, -minY * dpr);

        // Draw the mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.beginPath();
        tempCtx.moveTo((selectionPath[0].x - minX) * dpr, (selectionPath[0].y - minY) * dpr);
        selectionPath.forEach(p => tempCtx.lineTo((p.x - minX) * dpr, (p.y - minY) * dpr));
        tempCtx.closePath();
        tempCtx.fill();

        setSelectionClipboard(tempCtx.getImageData(0, 0, w * dpr, h * dpr));
    };

    const pasteSelection = () => {
        if (!selectionClipboard) return;

        const dpr = window.devicePixelRatio || 1;

        // Paste as floating layer centered
        const w = selectionClipboard.width / dpr;
        const h = selectionClipboard.height / dpr;
        const x = (CANVAS_SIZE - w) / 2;
        const y = (CANVAS_SIZE - h) / 2;

        setFloatingLayer({
            imageData: selectionClipboard,
            x, y, width: w, height: h
        });

        // Switch to select tool to allow manipulation
        setTool('SELECT');
    };

    const cutSelection = () => {
        copySelection();
        deleteSelection();
    };

    const floodFill = (startX: number, startY: number, fillColor: string) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width;
        const h = canvas.height;

        // Create a temp canvas for the flood fill operation
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Copy current state to temp
        tempCtx.drawImage(canvas, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const px = Math.floor(startX * dpr);
        const py = Math.floor(startY * dpr);

        if (px < 0 || px >= w || py < 0 || py >= h) return;

        const startPos = (py * w + px) * 4;
        const [startR, startG, startB, startA] = [data[startPos], data[startPos + 1], data[startPos + 2], data[startPos + 3]];
        const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

        if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;

        const tolerance = 50;
        const colorMatch = (pos: number) => {
            const diff = Math.abs(data[pos] - startR) + Math.abs(data[pos + 1] - startG) + Math.abs(data[pos + 2] - startB) + Math.abs(data[pos + 3] - startA);
            return diff < tolerance;
        };

        const setPixel = (pos: number) => {
            data[pos] = fillR; data[pos + 1] = fillG; data[pos + 2] = fillB; data[pos + 3] = fillA;
        };

        const stack = [[px, py]];
        const seen = new Uint8Array(w * h);

        while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            const idx = cy * w + cx;
            if (seen[idx]) continue;
            const pos = idx * 4;
            if (colorMatch(pos)) {
                setPixel(pos);
                seen[idx] = 1;
                if (cx > 0) stack.push([cx - 1, cy]);
                if (cx < w - 1) stack.push([cx + 1, cy]);
                if (cy > 0) stack.push([cx, cy - 1]);
                if (cy < h - 1) stack.push([cx, cy + 1]);
            }
        }

        tempCtx.putImageData(imgData, 0, 0);

        // Apply to main canvas with optional clipping
        if (isSelectionActive && selectionPath.length > 2) {
            ctx.save();
            const path = new Path2D();
            path.moveTo(selectionPath[0].x, selectionPath[0].y);
            selectionPath.forEach(p => path.lineTo(p.x, p.y));
            path.closePath();
            ctx.clip(path);
            ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE); // Draw the filled version masked
            ctx.restore();
        } else {
            ctx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }

        saveCurrentFrame();
    };

    const isPointInPath = (x: number, y: number, path: { x: number, y: number }[]) => {
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
            const xi = path[i].x, yi = path[i].y;
            const xj = path[j].x, yj = path[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const { x, y } = getCoordinates(e);

        // 1. Handle Floating Layer Interaction
        if (floatingLayer) {
            const handleSize = 10; // Slightly larger hit area
            // Check Handles
            const handles = [
                { type: 'RESIZE_TL', x: floatingLayer.x, y: floatingLayer.y },
                { type: 'RESIZE_TR', x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y },
                { type: 'RESIZE_BL', x: floatingLayer.x, y: floatingLayer.y + floatingLayer.height },
                { type: 'RESIZE_BR', x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y + floatingLayer.height }
            ];

            for (const h of handles) {
                if (x >= h.x - handleSize / 2 && x <= h.x + handleSize / 2 &&
                    y >= h.y - handleSize / 2 && y <= h.y + handleSize / 2) {
                    setTransformMode(h.type as any);
                    setDragStart({ x, y });
                    setInitialLayerState({ ...floatingLayer });
                    return;
                }
            }

            // Check Inside Floating Layer
            if (x >= floatingLayer.x && x <= floatingLayer.x + floatingLayer.width &&
                y >= floatingLayer.y && y <= floatingLayer.y + floatingLayer.height) {
                setTransformMode('MOVE');
                setDragStart({ x, y });
                setInitialLayerState({ ...floatingLayer });
                return;
            }

            // Click Outside -> Commit
            commitFloatingLayer();
            // Fallthrough to normal tool usage (e.g. start new selection or draw)
        }

        setIsDrawing(true);

        if (tool === 'SELECT') {
            // Check if clicking inside existing selection to LIFT it
            if (isSelectionActive && selectionPath.length > 2 && isPointInPath(x, y, selectionPath)) {
                const liftedLayer = liftSelection();
                if (liftedLayer) {
                    setTransformMode('MOVE');
                    setDragStart({ x, y });
                    setInitialLayerState(liftedLayer);
                }
                return;
            }

            // Start new selection
            if (isSelectionActive) {
                // If we didn't click inside, we are deselecting/starting new
                setIsSelectionActive(false);
                setSelectionPath([]);
            }
            setSelectionPath([{ x, y }]);
            return;
        }

        // ... (Rest of drawing logic)
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (tool === 'FILL') {
            floodFill(x, y, color);
            setIsDrawing(false);
            return;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = tool === 'ERASER' ? brushSize * 2 : brushSize;
        ctx.strokeStyle = tool === 'ERASER' ? 'rgba(255,255,255,1)' : color;
        ctx.globalCompositeOperation = tool === 'ERASER' ? 'destination-out' : 'source-over';

        // Apply Clipping if Selection is Active
        if (isSelectionActive && selectionPath.length > 2) {
            ctx.save();
            const path = new Path2D();
            path.moveTo(selectionPath[0].x, selectionPath[0].y);
            selectionPath.forEach(p => path.lineTo(p.x, p.y));
            path.closePath();
            ctx.clip(path);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = getCoordinates(e);

        // Update Cursor and Handle Drag
        if (floatingLayer) {
            if (transformMode !== 'NONE' && dragStart && initialLayerState) {
                // ... (Existing Drag Logic)
                const dx = x - dragStart.x;
                const dy = y - dragStart.y;

                if (transformMode === 'MOVE') {
                    setFloatingLayer({
                        ...floatingLayer,
                        x: initialLayerState.x + dx,
                        y: initialLayerState.y + dy
                    });
                } else {
                    // Resize Logic
                    let newX = initialLayerState.x;
                    let newY = initialLayerState.y;
                    let newW = initialLayerState.width;
                    let newH = initialLayerState.height;

                    if (transformMode === 'RESIZE_BR') {
                        newW = initialLayerState.width + dx;
                        newH = initialLayerState.height + dy;
                    } else if (transformMode === 'RESIZE_BL') {
                        newX = initialLayerState.x + dx;
                        newW = initialLayerState.width - dx;
                        newH = initialLayerState.height + dy;
                    } else if (transformMode === 'RESIZE_TR') {
                        newY = initialLayerState.y + dy;
                        newW = initialLayerState.width + dx;
                        newH = initialLayerState.height - dy;
                    } else if (transformMode === 'RESIZE_TL') {
                        newX = initialLayerState.x + dx;
                        newY = initialLayerState.y + dy;
                        newW = initialLayerState.width - dx;
                        newH = initialLayerState.height - dy;
                    }

                    setFloatingLayer({
                        ...floatingLayer,
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH
                    });
                }
                return;
            } else {
                // Hover Logic for Cursor
                const handleSize = 10;
                let newCursor = 'default';

                // Check Handles
                const handles = [
                    { type: 'nwse-resize', x: floatingLayer.x, y: floatingLayer.y },
                    { type: 'nesw-resize', x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y },
                    { type: 'nesw-resize', x: floatingLayer.x, y: floatingLayer.y + floatingLayer.height },
                    { type: 'nwse-resize', x: floatingLayer.x + floatingLayer.width, y: floatingLayer.y + floatingLayer.height }
                ];

                let overHandle = false;
                for (const h of handles) {
                    if (x >= h.x - handleSize / 2 && x <= h.x + handleSize / 2 &&
                        y >= h.y - handleSize / 2 && y <= h.y + handleSize / 2) {
                        newCursor = h.type;
                        overHandle = true;
                        break;
                    }
                }

                if (!overHandle) {
                    if (x >= floatingLayer.x && x <= floatingLayer.x + floatingLayer.width &&
                        y >= floatingLayer.y && y <= floatingLayer.y + floatingLayer.height) {
                        newCursor = 'move';
                    } else {
                        newCursor = 'crosshair';
                    }
                }
                setCursor(newCursor);
            }
        } else {
            if (cursor !== 'crosshair') setCursor('crosshair');
        }

        if (!isDrawing) return;

        if (tool === 'SELECT') {
            setSelectionPath(prev => [...prev, { x, y }]);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handleMouseUp = () => {
        if (transformMode !== 'NONE') {
            setTransformMode('NONE');
            setDragStart(null);
            setInitialLayerState(null);
            return;
        }

        if (isDrawing) {
            setIsDrawing(false);

            if (tool === 'SELECT') {
                setIsSelectionActive(true);
                // Don't save frame for selection
            } else {
                // Restore context if it was clipped
                if (isSelectionActive && selectionPath.length > 2) {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (ctx) ctx.restore();
                }
                saveCurrentFrame();
            }
        }
    };

    // --- ONION SKIN HELPERS ---
    const getPrevOnionSkin = () => {
        if (currentFrameIdx > 0) {
            return frames[currentFrameIdx - 1];
        } else if (frames.length > 1) {
            return frames[frames.length - 1];
        }
        return null;
    };

    const getNextOnionSkin = () => {
        if (currentFrameIdx < frames.length - 1) {
            return frames[currentFrameIdx + 1];
        } else if (frames.length > 1) {
            return frames[0];
        }
        return null;
    };

    const prevOnion = getPrevOnionSkin();
    const nextOnion = getNextOnionSkin();

    return (
        <div className="flex w-full h-full bg-[#fdfbf7] overflow-hidden">

            {/* --- LEFT COLUMN: ELEMENTS (TOOLS, COLORS, SETTINGS) --- */}
            <div className="w-72 bg-white border-r-[3px] border-black p-4 flex flex-col gap-6 shadow-lg z-20 h-full overflow-y-auto">

                {/* Name Input */}
                <div className="sketch-box px-4 py-2 bg-yellow-50" data-help="Change the name of this actor">
                    <label className="text-xs font-bold text-gray-400">NAME</label>
                    <input
                        className="text-2xl font-bold bg-transparent border-b-2 border-black/10 focus:border-black outline-none w-full"
                        value={name}
                        onChange={(e) => { setName(e.target.value); onUpdate({ ...actor, name: e.target.value }) }}
                    />
                </div>

                {/* Tools */}
                <div className="flex flex-col gap-2">
                    <label className="font-bold flex items-center gap-2"><Pencil size={16} /> TOOLS</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setTool('PENCIL')} className={`h-14 sketch-btn text-2xl ${tool === 'PENCIL' ? 'sketch-btn-active bg-yellow-200' : ''}`} data-help="Pencil Tool: Draw pixels">
                            <Pencil size={24} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setTool('ERASER')} className={`h-14 sketch-btn text-2xl ${tool === 'ERASER' ? 'sketch-btn-active bg-pink-200' : ''}`} data-help="Eraser Tool: Remove pixels">
                            <Eraser size={24} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setTool('FILL')} className={`h-14 sketch-btn text-2xl ${tool === 'FILL' ? 'sketch-btn-active bg-blue-200' : ''}`} data-help="Fill Tool: Fill an area with color">
                            <PaintBucket size={24} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setTool('SELECT')} className={`h-14 sketch-btn text-2xl ${tool === 'SELECT' ? 'sketch-btn-active bg-purple-200' : ''}`} data-help="Lasso Tool: Select an area">
                            <Lasso size={24} strokeWidth={2.5} />
                        </button>
                        <button onClick={clearCanvas} className="h-14 sketch-btn hover:bg-red-100 text-red-500" data-help="Clear the entire canvas">
                            <RefreshCw size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Selection Actions */}
                {isSelectionActive && (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-5 duration-200">
                        <label className="font-bold flex items-center gap-2 text-purple-600"><Lasso size={16} /> SELECTION</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={cutSelection} className="h-10 sketch-btn text-sm flex items-center justify-center gap-1 hover:bg-red-50 text-red-600" data-help="Cut selection">
                                <Scissors size={16} /> CUT
                            </button>
                            <button onClick={copySelection} className="h-10 sketch-btn text-sm flex items-center justify-center gap-1 hover:bg-blue-50 text-blue-600" data-help="Copy selection">
                                <Copy size={16} /> COPY
                            </button>
                            <button onClick={pasteSelection} disabled={!selectionClipboard} className={`h-10 sketch-btn text-sm flex items-center justify-center gap-1 ${!selectionClipboard ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50 text-green-600'}`} data-help="Paste selection">
                                <Clipboard size={16} /> PASTE
                            </button>
                            <button onClick={() => { setIsSelectionActive(false); setSelectionPath([]); }} className="h-10 sketch-btn text-sm flex items-center justify-center gap-1 hover:bg-gray-100" data-help="Deselect">
                                <X size={16} /> CLEAR
                            </button>
                        </div>
                    </div>
                )}

                {/* Brush Size */}
                <div className="flex flex-col gap-2">
                    <label className="font-bold text-sm">SIZE: {brushSize}px</label>
                    <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg border-2 border-black/10">
                        {[2, 5, 10, 20].map(s => (
                            <button
                                key={s}
                                onClick={() => setBrushSize(s)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${brushSize === s ? 'bg-black ring-2 ring-offset-2 ring-black' : 'bg-gray-300'}`}
                                data-help={`Set brush size to ${s}px`}
                            >
                                <Circle size={s} fill={brushSize === s ? "white" : "black"} className={brushSize === s ? "text-white" : "text-black"} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Colors */}
                <div className="flex flex-col gap-2">
                    <label className="font-bold flex items-center gap-2"><PaintBucket size={16} /> INK</label>
                    <div className="grid grid-cols-5 gap-2">
                        {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#9ca3af'].map(c => (
                            <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 border-black hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}`} style={{ backgroundColor: c }} data-help={`Select color ${c}`} />
                        ))}
                    </div>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 cursor-pointer border-2 border-black rounded mt-2" data-help="Pick a custom color" />
                </div>

                <div className="flex-1"></div>

                {!isHero && (
                    <button onClick={() => onDelete(actor.id)} className="w-full h-12 sketch-btn text-red-500 hover:bg-red-100 border-red-500" data-help="Delete this actor permanently">
                        <Trash2 size={20} className="mr-2" /> DELETE
                    </button>
                )}
            </div>

            {/* --- CENTER: CANVAS --- */}
            <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center relative overflow-hidden p-8">
                <div
                    className="sketch-box bg-white shadow-2xl relative flex items-center justify-center transition-transform"
                    style={{
                        width: 'min(60vh, 60vw)',
                        height: 'min(60vh, 60vw)',
                    }}
                >
                    <div className="absolute -top-12 left-0 bg-black text-white px-3 py-1 rounded-t-lg font-bold font-mono">
                        FRAME {currentFrameIdx + 1}/{frames.length}
                    </div>

                    {/* ONION SKIN LAYERS (Tinted Divs with Masks) */}
                    {onionSkinEnabled && !isPlaying && (
                        <>
                            {/* PREV FRAME (Tinted by User Color) */}
                            {prevOnion && (
                                <div
                                    key={`prev-onion-${currentFrameIdx}-${frames.length}`}
                                    className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none"
                                    style={{
                                        zIndex: 0,
                                        backgroundColor: onionPrevColor,
                                        maskImage: `url(${prevOnion})`,
                                        WebkitMaskImage: `url(${prevOnion})`,
                                        maskSize: 'contain',
                                        WebkitMaskSize: 'contain',
                                        maskRepeat: 'no-repeat',
                                        WebkitMaskRepeat: 'no-repeat',
                                        imageRendering: 'pixelated'
                                    }}
                                />
                            )}
                            {/* NEXT FRAME (Tinted by User Color) */}
                            {nextOnion && frames.length > 2 && (
                                <div
                                    key={`next-onion-${currentFrameIdx}-${frames.length}`}
                                    className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
                                    style={{
                                        zIndex: 0,
                                        backgroundColor: onionNextColor,
                                        maskImage: `url(${nextOnion})`,
                                        WebkitMaskImage: `url(${nextOnion})`,
                                        maskSize: 'contain',
                                        WebkitMaskSize: 'contain',
                                        maskRepeat: 'no-repeat',
                                        WebkitMaskRepeat: 'no-repeat',
                                        imageRendering: 'pixelated'
                                    }}
                                />
                            )}
                        </>
                    )}

                    <canvas
                        ref={canvasRef}
                        className="bg-transparent w-full h-full object-contain image-pixelated relative z-10"
                        style={{
                            backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)',
                            backgroundSize: '20px 20px',
                            imageRendering: 'pixelated'
                        }}
                    />

                    {/* SELECTION OVERLAY CANVAS */}
                    <canvas
                        ref={selectionCanvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="absolute top-0 left-0 w-full h-full touch-none z-20"
                        style={{ imageRendering: 'pixelated', cursor: cursor }}
                    />
                </div>
            </div>

            {/* --- RIGHT COLUMN: ANIMATION --- */}
            <div className="w-40 bg-white border-l-[3px] border-black flex flex-col z-20 h-full shadow-lg">
                <div className="p-4 border-b-2 border-black/10 flex flex-col items-center gap-3">
                    <label className="font-bold text-sm flex items-center gap-2">ANIMATION</label>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-full h-10 sketch-btn flex items-center justify-center gap-2 ${isPlaying ? 'bg-green-300' : 'hover:bg-gray-100'}`}
                        data-help="Preview the animation"
                    >
                        {isPlaying ? <Square size={16} fill="black" /> : <Play size={16} fill="black" />}
                        <span className="text-xs font-bold">{isPlaying ? 'STOP' : 'PLAY'}</span>
                    </button>

                    {/* ONION SKIN TOGGLE & COLORS */}
                    <div className="flex flex-col gap-2 w-full bg-gray-100 p-2 rounded-lg border border-black/10">
                        <button
                            onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
                            className={`w-full h-8 border-2 border-black rounded-full flex items-center justify-center gap-2 transition-colors ${onionSkinEnabled ? 'bg-purple-200' : 'bg-white hover:bg-gray-200'}`}
                            title="Toggle Onion Skin (See previous/next frame)"
                            data-help="Toggle Onion Skin to see previous/next frames"
                        >
                            <Layers size={16} className={onionSkinEnabled ? 'text-purple-700' : 'text-gray-500'} />
                            <span className={`text-[10px] font-bold ${onionSkinEnabled ? 'text-purple-900' : 'text-gray-500'}`}>{onionSkinEnabled ? 'ONION: ON' : 'ONION'}</span>
                        </button>

                        {onionSkinEnabled && (
                            <div className="flex justify-between gap-1">
                                <div className="flex flex-col items-center w-1/2">
                                    <span className="text-[8px] font-bold text-gray-500">PREV</span>
                                    <input type="color" value={onionPrevColor} onChange={(e) => setOnionPrevColor(e.target.value)} className="w-full h-6 rounded border border-black cursor-pointer" />
                                </div>
                                <div className="flex flex-col items-center w-1/2">
                                    <span className="text-[8px] font-bold text-gray-500">NEXT</span>
                                    <input type="color" value={onionNextColor} onChange={(e) => setOnionNextColor(e.target.value)} className="w-full h-6 rounded border border-black cursor-pointer" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 items-center">
                    {frames.map((frame, idx) => (
                        <div key={idx} className="flex flex-col items-center relative group w-full">
                            <div
                                onClick={() => { setIsPlaying(false); setCurrentFrameIdx(idx); }}
                                className={`w-24 h-24 border-4 rounded-lg cursor-pointer bg-white flex items-center justify-center transition-transform hover:scale-105 ${currentFrameIdx === idx ? 'border-yellow-400 shadow-md scale-105' : 'border-gray-200 hover:border-black'}`}
                                data-help={`Edit Frame #${idx + 1}`}
                            >
                                <img src={frame} className="w-full h-full object-contain p-1" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 mt-1">#{idx + 1}</span>

                            {frames.length > 1 && (
                                <button
                                    onClick={(e) => deleteFrame(e, idx)}
                                    className="absolute top-0 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all border border-black"
                                    data-help="Delete this frame"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="w-full h-[2px] bg-gray-200 my-2"></div>

                    <button onClick={addFrame} className="w-24 h-16 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-black hover:border-black transition-all shrink-0" data-help="Add a new blank frame">
                        <Plus size={24} />
                        <span className="text-[10px] font-bold">NEW FRAME</span>
                    </button>
                    <button onClick={duplicateFrame} className="w-24 h-12 border-2 border-gray-400 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50 text-gray-400 hover:text-black hover:border-black transition-all shrink-0" data-help="Duplicate the current frame">
                        <Copy size={16} />
                        <span className="text-[10px] font-bold">COPY</span>
                    </button>
                </div>
            </div>

        </div>
    );
};