'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Quad, Point } from '@/lib/space/homography';
import {
  isConvexQuad,
  minEdgeLength,
  pointInQuad,
  quadCentroid,
  scaleQuadAboutCentroid,
} from '@/lib/space/homography';
import {
  calibrateFromReference,
  resizeQuadToWidthCm,
  type Calibration,
} from '@/lib/space/calibration';
import { snapPlacement } from '@/lib/space/alignment';
import type { FrameStyle, MatSettings, RealismSettings } from '@/lib/space/renderPerspective';
import { useImage } from './useArtworkComposite';
import { PlacementImage, type PlacementComposite } from './PlacementImage';
import {
  stampExportWatermark,
  downloadCanvasAsJpeg,
  renderExportComposite,
} from '@/lib/space/exportPreview';
import type { ReactNode } from 'react';
import type { SpaceArtwork, EmbedOptions } from '@/lib/space/types';
import { resolveFeatures } from '@/lib/space/types';
import { SpaceControls } from './SpaceControls';

const HANDLE_RADIUS = 9;

export type Placement = {
  id: string;
  artworkId: string;
  quad: Quad;
  frame: FrameStyle;
  mat: MatSettings;
  variantIndex: number;
};

let placementSeq = 0;
const nextPlacementId = () => `pl-${Date.now().toString(36)}-${(placementSeq += 1)}`;

/** A centred quad, nudged by `index` so a new piece never lands exactly on another. */
function seedQuad(stageWidth: number, stageHeight: number, aspect: number, index: number): Quad {
  const width = stageWidth * 0.3;
  const height = width / aspect;
  const shift = index * Math.min(stageWidth, stageHeight) * 0.06;
  const cx = stageWidth / 2 + shift;
  const cy = stageHeight / 2 + shift;
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
  renderInquiry?: (artwork: SpaceArtwork) => ReactNode;
  embed?: EmbedOptions;
};

