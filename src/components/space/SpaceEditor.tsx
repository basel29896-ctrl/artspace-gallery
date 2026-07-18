'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Quad, Point } from '@/lib/space/homography';
import { isConvexQuad, minEdgeLength, pointInQuad, quadCentroid } from '@/lib/space/homography';
import type { FrameStyle, RealismSettings } from '@/lib/space/renderPerspective';
import { useArtworkComposite, useImage } from './useArtworkComposite';
import {
  stampExportWatermark,
  downloadCanvasAsJpeg,
  renderExportComposite,
} from '@/lib/space/exportPreview';
import type { SpaceArtwork } from '@/lib/artworks/queries';
import { SpaceControls } from './SpaceControls';

const HANDLE_RADIUS = 9;

function initialQuad(stageWidth: number, stageHeight: number, aspect: number): Quad {
  const width = stageWidth * 0.34;
  const height = width / aspect;
  const cx = stageWidth / 2;
  const cy = stageHeight / 2;

  return [
    { x: cx - width / 2, y: cy - height / 2 },
    { x: cx + width / 2, y: cy - height / 2 },
    { x: cx + width / 2, y: cy + height / 2 },
    { x: cx - width / 2, y: cy + height / 2 },
  ];
}

type Props = {
  roomImageUrl: string;
  artworks: SpaceArtwork[];
  initialArtworkId: string;
  onReset: () => void;
};

