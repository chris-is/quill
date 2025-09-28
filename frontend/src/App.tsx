import React, { useState } from 'react';
import { DuckDBProvider, useDuckDB } from './lib/DuckDBContext';
import { FileUpload } from './components/FileUpload';
import { DashboardGrid, Widget } from './components/DashboardGrid';
import { SQLQueryInterface } from './components/SQLQueryInterface';
import { Database, Upload, Code } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'upload' | 'dashboard' | 'sql'>('upload');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const { isInitialized, isLoading, error, tables, query } = useDuckDB();

  const executeWidgetQuery = async (widget: Widget): Promise<Widget> => {
    try {
      const data = await query(widget.query);
      return { ...widget, data };
    } catch (error) {
      console.error(`Failed to execute query for widget ${widget.id}:`, error);
      return widget;
    }
  };

  const createAndExecuteWidget = async (widgetConfig: Omit<Widget, 'data'>): Promise<void> => {
    const widget: Widget = { ...widgetConfig, data: [] };

    // Add widget immediately for responsive UI
    setWidgets(prev => [...prev, widget]);

    // Execute query and update with data
    const widgetWithData = await executeWidgetQuery(widget);
    setWidgets(prev => prev.map(w => w.id === widget.id ? widgetWithData : w));
  };

  const refreshWidgetData = async (widgetId: string): Promise<void> => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const updatedWidget = await executeWidgetQuery(widget);
    setWidgets(prev => prev.map(w => w.id === widgetId ? updatedWidget : w));
  };

  const handleDataLoaded = async (tableName: string) => {
    // Switch to dashboard view and add a default table widget
    setCurrentView('dashboard');

    await createAndExecuteWidget({
      id: `widget-${Date.now()}`,
      type: 'table',
      title: `Table: ${tableName}`,
      query: `SELECT * FROM ${tableName} LIMIT 100`,
    });
  };

  const handleAddWidget = async () => {
    if (tables.length === 0) {
      alert('Please upload some data first');
      return;
    }

    const tableName = tables[0]; // Use first available table for now

    await createAndExecuteWidget({
      id: `widget-${Date.now()}`,
      type: 'table',
      title: `New Widget`,
      query: `SELECT * FROM ${tableName} LIMIT 10`,
    });
  };

  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Initializing DuckDB...
          </h2>
          <p className="text-gray-500">Loading WebAssembly modules</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Quill</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('sql')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'sql'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                SQL
              </button>

              {tables.length > 0 && (
                <div className="text-sm text-gray-500">
                  {tables.length} table{tables.length !== 1 ? 's' : ''} loaded
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 h-screen">
        {currentView === 'upload' ? (
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Quill
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Upload your CSV or JSON files and create interactive dashboards with
                lightning-fast queries powered by DuckDB WebAssembly.
              </p>
            </div>

            <FileUpload onDataLoaded={handleDataLoaded} />

            {tables.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Great! You have {tables.length} table{tables.length !== 1 ? 's' : ''} loaded:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {tables.map((table) => (
                    <span
                      key={table}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {table}
                    </span>
                  ))}
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentView('sql')}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Query with SQL
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'dashboard' ? (
          <DashboardGrid
            widgets={widgets}
            onWidgetUpdate={setWidgets}
            onAddWidget={handleAddWidget}
            onRefreshWidget={refreshWidgetData}
          />
        ) : (
          <SQLQueryInterface />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DuckDBProvider>
      <AppContent />
    </DuckDBProvider>
  );
};

export default App;