import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import './InteractiveCloset.css';

const InteractiveCloset = forwardRef(({ onClick }, ref) => {
  const wrapperRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const triggerDoorAnimation = useCallback(() => {
    if (!wrapperRef.current) return;
    wrapperRef.current.classList.add('closet-active');

    clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => {
      wrapperRef.current?.classList.remove('closet-active');
    }, 1600);
  }, []);

  useImperativeHandle(ref, () => ({
    triggerClosetAnimation: triggerDoorAnimation,
    getClosetCenter: () => {
      if (!wrapperRef.current) return { x: 0, y: 0 };
      const rect = wrapperRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
  }));

  return (
    <div className="closet-wrapper" ref={wrapperRef} onClick={onClick}>
      <div className="wardrobe">
        <div className="front">
          <div className="door"></div>
          <div className="second-door"></div>
        </div>
        <div className="inside">
          <div className="rail"></div>
          <div className="hangers"></div>
          <div className="boots"></div>
          <div className="scarf"></div>
        </div>
        <div className="shadow"></div>
      </div>
    </div>
  );
});

export default InteractiveCloset;