export function SpaceEditor({ roomImageUrl, artworks, initialArtworkId, onReset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [stageSize, setStageSize] = useState({ width: 900, height: 600 });
  const [activeId, setActiveId] = useState(initialArtworkId);
  const [frame, setFrame] = useState<FrameStyle>('none');
  const [realism, setRealism] = useState<RealismSettings>({
    brightness: 1,
    warmth: 0,
    shadow: true,
  });
  const [quad, setQuad] = useState<Quad | null>(null);

  const active = artworks.find((a) => a.id === activeId) ?? artworks[0];

  const { image: roomImage } = useImage(roomImageUrl);
  // Supabase storage sends permissive CORS; without this the export canvas
  // would be tainted and toBlob() would throw a SecurityError.
  const { image: artworkImage } = useImage(active?.displayUrl ?? null, 'anonymous');

  // Fit the stage to the room photo's aspect within the available width.
  useEffect(() => {
    if (!roomImage) return;

    const measure = () => {
      const width = containerRef.current?.clientWidth ?? 900;
      const height = width / (roomImage.width / roomImage.height);
      setStageSize({ width: Math.round(width), height: Math.round(height) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [roomImage]);

  // Seed the quad once the stage and artwork are both known.
  useEffect(() => {
    if (quad || !artworkImage || !roomImage) return;
    setQuad(initialQuad(stageSize.width, stageSize.height, artworkImage.width / artworkImage.height));
  }, [quad, artworkImage, roomImage, stageSize]);

  const safeQuad = quad ?? initialQuad(stageSize.width, stageSize.height, 1);

  const { compositeCanvas, framed, version, quadValid } = useArtworkComposite({
    artwork: artworkImage,
    quad: safeQuad,
    frame,
    realism,
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
  });

  const moveCorner = useCallback(
    (index: number, next: Point) => {
      setQuad((current) => {
        if (!current) return current;
        const candidate = current.map((p, i) => (i === index ? next : p)) as Quad;
        // Reject drags that would fold the quad — rendering a bow-tie produces
        // garbage, and it is not obvious to the user how to undo it.
        if (!isConvexQuad(candidate) || minEdgeLength(candidate) < 12) return current;
        return candidate;
      });
    },
    [],
  );

  const moveWhole = useCallback(
    (dx: number, dy: number) => {
      setQuad((current) => {
        if (!current) return current;
        const moved = current.map((p) => ({ x: p.x + dx, y: p.y + dy })) as Quad;
        // Keep the centre on the photo; without this the artwork can be dragged
        // entirely off-stage and become unrecoverable.
        const c = quadCentroid(moved);
        if (
          c.x < 0 ||
          c.y < 0 ||
          c.x > stageSize.width ||
          c.y > stageSize.height
        ) {
          return current;
        }
        return moved;
      });
    },
    [stageSize.width, stageSize.height],
  );

  // Whole-piece dragging is handled directly rather than with Konva's
  // `draggable`. A draggable node whose points are derived from the quad would
  // move twice per pointer delta — once from Konva's own offset, once from the
  // quad update — and drift away from the cursor.
  const movePointer = useRef<{ x: number; y: number } | null>(null);

  // Cursor is set imperatively rather than through state: pointermove fires
  // continuously, and a setState per move would re-render the whole editor on
  // top of the quad update it already causes.
  const setCursor = useCallback((value: string) => {
    const el = containerRef.current;
    if (el && el.style.cursor !== value) el.style.cursor = value;
  }, []);

  const handleStageDown = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      // A corner handle owns its own drag; do not start a move as well.
      if (e.target.getClassName?.() === 'Circle') return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos || !pointInQuad(safeQuad, pos)) return;
      movePointer.current = pos;
      setCursor('grabbing');
    },
    [safeQuad, setCursor],
  );

  const handleStageMove = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      if (!movePointer.current) {
        setCursor(pointInQuad(safeQuad, pos) ? 'grab' : 'default');
        return;
      }

      moveWhole(pos.x - movePointer.current.x, pos.y - movePointer.current.y);
      movePointer.current = pos;
    },
    [safeQuad, moveWhole, setCursor],
  );

  const handleStageUp = useCallback(() => {
    movePointer.current = null;
    setCursor('default');
  }, [setCursor]);

  const flatPoints = useMemo(() => safeQuad.flatMap((p) => [p.x, p.y]), [safeQuad]);

  const [exportError, setExportError] = useState<string | null>(null);

  function handleDownload() {
    if (!roomImage || !framed) return;
    setExportError(null);

    // Composed from source images rather than grabbed off the stage, so the
    // corner handles and selection outline never reach the customer's file.
    const canvas = renderExportComposite({
      room: roomImage,
      framedArtwork: framed,
      quad: safeQuad,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      shadow: realism.shadow,
    });

    if (!canvas) {
      setExportError('Could not render the preview. Try adjusting the corners.');
      return;
    }

    stampExportWatermark(canvas, {
      title: active?.title ?? 'Artwork',
      artist: active?.artistName ?? 'ArtSpace',
    });

    try {
      downloadCanvasAsJpeg(canvas, `artspace-preview-${active?.id ?? 'artwork'}.jpg`);
    } catch {
      // A tainted canvas throws here — happens if the artwork host does not
      // send permissive CORS headers.
      setExportError('Could not export this image. Please try again later.');
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div
          ref={containerRef}
          className="overflow-hidden bg-stone-900/5 ring-1 ring-stone-900/10"
          onContextMenu={(e) => e.preventDefault()}
        >
          {roomImage ? (
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              style={{ touchAction: 'none' }}
              onPointerDown={handleStageDown}
              onPointerMove={handleStageMove}
              onPointerUp={handleStageUp}
              onPointerLeave={handleStageUp}
            >
              <Layer listening={false}>
                <KonvaImage
                  image={roomImage}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              </Layer>

              <Layer listening={false}>
                {compositeCanvas ? (
                  <KonvaImage
                    // `version` forces Konva to re-read the canvas, which it
                    // otherwise caches by object identity.
                    key={version}
                    image={compositeCanvas}
                    width={stageSize.width}
                    height={stageSize.height}
                  />
                ) : null}
              </Layer>

              <Layer>
                <Line
                  points={flatPoints}
                  closed
                  stroke={quadValid ? 'rgba(255,255,255,0.85)' : 'rgba(220,60,60,0.9)'}
                  strokeWidth={1.5}
                  dash={[6, 4]}
                  listening={false}
                />

                {safeQuad.map((corner, index) => (
                  <Circle
                    key={index}
                    x={corner.x}
                    y={corner.y}
                    radius={HANDLE_RADIUS}
                    fill="#ffffff"
                    stroke="#1c1917"
                    strokeWidth={1.5}
                    draggable
                    onDragMove={(e) => moveCorner(index, { x: e.target.x(), y: e.target.y() })}
                    onDragEnd={(e) => {
                      // Snap the handle back if the drag was rejected as invalid.
                      e.target.position({ x: safeQuad[index].x, y: safeQuad[index].y });
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'grab';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  />
                ))}
              </Layer>
            </Stage>
          ) : (
            <div className="flex h-96 items-center justify-center text-sm text-stone-500">
              Loading your room…
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Drag the artwork to move it. Drag any corner to match the angle of your wall.
        </p>
      </div>

      <SpaceControls
        artworks={artworks}
        activeId={active?.id ?? ''}
        onSelect={setActiveId}
        frame={frame}
        onFrameChange={setFrame}
        realism={realism}
        onRealismChange={setRealism}
        onDownload={handleDownload}
        exportError={exportError}
        onReset={onReset}
        activeArtwork={active}
      />
    </div>
  );
}
