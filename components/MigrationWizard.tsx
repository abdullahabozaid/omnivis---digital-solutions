import React, { useState } from 'react';
import {
  migrateToSupabase,
  downloadBackup,
  getLocalStorageData,
  isMigrationComplete,
  MigrationResult,
} from '../utils/migration';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface MigrationWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function MigrationWizard({ onComplete, onSkip }: MigrationWizardProps) {
  const [step, setStep] = useState<'check' | 'backup' | 'migrate' | 'complete' | 'error'>('check');
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [result, setResult] = useState<MigrationResult | null>(null);

  const data = getLocalStorageData();
  const hasData = data.clients.length > 0 ||
    data.pipelines.length > 0 ||
    data.snapshots.length > 0 ||
    data.tasks.length > 0;

  const dataStats = {
    clients: data.clients.length,
    pipelines: data.pipelines.length,
    contacts: data.contacts.length,
    snapshots: data.snapshots.length,
    tasks: data.tasks.length,
    projects: data.projects.length,
    tags: data.tags.length,
  };

  const handleBackup = () => {
    downloadBackup();
    setStep('migrate');
  };

  const handleMigrate = async () => {
    setStep('migrate');
    setProgress(0);

    const migrationResult = await migrateToSupabase((task, prog) => {
      setCurrentTask(task);
      setProgress(prog);
    });

    setResult(migrationResult);
    setStep(migrationResult.success ? 'complete' : 'error');
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supabase Not Configured</h2>
          <p className="text-gray-600 mb-6">
            To enable cloud storage and sync, please add your Supabase credentials to the environment variables:
          </p>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm mb-6 overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <button
            onClick={onSkip}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Continue with Local Storage
          </button>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Data to Migrate</h2>
          <p className="text-gray-600 mb-6">
            No existing data found in local storage. You're all set to use Supabase for storage.
          </p>
          <button
            onClick={onComplete}
            className="w-full py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        {step === 'check' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Migrate to Cloud Storage</h2>
            <p className="text-gray-600 mb-6">
              We found existing data that can be migrated to Supabase for cloud storage and sync.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Data to Migrate</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(dataStats).map(([key, count]) => (
                  count > 0 && (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setStep('backup')}
                className="flex-1 py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
              >
                Start Migration
              </button>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Backup Your Data</h2>
            <p className="text-gray-600 mb-6">
              Before migrating, we recommend downloading a backup of your data just in case.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('migrate')}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Skip Backup
              </button>
              <button
                onClick={handleBackup}
                className="flex-1 py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
              >
                Download Backup
              </button>
            </div>
          </>
        )}

        {step === 'migrate' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Migrating Data</h2>
            <p className="text-gray-600 mb-6">{currentTask || 'Starting migration...'}</p>

            <div className="mb-6">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">{progress}%</p>
            </div>

            {progress === 0 && (
              <button
                onClick={handleMigrate}
                className="w-full py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
              >
                Start Migration
              </button>
            )}
          </>
        )}

        {step === 'complete' && result && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Migration Complete!</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Migrated Successfully</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.migrated).map(([key, count]) => (
                  (count as number) > 0 && (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key}</span>
                      <span className="font-medium text-green-600">{count as number}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            <button
              onClick={onComplete}
              className="w-full py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
            >
              Continue to Dashboard
            </button>
          </>
        )}

        {step === 'error' && result && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Migration Issues</h2>
            </div>

            <p className="text-gray-600 mb-4">{result.message}</p>

            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                <h3 className="text-sm font-medium text-red-700 mb-2">Errors ({result.errors.length})</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {result.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-gray-500">...and {result.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('migrate')}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Retry
              </button>
              <button
                onClick={onComplete}
                className="flex-1 py-2 px-4 bg-gold-500 text-white rounded-lg hover:bg-gold-600"
              >
                Continue Anyway
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MigrationWizard;
