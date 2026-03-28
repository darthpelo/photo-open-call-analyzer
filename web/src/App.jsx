import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { CompareProvider } from './context/CompareContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ThemeToggle } from './components/ThemeToggle.jsx';
import { ProjectResults } from './pages/ProjectResults.jsx';
import { Dashboard } from './pages/Dashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CompareProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link
                  to="/"
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Photo Open Call Analyzer
                </Link>
                <ThemeToggle />
              </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects/:name" element={<ProjectResults />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </CompareProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
