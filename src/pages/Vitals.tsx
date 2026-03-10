import React, { useState, useEffect } from 'react';
import { Plus, Save, Activity } from 'lucide-react';

export default function Vitals() {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Weight: '',
    Height: '',
    Systolic: '',
    Diastolic: '',
    HeartRate: '',
    Notes: ''
  });

  useEffect(() => {
    fetchVitals();
  }, []);

  const fetchVitals = async () => {
    try {
      const res = await fetch('/api/data/Vitals');
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending (newest first)
        const sortedData = data.sort((a: any, b: any) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        setVitals(sortedData);
      }
    } catch (error) {
      console.error('Failed to fetch vitals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/data/Vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({
          Date: new Date().toISOString().split('T')[0],
          Weight: '',
          Height: '',
          Systolic: '',
          Diastolic: '',
          HeartRate: '',
          Notes: ''
        });
        fetchVitals();
      }
    } catch (error) {
      console.error('Failed to save vitals', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vitals</h1>
        <p className="text-slate-500 mt-2">Record and track your daily vital signs.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Add New Record
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input 
                type="date" 
                name="Date"
                value={formData.Date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Weight (kg)</label>
              <input 
                type="number" 
                step="0.1"
                name="Weight"
                value={formData.Weight}
                onChange={handleChange}
                placeholder="e.g. 70.5"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Height (cm)</label>
              <input 
                type="number" 
                name="Height"
                value={formData.Height}
                onChange={handleChange}
                placeholder="e.g. 175"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Systolic BP (mmHg)</label>
              <input 
                type="number" 
                name="Systolic"
                value={formData.Systolic}
                onChange={handleChange}
                placeholder="e.g. 120"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Diastolic BP (mmHg)</label>
              <input 
                type="number" 
                name="Diastolic"
                value={formData.Diastolic}
                onChange={handleChange}
                placeholder="e.g. 80"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Heart Rate (bpm)</label>
              <input 
                type="number" 
                name="HeartRate"
                value={formData.HeartRate}
                onChange={handleChange}
                placeholder="e.g. 72"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">หมายเหตุ (Notes)</label>
              <input 
                type="text" 
                name="Notes"
                value={formData.Notes}
                onChange={handleChange}
                placeholder="เช่น ข้อมูลหลังผ่าตัดวันที่ 8 พ.ค. 2023"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Activity className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Recent Records</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Weight</th>
                <th className="px-6 py-4">Height</th>
                <th className="px-6 py-4">Blood Pressure</th>
                <th className="px-6 py-4">Heart Rate</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading records...</td>
                </tr>
              ) : vitals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No records found.</td>
                </tr>
              ) : (
                vitals.map((v: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{v.Date}</td>
                    <td className="px-6 py-4">{v.Weight ? `${v.Weight} kg` : '-'}</td>
                    <td className="px-6 py-4">{v.Height ? `${v.Height} cm` : '-'}</td>
                    <td className="px-6 py-4">
                      {v.Systolic && v.Diastolic ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          {v.Systolic}/{v.Diastolic}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">{v.HeartRate ? `${v.HeartRate} bpm` : '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{v.Notes || '-'}</td>
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
