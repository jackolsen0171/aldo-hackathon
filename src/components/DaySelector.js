import React, { useState } from 'react';
import './DaySelector.css';

const DaySelector = ({
    selectedDay = 1,
    totalDays = 5,
    onDaySelect = () => { }
}) => {
    const [currentSelectedDay, setCurrentSelectedDay] = useState(selectedDay);

    const handleDayClick = (dayNumber) => {
        setCurrentSelectedDay(dayNumber);
        onDaySelect(dayNumber);
    };

    const renderDayTabs = () => {
        const days = [];
        for (let i = 1; i <= totalDays; i++) {
            days.push(
                <button
                    key={i}
                    className={`day-tab ${currentSelectedDay === i ? 'selected' : ''}`}
                    onClick={() => handleDayClick(i)}
                    aria-pressed={currentSelectedDay === i}
                    aria-label={`Select Outfit ${i}`}
                >
                    Outfit {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="day-selector">
            <div className="day-tabs-container">
                {renderDayTabs()}
            </div>
        </div>
    );
};

export default DaySelector;