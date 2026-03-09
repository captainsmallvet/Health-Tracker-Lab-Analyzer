import React, { useState, useEffect } from 'react';
import { Upload, Pill, CheckCircle2, AlertCircle, Save, X, Plus } from 'lucide-react';
import clsx from 'clsx';

export default function Medications() {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Manual Entry State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMed, setManualMed] = useState({
    MedicationName: '',
    Dosage: '',
    Frequency: '',
    Purpose: ''
  });

  useEffect(() => {
    fetchMeds();
  }, []);

  const fetchMeds = async () => {
    try {
      const res = await fetch('/api/data/Medications');
      if (res.ok) {
        const data = await res.json();
        setMeds(data.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch medications', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setExtractedData(null);
    setShowManualForm(false);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('model', selectedModel);

    try {
      const res = await fetch('/api/analyze-medication', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze image');
      }
      
      const data = await res.json();
      setExtractedData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedData) return;
    setSaving(true);
    
    const formattedData = extractedData.map(item => ({
      MedicationName: item.MedicationName || item.medicationName || '',
      Dosage: item.Dosage || item.dosage || '',
      Frequency: item.Frequency || item.frequency || '',
      Purpose: item.Purpose || item.purpose || ''
    }));

    await saveToServer(formattedData);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formattedData = [{
      MedicationName: manualMed.MedicationName,
      Dosage: manualMed.Dosage,
      Frequency: manualMed.Frequency,
      Purpose: manualMed.Purpose
    }];

    await saveToServer(formattedData);
  };

  const saveToServer = async (dataToSave: any[]) => {
    try {
      const res = await fetch('/api/data/Medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (res.ok) {
        setExtractedData(null);
        setShowManualForm(false);
        setManualMed({ MedicationName: '', Dosage: '', Frequency: '', Purpose: '' });
        fetchMeds();
      } else {
        throw new Error('Failed to save');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExtractedChange = (index: number, field: string, value: string) => {
    if (!extractedData) return;
    const newData = [...extractedData];
    newData[index] = { ...newData[index], [field]: value };
    setExtractedData(newData);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Medications</h1>
          <p className="text-slate-500 mt-2">Manage your regular medications using AI label scanning or manual entry.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={uploading || saving}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          >
<option value="gemini-3-flash-preview">Gemini 3 Flash Preview  (Default)</option>
<option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
<option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
<option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
<option value="gemini-flash-latest">Gemini Flash Latest</option>
<option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
<option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
          </select>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group cursor-pointer hover:border-indigo-300 transition-colors">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Upload Label (AI)</h3>
              <p className="text-sm text-slate-500">Scan a medication label or prescription</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => { setShowManualForm(true); setExtractedData(null); setError(''); }}
          className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:border-emerald-300 transition-colors text-left"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Add Manually</h3>
            <p className="text-sm text-slate-500">Type in medication details yourself</p>
          </div>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden ring-1 ring-emerald-50">
          <div className="p-6 border-b border-emerald-50 bg-emerald-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Add Medication Manually</h2>
            </div>
            <button 
              onClick={() => setShowManualForm(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSaveManual} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medication Name *</label>
                <input 
                  type="text" 
                  required
                  value={manualMed.MedicationName}
                  onChange={e => setManualMed({...manualMed, MedicationName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g., Paracetamol"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosage</label>
                <input 
                  type="text" 
                  value={manualMed.Dosage}
                  onChange={e => setManualMed({...manualMed, Dosage: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g., 500 mg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                <input 
                  type="text" 
                  value={manualMed.Frequency}
                  onChange={e => setManualMed({...manualMed, Frequency: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g., 1 tablet after meals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <input 
                  type="text" 
                  value={manualMed.Purpose}
                  onChange={e => setManualMed({...manualMed, Purpose: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g., Pain relief"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Medication'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden ring-1 ring-indigo-50">
          <div className="p-6 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Review Extracted Medications</h2>
            </div>
            <button 
              onClick={() => setExtractedData(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {extractedData.map((item, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Medication Name</label>
                  <input 
                    type="text" 
                    value={item.MedicationName || item.medicationName || ''}
                    onChange={(e) => handleExtractedChange(i, 'MedicationName', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Dosage</label>
                  <input 
                    type="text" 
                    value={item.Dosage || item.dosage || ''}
                    onChange={(e) => handleExtractedChange(i, 'Dosage', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Frequency</label>
                  <input 
                    type="text" 
                    value={item.Frequency || item.frequency || ''}
                    onChange={(e) => handleExtractedChange(i, 'Frequency', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Purpose</label>
                  <input 
                    type="text" 
                    value={item.Purpose || item.purpose || ''}
                    onChange={(e) => handleExtractedChange(i, 'Purpose', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveExtracted}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Confirm & Save to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Pill className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Current Medications</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Medication Name</th>
                <th className="px-6 py-4">Dosage</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : meds.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No medications found.</td>
                </tr>
              ) : (
                meds.map((m: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{m.MedicationName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {m.Dosage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{m.Frequency}</td>
                    <td className="px-6 py-4 text-slate-500">{m.Purpose}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
