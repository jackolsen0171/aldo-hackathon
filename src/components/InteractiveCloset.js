import React from 'react';
import './InteractiveCloset.css';

const InteractiveCloset = ({ onClick }) => {
  return (
    <div className="closet-wrapper" onClick={onClick}>
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
};

export default InteractiveCloset;