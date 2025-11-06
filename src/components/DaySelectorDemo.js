import React, { useState } from 'react';
import DaySelector from './DaySelector';

const DaySelectorDemo = () => {
    const [selectedDay, setSelectedDay] = useState(1);

    const handleDaySelect = (day) => {
        console.log(`Selected day: ${day}`);
        setSelectedDay(day);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>DaySelector Component Demo</h2>
            <p>Current selected day: {selectedDay}</p>

            <h3>Default (5 days)</h3>
            <DaySelector
                selectedDay={selectedDay}
                onDaySelect={handleDaySelect}
            />

            <h3>3 Days Trip</h3>
            <DaySelector
                selectedDay={selectedDay}
                totalDays={3}
                onDaySelect={handleDaySelect}
            />

            <h3>7 Days Trip</h3>
            <DaySelector
                selectedDay={selectedDay}
                totalDays={7}
                onDaySelect={handleDaySelect}
            />
        </div>
    );
};

export default DaySelectorDemo;