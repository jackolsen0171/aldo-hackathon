import React from 'react';
import './ExamplePrompts.css';

const ExamplePrompts = ({ onPromptClick }) => {
    const examples = [
        {
            icon: '💼',
            title: 'Business Trip',
            prompt: 'I have a 3-day business conference in Chicago next week. Help me plan professional outfits.'
        },
        {
            icon: '✈️',
            title: 'Vacation',
            prompt: 'Planning a 7-day vacation to Italy in summer. Need versatile outfits for sightseeing and dining.'
        },
        {
            icon: '💒',
            title: 'Wedding Guest',
            prompt: 'I\'m attending an outdoor wedding in California. What should I wear as a guest?'
        },
        {
            icon: '🎓',
            title: 'Job Interview',
            prompt: 'I have a job interview at a tech startup tomorrow. What\'s appropriate to wear?'
        },
        {
            icon: '🌧️',
            title: 'Weather Check',
            prompt: 'What\'s the weather like in London this week?'
        },
        {
            icon: '🎉',
            title: 'Special Event',
            prompt: 'I\'m going to a cocktail party this Friday evening. Help me choose an outfit.'
        }
    ];

    return (
        <div className="example-prompts">
            <h3>Try asking me about:</h3>
            <div className="prompts-grid">
                {examples.map((example, index) => (
                    <button
                        key={index}
                        className="prompt-card"
                        onClick={() => onPromptClick(example.prompt)}
                    >
                        <span className="prompt-icon">{example.icon}</span>
                        <span className="prompt-title">{example.title}</span>
                        <span className="prompt-text">{example.prompt}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ExamplePrompts;