import React, { useState, useEffect } from 'react';
import { PCBViewer } from '../PCBViewer';

// Make sure to properly type the props
interface MobilePCBViewerProps {
  children?: React.ReactNode;
  circuitJson?: any;
  height?: number;
  allowEditing?: boolean;
  editEvents?: any[];
  onEditEventsChanged?: (events: any[]) => void;
  initialState?: any;
}

export const MobilePCBViewer: React.FC<MobilePCBViewerProps> = ({ 
  children, 
  circuitJson,
  height = 600,
  allowEditing = true,
  editEvents,
  onEditEventsChanged,
  initialState,
  ...props 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full touch-pan-x touch-pan-y">
      <PCBViewer
        height={height}
        allowEditing={allowEditing}
        editEvents={editEvents}
        onEditEventsChanged={onEditEventsChanged}
        initialState={{
          ...initialState,
          scale: scale,
        }}
        {...props}
      >
        {children}
      </PCBViewer>
    </div>
  );
};

// Add a default export as well
export default MobilePCBViewer;