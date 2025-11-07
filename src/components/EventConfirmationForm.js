import React, { useState } from 'react';
import './EventConfirmationForm.css';

const EventConfirmationForm = ({
    eventData,
    onConfirm,
    onCancel,
    loading = false
}) => {
    const initializeDailyPlans = (duration, existingPlans = []) => {
        const plans = [];
        for (let i = 0; i < duration; i++) {
            plans.push({
                day: i + 1,
                activity: existingPlans[i]?.activity || '',
                dressCode: existingPlans[i]?.dressCode || eventData?.dressCode || 'smart-casual'
            });
        }
        return plans;
    };

    const [formData, setFormData] = useState({
        occasion: eventData?.occasion || '',
        location: eventData?.location || '',
        startDate: eventData?.startDate || '',
        duration: eventData?.duration || 1,
        budget: eventData?.budget || '',
        dailyPlans: initializeDailyPlans(eventData?.duration || 1, eventData?.dailyPlans || [])
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDurationChange = (value) => {
        const duration = Math.max(1, parseInt(value, 10) || 1);
        setFormData(prev => ({
            ...prev,
            duration,
            dailyPlans: initializeDailyPlans(duration, prev.dailyPlans)
        }));
    };

    const handleDayPlanChange = (index, field, value) => {
        setFormData(prev => {
            const updatedPlans = [...prev.dailyPlans];
            updatedPlans[index] = {
                ...updatedPlans[index],
                [field]: value
            };
            return { ...prev, dailyPlans: updatedPlans };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const confirmedData = {
            ...formData,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            specialRequirements: []
        };

        onConfirm(confirmedData);
    };

    const dressCodeOptions = [
        { value: 'casual', label: 'Casual' },
        { value: 'smart-casual', label: 'Smart Casual' },
        { value: 'business', label: 'Business' },
        { value: 'formal', label: 'Formal' },
        { value: 'black-tie', label: 'Black Tie' }
    ];

    return (
        <div className="event-confirmation-form">
            <div className="confirmation-header">
                <div className="cher-avatar">
                    <div className="cher-avatar-placeholder">👩‍🦱</div>
                </div>
                <div className="confirmation-title">
                    <h2>Let me confirm your event details</h2>
                    <p>Please review and adjust the details I extracted from your description:</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="confirmation-form">
                <div className="confirmation-sections">
                    <div className="basic-details-panel">
                <div className="form-grid">
                    {/* Occasion */}
                    <div className="form-group">
                        <label htmlFor="occasion">Event/Occasion *</label>
                        <input
                            id="occasion"
                            type="text"
                            value={formData.occasion}
                            onChange={(e) => handleInputChange('occasion', e.target.value)}
                            placeholder="e.g., Business conference, Wedding, Festival"
                            required
                        />
                    </div>

                    {/* Location */}
                    <div className="form-group">
                        <label htmlFor="location">Location</label>
                        <input
                            id="location"
                            type="text"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="e.g., New York, London, Chicago"
                        />
                    </div>

                    {/* Start Date */}
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                    </div>

                    {/* Duration */}
                    <div className="form-group">
                        <label htmlFor="duration">Duration (days) *</label>
                        <input
                            id="duration"
                            type="number"
                            min="1"
                            max="14"
                            value={formData.duration}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            required
                        />
                    </div>

                    {/* Budget */}
                    <div className="form-group">
                        <label htmlFor="budget">Budget (optional)</label>
                        <input
                            id="budget"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.budget}
                            onChange={(e) => handleInputChange('budget', e.target.value)}
                            placeholder="e.g., 500"
                        />
                    </div>
                </div>
                    </div>

                    <div className="daily-plans-panel">
                    <div className="daily-plans-header">
                        <h3>Daily Plan</h3>
                        <p>Set the activity and dress code for each day.</p>
                    </div>
                    <div className="daily-plans-list">
                        {formData.dailyPlans.map((plan, index) => (
                            <div key={plan.day} className="daily-plan-row">
                                <div className="day-label">
                                    <span>Day {plan.day}</span>
                                </div>
                                <input
                                    type="text"
                                    value={plan.activity}
                                    onChange={(e) => handleDayPlanChange(index, 'activity', e.target.value)}
                                    placeholder="Activity or context (e.g., Client meetings, hiking)"
                                />
                                <select
                                    value={plan.dressCode}
                                    onChange={(e) => handleDayPlanChange(index, 'dressCode', e.target.value)}
                                >
                                    {dressCodeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cancel-button"
                        disabled={loading}
                    >
                        Back to Edit
                    </button>
                    <button
                        type="submit"
                        className="confirm-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner">⏳</span>
                                Generating Outfits...
                            </>
                        ) : (
                            'Generate My Outfits'
                        )}
                    </button>
                </div>
            </form>
                {eventData?.needsClarification && eventData.needsClarification.length > 0 && (
                    <div className="clarifications-inline">
                        <span>Missing:</span>
                        {eventData.needsClarification.map((item, index) => (
                            <strong key={index}>{item}</strong>
                        ))}
                    </div>
                )}
        </div>
    );
};

export default EventConfirmationForm;
