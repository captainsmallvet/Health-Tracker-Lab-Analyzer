import React, { useState, useEffect } from 'react';
import { CalendarHeart, Plus, Save, X, Activity, Stethoscope, Syringe, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function HealthEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    Date: new Date().toISOString().split('T')[0],
    Type: 'Illness',
    Description: '',
    Notes: ''
  });

  const eventTypes = [
    { value: 'Illness', label: 'Illness / Disease (การเจ็บป่วย/โรค)', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'Symptom', label: 'Symptom (อาการผิดปกติ)', icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'Diagnosis', label: 'Diagnosis (การวินิจฉัยโรค)', icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { value: 'Surgery/Procedure', label: 'Surgery / Procedure (ผ่าตัด/หัตถการ)', icon: Syringe, color: 'text-rose-600', bg: 'bg-rose-100' },
    { value: 'Other', label: 'Other (อื่นๆ)', icon: CalendarHeart, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/data/HealthEvents');
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending
        const sortedData = data.sort((a: any, b: any) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        setEvents(sortedData);
      }
    } catch (error) {
      console.error('Failed to fetch events', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/data/HealthEvents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newEvent])
      });
      
      if (res.ok) {
        setShowForm(false);
        setNewEvent({
          Date: new Date().toISOString().split('T')[0],
          Type: 'Illness',
          Description: '',
          Notes: ''
        });
        fetchEvents();
      } else {
        throw new Error('Failed to save event');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTypeConfig = (typeValue: string) => {
    return eventTypes.find(t => t.value === typeValue) || eventTypes[4];
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Health Events</h1>
          <p className="text-slate-500 mt-2">Record medical history, symptoms, surgeries, and illnesses.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden ring-1 ring-indigo-50">
          <div className="p-6 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarHeart className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Record New Health Event</h2>
            </div>
            <button 
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input 
                  type="date" 
                  required
                  value={newEvent.Date}
                  onChange={e => setNewEvent({...newEvent, Date: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Type *</label>
                <select 
                  value={newEvent.Type}
                  onChange={e => setNewEvent({...newEvent, Type: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input 
                  type="text" 
                  required
                  value={newEvent.Description}
                  onChange={e => setNewEvent({...newEvent, Description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., เปลี่ยนข้อเข่าเทียม, ติดโควิด, หน้ามืดเวียนหัว"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea 
                  value={newEvent.Notes}
                  onChange={e => setNewEvent({...newEvent, Notes: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[100px]"
                  placeholder="รายละเอียดเพิ่มเติม เช่น อาการเป็นอย่างไร, รักษาที่ไหน, หมอแนะนำว่าอย่างไร..."
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading history...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarHeart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No health events recorded yet.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
            {events.map((event: any, i) => {
              const typeConfig = getTypeConfig(event.Type);
              const Icon = typeConfig.icon;
              
              return (
                <div key={i} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className={clsx(
                    "absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white",
                    typeConfig.bg, typeConfig.color
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg">{event.Description}</h3>
                      <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 w-fit">
                        {new Date(event.Date).toLocaleDateString('en-GB', { 
                          day: 'numeric', month: 'short', year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-md", typeConfig.bg, typeConfig.color)}>
                        {event.Type}
                      </span>
                    </div>
                    {event.Notes && (
                      <p className="text-slate-600 text-sm whitespace-pre-wrap mt-3 pt-3 border-t border-slate-200/60">
                        {event.Notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
