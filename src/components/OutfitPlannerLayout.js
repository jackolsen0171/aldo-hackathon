import React from 'react';
import ChatWidgetPanel from './ChatWidgetPanel';
import './OutfitPlannerLayout.css';

const OutfitPlannerLayout = () => {

    return (
        <div className="outfit-planner-layout fullscreen-chat">
            {/* Full Screen Chat Interface */}
            <div className="fullscreen-chat-container">
                <div className="chat-header">
                    <h1>🤖 AI Outfit Assistant</h1>
                    <p>Tell me about your event, trip, or occasion and I'll help you plan the perfect outfits!</p>
                </div>
                <ChatWidgetPanel />
            </div>
        </div>
    );
};

export default OutfitPlannerLayout;