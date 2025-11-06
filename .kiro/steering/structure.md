# Project Structure

## Root Directory
```
hackathon/
├── .git/                 # Git repository
├── .gitignore           # Git ignore rules
├── .kiro/               # Kiro AI assistant configuration
├── README.md            # Project documentation
├── package.json         # Node.js dependencies and scripts
├── package-lock.json    # Locked dependency versions
├── aldo_venv/           # Python virtual environment
├── public/              # Static assets
└── src/                 # Source code
```

## Public Directory
- `index.html` - Main HTML template
- `favicon.ico` - Site icon
- `manifest.json` - PWA configuration
- `robots.txt` - Search engine directives
- Logo files (192px, 512px)

## Source Directory Structure
```
src/
├── App.js              # Main React component
├── App.css             # App-specific styles
├── App.test.js         # App component tests
├── index.js            # React app entry point
├── index.css           # Global styles
├── logo.svg            # React logo
├── reportWebVitals.js  # Performance monitoring
├── setupTests.js       # Test configuration
└── bedrock/            # AWS Bedrock integration
    └── ask_quuestion.py # AI model interaction script
```

## Conventions
- React components use functional components with hooks
- CSS files are co-located with their components
- Python scripts for AI integration are in `src/bedrock/`
- Test files follow `.test.js` naming convention
- Entry point is `src/index.js` which renders `App.js`

## File Organization Rules
- Keep React components in `src/` root or organized subdirectories
- Place AI/ML Python scripts in `src/bedrock/`
- Static assets go in `public/`
- Component-specific styles should be in same directory as component