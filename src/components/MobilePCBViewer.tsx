'use client';
import React, { useState, useEffect } from 'react';
import { PCBViewer } from '../PCBViewer';
import type { MobileViewerProps, StateProps } from '../lib/types';

export const MobilePCBViewer: React.FC<MobileViewerProps> = ({
  children,
  circuitJson,
  height = 600,
  allowEditing = true,
  editEvents,
  onEditEventsChanged,
  initialState = {},
  enableTouchGestures = true,
  maxScale = 3,
  minScale = 0.5,
  ...props
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; distance: number } | null>(null);
  const [scale, setScale] = useState(initialState.scale ?? 1);
  const [position, setPosition] = useState({
    x: initialState.translateX ?? 0,
    y: initialState.translateY ?? 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableTouchGestures) return;

    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStart({
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance
      });
    } else if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableTouchGestures || !touchStart) return;

    if (e.touches.length === 2 && touchStart.distance > 0) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const newScale = scale * (distance / touchStart.distance);
      setScale(Math.min(Math.max(newScale, minScale), maxScale));

      setTouchStart({
        ...touchStart,
        distance
      });
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0
      });
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  const updatedState: Partial<StateProps> = {
    scale,
    translateX: position.x,
    translateY: position.y,
    ...initialState
  };

  return (
    <div 
      className="w-full touch-pan-x touch-pan-y relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile && (
        <div className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded px-2 py-1 text-sm">
          Scale: {Math.round(scale * 100)}%
        </div>
      )}
      <PCBViewer
        height={height}
        allowEditing={allowEditing}
        editEvents={editEvents}
        onEditEventsChanged={onEditEventsChanged}
        initialState={updatedState}
        circuitJson={circuitJson}
        {...props}
      >
        {children}
      </PCBViewer>
    </div>
  );
};

export default MobilePCBViewer;