import React, { useState } from 'react';
import './EventConfirmationForm.css';

const EventConfirmationForm = ({
    eventData,
    onConfirm,
    onCancel,
    loading = false
}) => {
    const [formData, setFormData] = useState({
        occasion: eventData?.occasion || '',
        location: eventData?.location || '',
        startDate: eventData?.startDate || '',
        duration: eventData?.duration || 1,
        dressCode: eventData?.dressCode || 'smart-casual',
        budget: eventData?.budget || '',
        specialRequirements: eventData?.specialRequirements?.join(', ') || ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const confirmedData = {
            ...formData,
            specialRequirements: formData.specialRequirements
                ? formData.specialRequirements.split(',').map(req => req.trim()).filter(req => req)
                : [],
            budget: formData.budget ? parseFloat(formData.budget) : null
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
                            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                            required
                        />
                    </div>

                    {/* Dress Code */}
                    <div className="form-group">
                        <label htmlFor="dressCode">Dress Code *</label>
                        <select
                            id="dressCode"
                            value={formData.dressCode}
                            onChange={(e) => handleInputChange('dressCode', e.target.value)}
                            required
                        >
                            {dressCodeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
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

                {/* Special Requirements */}
                <div className="form-group full-width">
                    <label htmlFor="specialRequirements">Special Requirements (optional)</label>
                    <textarea
                        id="specialRequirements"
                        value={formData.specialRequirements}
                        onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                        placeholder="e.g., Comfortable shoes for walking, Weather protection, Specific colors"
                        rows="3"
                    />
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

            {/* Clarifications */}
            {eventData?.needsClarification && eventData.needsClarification.length > 0 && (
                <div className="clarifications-notice">
                    <h4>Please clarify:</h4>
                    <ul>
                        {eventData.needsClarification.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default EventConfirmationForm;