'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Quad, Point } from '@/lib/space/homography';
import { isConvexQuad, minEdgeLength, pointInQuad, quadCentroid } from '@/lib/space/homography';
import {
  calibrateFromReference,
  resizeQuadToWidthCm,
  type Calibration,
} from '@/lib/space/calibration';
import type { FrameStyle, MatSettings, RealismSettings } from '@/lib/space/renderPerspective';
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
  const [mat, setMat] = useState<MatSettings>({ width: 0, color: 'white' });
  const [realism, setRealism] = useState<RealismSettings>({
    brightness: 1,
    warmth: 0,
    shadow: true,
  });
  const [quad, setQuad] = useState<Quad | null>(null);

  // True-to-scale placement.
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [refSeg, setRefSeg] = useState<[Point, Point] | null>(null);
  const [refCm, setRefCm] = useState('');
  const [trueSize, setTrueSize] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const active = artworks.find((a) => a.id === activeId) ?? artworks[0];
  const sizes = useMemo(() => active?.sizeVariants ?? [], [active]);
  const targetWidthCm = sizes[variantIndex]?.widthCm ?? active?.widthCm ?? null;

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
    mat,
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
      // While calibrating, the canvas belongs to the reference handles.
      if (calibrating) return;
      // A corner handle owns its own drag; do not start a move as well.
      if (e.target.getClassName?.() === 'Circle') return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos || !pointInQuad(safeQuad, pos)) return;
      movePointer.current = pos;
      setCursor('grabbing');
    },
    [safeQuad, setCursor, calibrating],
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

  // On artwork switch, reset the chosen size to that piece's base (the variant
  // matching its listed width, else the middle option).
  useEffect(() => {
    if (sizes.length === 0) {
      setVariantIndex(0);
      return;
    }
    const baseIdx = sizes.findIndex((s) => s.widthCm === active?.widthCm);
    setVariantIndex(baseIdx >= 0 ? baseIdx : Math.floor(sizes.length / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key on artwork identity only
  }, [activeId]);

  // Rescale the quad so the artwork sits at `targetWidthCm` on the wall, keeping
  // its centre and perspective. No-op without a calibration.
  const applyTrueSize = useCallback(
    (widthCm: number | null) => {
      if (!calibration || !widthCm) return;
      setQuad((cur) => (cur ? resizeQuadToWidthCm(cur, widthCm, calibration) : cur));
    },
    [calibration],
  );

  const startCalibration = useCallback(() => {
    // Seed a horizontal reference across the middle third of the photo.
    const y = stageSize.height * 0.62;
    const x0 = stageSize.width * 0.34;
    const x1 = stageSize.width * 0.66;
    setRefSeg([
      { x: x0, y },
      { x: x1, y },
    ]);
    setRefCm('');
    setCalibrating(true);
  }, [stageSize.width, stageSize.height]);

  const cancelCalibration = useCallback(() => {
    setCalibrating(false);
    setRefSeg(null);
  }, []);

  const applyCalibration = useCallback(() => {
    const cm = Number(refCm);
    if (!refSeg || !artworkImage || !(cm > 0)) return;
    const result = calibrateFromReference({
      quad: safeQuad,
      refA: refSeg[0],
      refB: refSeg[1],
      refCm: cm,
      aspect: artworkImage.width / artworkImage.height,
    });
    if (!result) return;
    setCalibration(result);
    setCalibrating(false);
    setTrueSize(true);
    // Snap the artwork to its true size immediately.
    if (targetWidthCm) {
      setQuad((cur) => (cur ? resizeQuadToWidthCm(cur, targetWidthCm, result) : cur));
    }
  }, [refCm, refSeg, artworkImage, safeQuad, targetWidthCm]);

  const handleTrueSizeChange = useCallback(
    (next: boolean) => {
      setTrueSize(next);
      if (next) applyTrueSize(targetWidthCm);
    },
    [applyTrueSize, targetWidthCm],
  );

  const handleSelectVariant = useCallback(
    (index: number) => {
      setVariantIndex(index);
      if (trueSize) applyTrueSize(sizes[index]?.widthCm ?? null);
    },
    [trueSize, applyTrueSize, sizes],
  );

  const moveRefPoint = useCallback(
    (index: number, next: Point) => {
      setRefSeg((cur) => {
        if (!cur) return cur;
        const clamped = {
          x: Math.min(Math.max(next.x, 0), stageSize.width),
          y: Math.min(Math.max(next.y, 0), stageSize.height),
        };
        return index === 0 ? [clamped, cur[1]] : [cur[0], clamped];
      });
    },
    [stageSize.width, stageSize.height],
  );

  const flatPoints = useMemo(() => safeQuad.flatMap((p) => [p.x, p.y]), [safeQuad]);
  const refPoints = useMemo(
    () => (refSeg ? [refSeg[0].x, refSeg[0].y, refSeg[1].x, refSeg[1].y] : []),
    [refSeg],
  );

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

                {!calibrating &&
                  safeQuad.map((corner, index) => (
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
                        // In true-size mode, a perspective change must not change
                        // the artwork's physical size — relock it.
                        if (trueSize) applyTrueSize(targetWidthCm);
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

              {/* Calibration: a reference segment on the wall plane. */}
              {calibrating && refSeg ? (
                <Layer>
                  <Line
                    points={refPoints}
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dash={[8, 5]}
                    listening={false}
                  />
                  {refSeg.map((p, index) => (
                    <Circle
                      key={index}
                      x={p.x}
                      y={p.y}
                      radius={HANDLE_RADIUS}
                      fill="#f59e0b"
                      stroke="#1c1917"
                      strokeWidth={1.5}
                      draggable
                      onDragMove={(e) => moveRefPoint(index, { x: e.target.x(), y: e.target.y() })}
                    />
                  ))}
                </Layer>
              ) : null}
            </Stage>
          ) : (
            <div className="flex h-96 items-center justify-center text-sm text-stone-500">
              Loading your room…
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-stone-500">
          {calibrating
            ? 'Drag the amber endpoints across something of a known size on the wall, then enter its length.'
            : 'Drag the artwork to move it. Drag any corner to match the angle of your wall.'}
        </p>
      </div>

      <SpaceControls
        artworks={artworks}
        activeId={active?.id ?? ''}
        onSelect={setActiveId}
        frame={frame}
        onFrameChange={setFrame}
        mat={mat}
        onMatChange={setMat}
        realism={realism}
        onRealismChange={setRealism}
        onDownload={handleDownload}
        exportError={exportError}
        onReset={onReset}
        activeArtwork={active}
        sizes={sizes}
        variantIndex={variantIndex}
        onSelectVariant={handleSelectVariant}
        calibrated={calibration !== null}
        calibrating={calibrating}
        onStartCalibration={startCalibration}
        onApplyCalibration={applyCalibration}
        onCancelCalibration={cancelCalibration}
        refCm={refCm}
        onRefCmChange={setRefCm}
        trueSize={trueSize}
        onTrueSizeChange={handleTrueSizeChange}
      />
    </div>
  );
}
