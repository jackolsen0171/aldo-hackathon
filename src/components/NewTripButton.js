import React from 'react';
import './NewTripButton.css';

const NewTripButton = ({ onClick }) => {
    return (
        <button
            className="new-trip-button"
            onClick={onClick}
            type="button"
        >
            <div className="button-icon">+</div>
            <div className="button-text">New Trip</div>
        </button>
    );
};

export default NewTripButton;