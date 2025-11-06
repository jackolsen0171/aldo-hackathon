import OutfitPlannerLayout from './components/OutfitPlannerLayout';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <OutfitPlannerLayout />
      </ErrorBoundary>
    </div>
  );
}

export default App;
