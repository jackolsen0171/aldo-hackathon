import React from 'react';
import NewTripButton from './NewTripButton';
import './SavedTripsSidebar.css';

const SavedTripsSidebar = ({
    trips = [],
    selectedTrip,
    onTripSelect,
    onNewTrip
}) => {
    return (
        <div className="saved-trips-sidebar">
            <div className="sidebar-header">
                <h3>Saved Trips</h3>
            </div>

            <div className="trips-list">
                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        className={`trip-item ${selectedTrip === trip.id ? 'selected' : ''}`}
                        onClick={() => onTripSelect && onTripSelect(trip.id)}
                    >
                        <div className="trip-icon">
                            ✈️
                        </div>
                        <div className="trip-details">
                            <div className="trip-name">{trip.name}</div>
                            <div className="trip-destination">{trip.destination}</div>
                            <div className="trip-duration">{trip.totalDays} days</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="new-trip-section">
                <NewTripButton onClick={onNewTrip} />
            </div>
        </div>
    );
};

export default SavedTripsSidebar;