export function SpaceEditor({
  roomImageUrl,
  artworks,
  initialArtworkId,
  onReset,
  renderInquiry,
  embed,
}: Props) {
  const features = resolveFeatures(embed?.features);
  const accent = embed?.accent;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [stageSize, setStageSize] = useState({ width: 900, height: 600 });
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<number[][]>([]);

  const [realism, setRealism] = useState<RealismSettings>({
    brightness: 1,
    warmth: 0,
    shadow: true,
  });

  // True-to-scale placement (shared across all pieces).
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [refSeg, setRefSeg] = useState<[Point, Point] | null>(null);
  const [refCm, setRefCm] = useState('');
  const [trueSize, setTrueSize] = useState(false);

  const artworkById = useCallback(
    (id: string) => artworks.find((a) => a.id === id),
    [artworks],
  );

  const selected = placements.find((p) => p.id === selectedId) ?? null;
  const selectedArtwork = selected ? artworkById(selected.artworkId) : undefined;
  const selectedSizes = selectedArtwork?.sizeVariants ?? [];

  const { image: roomImage } = useImage(roomImageUrl);

  // Framed bitmaps + image dims reported up by each placement layer, keyed by
  // placement id. A ref, not state: the export reads it on demand and it must
  // not trigger re-renders as pieces re-compose.
  const compositeRef = useRef<Map<string, PlacementComposite>>(new Map());
  const onComposite = useCallback((id: string, composite: PlacementComposite | null) => {
    if (composite) compositeRef.current.set(id, composite);
    else compositeRef.current.delete(id);
  }, []);

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

  const targetWidthFor = useCallback(
    (placement: Placement): number | null => {
      const artwork = artworkById(placement.artworkId);
      if (!artwork) return null;
      return artwork.sizeVariants[placement.variantIndex]?.widthCm ?? artwork.widthCm ?? null;
    },
    [artworkById],
  );

  const addArtwork = useCallback(
    (artworkId: string) => {
      const artwork = artworkById(artworkId);
      if (!artwork || !roomImage) return;
      // Prefer the listed physical aspect (known before the image decodes);
      // fall back to an already-loaded piece, then a neutral 4:3.
      const img = compositeRef.current.get(placements[0]?.id ?? '');
      const aspect =
        artwork.widthCm && artwork.heightCm
          ? artwork.widthCm / artwork.heightCm
          : img
            ? img.imageWidth / img.imageHeight
            : 4 / 3;
      const baseIdx =
        artwork.sizeVariants.findIndex((s) => s.widthCm === artwork.widthCm);
      const variantIndex =
        baseIdx >= 0 ? baseIdx : Math.floor(artwork.sizeVariants.length / 2);

      // Single-piece mode: the picker swaps the one placement's artwork in place,
      // keeping its position/frame/mat, rather than adding another.
      if (!features.multiPlacement && placements.length > 0) {
        setPlacements((ps) =>
          ps.map((p, i) =>
            i === 0 ? { ...p, artworkId, variantIndex: Math.max(variantIndex, 0) } : p,
          ),
        );
        setSelectedId(placements[0].id);
        return;
      }

      let quad = seedQuad(stageSize.width, stageSize.height, aspect, placements.length);
      const width = artwork.sizeVariants[variantIndex]?.widthCm ?? artwork.widthCm ?? null;
      if (trueSize && calibration && width) quad = resizeQuadToWidthCm(quad, width, calibration);

      const placement: Placement = {
        id: nextPlacementId(),
        artworkId,
        quad,
        frame: 'none',
        mat: { width: 0, color: 'white' },
        variantIndex: Math.max(variantIndex, 0),
      };
      setPlacements((ps) => [...ps, placement]);
      setSelectedId(placement.id);
    },
    [artworkById, roomImage, placements, stageSize, trueSize, calibration, features.multiPlacement],
  );

  // Seed the first placement once the room is ready.
  useEffect(() => {
    if (placements.length > 0 || !roomImage) return;
    addArtwork(initialArtworkId);
  }, [placements.length, roomImage, initialArtworkId, addArtwork]);

  // Notify the host which artwork is in focus.
  useEffect(() => {
    if (!selectedId) return;
    const p = placements.find((x) => x.id === selectedId);
    if (p) embed?.onSelectArtwork?.(p.artworkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire on selection change only
  }, [selectedId]);

  const updateQuad = useCallback((id: string, quad: Quad) => {
    setPlacements((ps) => ps.map((p) => (p.id === id ? { ...p, quad } : p)));
  }, []);

  const patchSelected = useCallback(
    (patch: Partial<Placement>) => {
      if (!selectedId) return;
      setPlacements((ps) => ps.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)));
    },
    [selectedId],
  );

  // -------------------------------------------------------------- placement ops

  const deletePlacement = useCallback((id: string) => {
    compositeRef.current.delete(id);
    setPlacements((ps) => ps.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const duplicatePlacement = useCallback(
    (id: string) => {
      setPlacements((ps) => {
        const src = ps.find((p) => p.id === id);
        if (!src) return ps;
        const copy: Placement = {
          ...src,
          id: nextPlacementId(),
          quad: src.quad.map((pt) => ({ x: pt.x + 28, y: pt.y + 28 })) as Quad,
        };
        return [...ps, copy];
      });
    },
    [],
  );

  const reorder = useCallback((id: string, dir: 1 | -1) => {
    setPlacements((ps) => {
      const i = ps.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ps.length) return ps;
      const next = [...ps];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  // -------------------------------------------------------------- true size

  const relockAll = useCallback(
    (cal: Calibration) => {
      setPlacements((ps) =>
        ps.map((p) => {
          const width = targetWidthFor(p);
          return width ? { ...p, quad: resizeQuadToWidthCm(p.quad, width, cal) } : p;
        }),
      );
    },
    [targetWidthFor],
  );

  const handleTrueSizeChange = useCallback(
    (next: boolean) => {
      setTrueSize(next);
      if (next && calibration) relockAll(calibration);
    },
    [calibration, relockAll],
  );

  const handleSelectVariant = useCallback(
    (index: number) => {
      if (!selectedId) return;
      setPlacements((ps) =>
        ps.map((p) => {
          if (p.id !== selectedId) return p;
          const sizes = artworkById(p.artworkId)?.sizeVariants ?? [];
          const newWidth = sizes[index]?.widthCm ?? null;
          const prevWidth = sizes[p.variantIndex]?.widthCm ?? null;

          let quad = p.quad;
          if (newWidth) {
            if (calibration) {
              // Calibrated: snap to the real on-wall size.
              quad = resizeQuadToWidthCm(p.quad, newWidth, calibration);
            } else if (prevWidth && prevWidth > 0) {
              // Uncalibrated: still show the size difference, relative to the
              // size that was selected before.
              quad = scaleQuadAboutCentroid(p.quad, newWidth / prevWidth);
            }
          }
          return { ...p, variantIndex: index, quad };
        }),
      );
    },
    [selectedId, artworkById, calibration],
  );

  // -------------------------------------------------------------- calibration

  const startCalibration = useCallback(() => {
    const y = stageSize.height * 0.62;
    setRefSeg([
      { x: stageSize.width * 0.34, y },
      { x: stageSize.width * 0.66, y },
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
    const anchor = selected ?? placements[0];
    const composite = anchor ? compositeRef.current.get(anchor.id) : undefined;
    if (!refSeg || !anchor || !composite || !(cm > 0)) return;
    const result = calibrateFromReference({
      quad: anchor.quad,
      refA: refSeg[0],
      refB: refSeg[1],
      refCm: cm,
      aspect: composite.imageWidth / composite.imageHeight,
    });
    if (!result) return;
    setCalibration(result);
    setCalibrating(false);
    setTrueSize(true);
    relockAll(result);
  }, [refCm, selected, placements, refSeg, relockAll]);

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

  // -------------------------------------------------------------- interaction

  const movePointer = useRef<{ x: number; y: number } | null>(null);

  const setCursor = useCallback((value: string) => {
    const el = containerRef.current;
    if (el && el.style.cursor !== value) el.style.cursor = value;
  }, []);

  const handleStageDown = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      if (calibrating) return;
      if (e.target.getClassName?.() === 'Circle') return; // a handle owns its drag
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      // Topmost placement under the cursor wins (array order is z-order).
      for (let i = placements.length - 1; i >= 0; i -= 1) {
        if (pointInQuad(placements[i].quad, pos)) {
          setSelectedId(placements[i].id);
          movePointer.current = pos;
          setCursor('grabbing');
          return;
        }
      }
      setSelectedId(null);
    },
    [calibrating, placements, setCursor],
  );

  const handleStageMove = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      if (!movePointer.current || !selectedId) {
        if (!calibrating) {
          const over = placements.some((p) => pointInQuad(p.quad, pos));
          setCursor(over ? 'grab' : 'default');
        }
        return;
      }

      const dx = pos.x - movePointer.current.x;
      const dy = pos.y - movePointer.current.y;
      movePointer.current = pos;

      setPlacements((ps) => {
        const src = ps.find((p) => p.id === selectedId);
        if (!src) return ps;
        const moved = src.quad.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) as Quad;
        const c = quadCentroid(moved);
        if (c.x < 0 || c.y < 0 || c.x > stageSize.width || c.y > stageSize.height) return ps;

        const snap = snapPlacement({ candidate: moved, selectedId, placements: ps });
        setGuides(snap.guides);
        return ps.map((p) => (p.id === selectedId ? { ...p, quad: snap.quad } : p));
      });
    },
    [selectedId, calibrating, placements, stageSize.width, stageSize.height, setCursor],
  );

  const endMove = useCallback(() => {
    movePointer.current = null;
    setGuides([]);
    setCursor('default');
  }, [setCursor]);

  const moveCorner = useCallback(
    (id: string, index: number, next: Point) => {
      setPlacements((ps) =>
        ps.map((p) => {
          if (p.id !== id) return p;
          const candidate = p.quad.map((pt, i) => (i === index ? next : pt)) as Quad;
          if (!isConvexQuad(candidate) || minEdgeLength(candidate) < 12) return p;
          return { ...p, quad: candidate };
        }),
      );
    },
    [],
  );

  // -------------------------------------------------------------- export

  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownload = useCallback(() => {
    if (!roomImage || placements.length === 0) return;
    setExportError(null);

    const exportPlacements = placements
      .map((p) => {
        const composite = compositeRef.current.get(p.id);
        return composite ? { framedArtwork: composite.framed, quad: p.quad } : null;
      })
      .filter((x): x is { framedArtwork: HTMLCanvasElement; quad: Quad } => x !== null);

    const canvas = renderExportComposite({
      room: roomImage,
      placements: exportPlacements,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      shadow: realism.shadow,
    });

    if (!canvas) {
      setExportError('Could not render the preview. Try adjusting the pieces.');
      return;
    }

    const credit = selectedArtwork ?? artworkById(placements[0].artworkId);
    stampExportWatermark(canvas, {
      title: placements.length > 1 ? `${placements.length} works` : credit?.title ?? 'Artwork',
      artist: credit?.artistName ?? 'ArtSpace',
    });

    try {
      downloadCanvasAsJpeg(canvas, 'artspace-preview.jpg');
      embed?.onExported?.();
    } catch {
      setExportError('Could not export this image. Please try again later.');
    }
  }, [roomImage, placements, stageSize, realism.shadow, selectedArtwork, artworkById, embed]);

  // -------------------------------------------------------------- render data

  const selectedQuad = selected?.quad ?? null;
  const selectedFlat = useMemo(
    () => (selectedQuad ? selectedQuad.flatMap((p) => [p.x, p.y]) : []),
    [selectedQuad],
  );
  const refPoints = useMemo(
    () => (refSeg ? [refSeg[0].x, refSeg[0].y, refSeg[1].x, refSeg[1].y] : []),
    [refSeg],
  );

  const placementSummaries = placements.map((p) => {
    const artwork = artworkById(p.artworkId);
    return {
      id: p.id,
      title: artwork?.title ?? 'Artwork',
      thumbnailUrl: artwork?.displayUrl ?? '',
    };
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      {/* Preview stays pinned while the controls column scrolls past it, so the
          artwork is always visible while editing. */}
      <div className="lg:sticky lg:top-6 lg:self-start">
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
              onPointerUp={endMove}
              onPointerLeave={endMove}
            >
              <Layer listening={false}>
                <KonvaImage image={roomImage} width={stageSize.width} height={stageSize.height} />
              </Layer>

              {/* One layer per placement, in z-order. */}
              {placements.map((p) => {
                const artwork = artworkById(p.artworkId);
                if (!artwork) return null;
                return (
                  <PlacementImage
                    key={p.id}
                    placementId={p.id}
                    displayUrl={artwork.displayUrl}
                    quad={p.quad}
                    frame={p.frame}
                    mat={p.mat}
                    realism={realism}
                    stageWidth={stageSize.width}
                    stageHeight={stageSize.height}
                    resolveImageUrl={embed?.resolveImageUrl}
                    onComposite={onComposite}
                  />
                );
              })}

              {/* Overlay: selection outline, corner handles, guides, calibration. */}
              <Layer>
                {guides.map((g, i) => (
                  <Line key={`guide-${i}`} points={g} stroke="#f59e0b" strokeWidth={1} dash={[4, 4]} listening={false} />
                ))}

                {selectedQuad && !calibrating ? (
                  <>
                    <Line
                      points={selectedFlat}
                      closed
                      stroke={accent ?? 'rgba(255,255,255,0.9)'}
                      strokeWidth={1.5}
                      dash={[6, 4]}
                      listening={false}
                    />
                    {selectedQuad.map((corner, index) => (
                      <Circle
                        key={index}
                        x={corner.x}
                        y={corner.y}
                        radius={HANDLE_RADIUS}
                        fill="#ffffff"
                        stroke="#1c1917"
                        strokeWidth={1.5}
                        draggable
                        onDragMove={(e) =>
                          selectedId && moveCorner(selectedId, index, { x: e.target.x(), y: e.target.y() })
                        }
                        onDragEnd={(e) => {
                          if (selected) {
                            e.target.position({ x: selected.quad[index].x, y: selected.quad[index].y });
                            const width = targetWidthFor(selected);
                            if (trueSize && calibration && width) {
                              updateQuad(selected.id, resizeQuadToWidthCm(selected.quad, width, calibration));
                            }
                          }
                        }}
                      />
                    ))}
                  </>
                ) : null}

                {calibrating && refSeg ? (
                  <>
                    <Line points={refPoints} stroke="#f59e0b" strokeWidth={2.5} dash={[8, 5]} listening={false} />
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
                  </>
                ) : null}
              </Layer>
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
            : 'Click a piece to select it. Drag to move, drag a corner to match your wall, or add more from the panel.'}
        </p>
      </div>

      <SpaceControls
        artworks={artworks}
        placements={placementSummaries}
        selectedId={selectedId}
        onSelectPlacement={setSelectedId}
        onAddArtwork={addArtwork}
        onDeletePlacement={deletePlacement}
        onDuplicatePlacement={duplicatePlacement}
        onBringForward={(id) => reorder(id, 1)}
        onSendBack={(id) => reorder(id, -1)}
        selectedArtwork={selectedArtwork}
        artworkShortEdgeCm={
          selectedArtwork?.widthCm && selectedArtwork?.heightCm
            ? Math.min(selectedArtwork.widthCm, selectedArtwork.heightCm)
            : undefined
        }
        frame={selected?.frame ?? 'none'}
        onFrameChange={(frame) => patchSelected({ frame })}
        mat={selected?.mat ?? { width: 0, color: 'white' }}
        onMatChange={(mat) => patchSelected({ mat })}
        sizes={selectedSizes}
        variantIndex={selected?.variantIndex ?? 0}
        onSelectVariant={handleSelectVariant}
        realism={realism}
        onRealismChange={setRealism}
        calibrated={calibration !== null}
        calibrating={calibrating}
        onStartCalibration={startCalibration}
        onApplyCalibration={applyCalibration}
        onCancelCalibration={cancelCalibration}
        refCm={refCm}
        onRefCmChange={setRefCm}
        trueSize={trueSize}
        onTrueSizeChange={handleTrueSizeChange}
        onDownload={handleDownload}
        exportError={exportError}
        onReset={onReset}
        renderInquiry={renderInquiry}
        features={features}
        accent={accent}
        radius={embed?.radius}
      />
    </div>
  );
}
