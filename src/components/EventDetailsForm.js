import { useState, useEffect } from 'react';
import './EventDetailsForm.css';

const EventDetailsForm = ({
    eventData,
    onConfirm,
    onCancel,
    loading = false,
    pipelineStage = 'confirmation_pending',
    extractionConfidence = null,
    needsClarification = []
}) => {
    const [formData, setFormData] = useState({
        occasion: '',
        location: '',
        startDate: '',
        duration: 1,
        dressCode: 'smart-casual',
        budget: '',
        specialRequirements: []
    });

    // Initialize form with extracted data
    useEffect(() => {
        if (eventData) {
            setFormData({
                occasion: eventData.occasion || '',
                location: eventData.location || '',
                startDate: eventData.startDate || '',
                duration: eventData.duration || 1,
                dressCode: eventData.dressCode || 'smart-casual',
                budget: eventData.budget || '',
                specialRequirements: eventData.specialRequirements || []
            });
        }
    }, [eventData]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSpecialRequirementChange = (index, value) => {
        const newRequirements = [...formData.specialRequirements];
        newRequirements[index] = value;
        setFormData(prev => ({
            ...prev,
            specialRequirements: newRequirements
        }));
    };

    const addSpecialRequirement = () => {
        setFormData(prev => ({
            ...prev,
            specialRequirements: [...prev.specialRequirements, '']
        }));
    };

    const removeSpecialRequirement = (index) => {
        const newRequirements = formData.specialRequirements.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            specialRequirements: newRequirements
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onConfirm) {
            onConfirm(formData);
        }
    };

    const dressCodeOptions = [
        { value: 'casual', label: 'Casual' },
        { value: 'smart-casual', label: 'Smart Casual' },
        { value: 'business', label: 'Business' },
        { value: 'formal', label: 'Formal' },
        { value: 'black-tie', label: 'Black Tie' }
    ];

    // Pipeline stage information
    const getStageInfo = () => {
        const stages = {
            'input_processing': {
                title: 'Processing Input',
                description: 'Understanding your event details...',
                icon: '🔄',
                step: 1,
                loading: true
            },
            'confirmation_pending': {
                title: 'Confirm Details',
                description: 'Please review and confirm your event details',
                icon: '📋',
                step: 2,
                loading: false
            },
            'context_gathering': {
                title: 'Gathering Context',
                description: 'Collecting weather and additional context...',
                icon: '🌤️',
                step: 3,
                loading: true
            },
            'generating': {
                title: 'Generating Outfits',
                description: 'Creating your personalized outfit recommendations...',
                icon: '👗',
                step: 4,
                loading: true
            },
            'complete': {
                title: 'Complete',
                description: 'Your outfit recommendations are ready!',
                icon: '✅',
                step: 5,
                loading: false
            },
            'error': {
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                icon: '❌',
                step: 0,
                loading: false
            }
        };
        return stages[pipelineStage] || stages['confirmation_pending'];
    };

    const currentStage = getStageInfo();

    return (
        <div className="event-details-form">
            {/* Pipeline Progress Indicator */}
            <div className="pipeline-progress">
                <div className="progress-header">
                    <h3>{currentStage.icon} {currentStage.title}</h3>
                    <div className="stage-indicator">
                        Step {currentStage.step} of 5
                    </div>
                </div>

                <div className="progress-bar">
                    <div className="progress-steps">
                        {[1, 2, 3, 4, 5].map(step => (
                            <div
                                key={step}
                                className={`progress-step ${step < currentStage.step ? 'completed' :
                                    step === currentStage.step ? 'active' : 'pending'
                                    }`}
                            >
                                <div className="step-circle">
                                    {step < currentStage.step ? '✓' : step}
                                </div>
                                <div className="step-label">
                                    {step === 1 && 'Input'}
                                    {step === 2 && 'Confirm'}
                                    {step === 3 && 'Context'}
                                    {step === 4 && 'Generate'}
                                    {step === 5 && 'Complete'}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="progress-line">
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentStage.step - 1) / 4) * 100}%` }}
                        />
                    </div>
                </div>

                <p className="stage-description">{currentStage.description}</p>
            </div>

            {/* Extraction Confidence Indicator */}
            {extractionConfidence !== null && (
                <div className={`confidence-indicator ${extractionConfidence >= 0.8 ? 'high' :
                    extractionConfidence >= 0.6 ? 'medium' : 'low'
                    }`}>
                    <div className="confidence-header">
                        <span className="confidence-icon">
                            {extractionConfidence >= 0.8 ? '🎯' :
                                extractionConfidence >= 0.6 ? '📊' : '⚠️'}
                        </span>
                        <span className="confidence-text">
                            Extraction Confidence: {Math.round(extractionConfidence * 100)}%
                        </span>
                    </div>
                    {extractionConfidence < 0.8 && (
                        <p className="confidence-note">
                            Please review the details below carefully and make any necessary corrections.
                        </p>
                    )}
                </div>
            )}

            {/* Clarification Needed Alert */}
            {needsClarification && needsClarification.length > 0 && (
                <div className="clarification-alert">
                    <div className="alert-header">
                        <span className="alert-icon">💡</span>
                        <span className="alert-title">Additional Information Needed</span>
                    </div>
                    <p className="alert-message">
                        I need clarification on: <strong>{needsClarification.join(', ')}</strong>
                    </p>
                </div>
            )}

            <div className="form-header">
                <h4>Event Details</h4>
                <p>Please review and edit the details I extracted from your request:</p>
            </div>

            <form onSubmit={handleSubmit} className="event-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="occasion">Occasion *</label>
                        <input
                            id="occasion"
                            type="text"
                            value={formData.occasion}
                            onChange={(e) => handleInputChange('occasion', e.target.value)}
                            placeholder="e.g., Business conference, Wedding, Job interview"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="location">Location</label>
                        <input
                            id="location"
                            type="text"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="e.g., New York, London, Paris"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="duration">Duration (days)</label>
                        <input
                            id="duration"
                            type="number"
                            min="1"
                            max="30"
                            value={formData.duration}
                            onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>

                <div className="form-row">
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

                    <div className="form-group">
                        <label htmlFor="budget">Budget (optional)</label>
                        <input
                            id="budget"
                            type="number"
                            min="0"
                            value={formData.budget}
                            onChange={(e) => handleInputChange('budget', e.target.value)}
                            placeholder="Total budget amount"
                        />
                    </div>
                </div>

                <div className="form-group full-width">
                    <label>Special Requirements</label>
                    <div className="special-requirements">
                        {formData.specialRequirements.map((requirement, index) => (
                            <div key={index} className="requirement-row">
                                <input
                                    type="text"
                                    value={requirement}
                                    onChange={(e) => handleSpecialRequirementChange(index, e.target.value)}
                                    placeholder="e.g., Comfortable shoes, Waterproof jacket"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeSpecialRequirement(index)}
                                    className="remove-requirement-btn"
                                    title="Remove requirement"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addSpecialRequirement}
                            className="add-requirement-btn"
                        >
                            + Add Requirement
                        </button>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cancel-btn"
                        disabled={loading || currentStage.loading}
                    >
                        {pipelineStage === 'error' ? 'Start Over' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        className={`confirm-btn ${currentStage.loading ? 'loading' : ''}`}
                        disabled={loading || currentStage.loading || !formData.occasion.trim()}
                    >
                        {currentStage.loading ? (
                            <>
                                <span className="loading-spinner"></span>
                                {currentStage.description}
                            </>
                        ) : (
                            <>
                                <span className="btn-icon">✓</span>
                                Confirm & Continue
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EventDetailsForm;