import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Droplet, HeartPulse, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculateAge } from '../utils/age';
import HealthAnalysis from '../components/HealthAnalysis';

export default function Dashboard() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState([]);
  const [labs, setLabs] = useState([]);
  const [usage, setUsage] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const MAX_QUOTA = 1500;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vitalsRes, labsRes, usageRes, profileRes] = await Promise.all([
          fetch('/api/data/Vitals'),
          fetch('/api/data/LabResults'),
          fetch('/api/data/UsageLogs'),
          fetch('/api/data/Profile')
        ]);
        
        if (vitalsRes.ok) setVitals(await vitalsRes.json());
        if (labsRes.ok) setLabs(await labsRes.json());
        
        if (usageRes.ok) {
          const logs = await usageRes.json();
          // Filter for today's usage
          const today = new Date().toISOString().split('T')[0];
          const todayUsage = logs.filter((log: any) => log.Date?.startsWith(today)).length;
          setUsage(todayUsage);
        }

        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles.length > 0) {
            setProfile(profiles[profiles.length - 1]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const bpData = vitals.map((v: any) => ({
    date: v.Date,
    systolic: parseInt(v.Systolic),
    diastolic: parseInt(v.Diastolic)
  })).filter(v => v.systolic && v.diastolic);

  const quotaPercentage = (usage / MAX_QUOTA) * 100;

  // Helper for Age
  const getAgeInYears = () => {
    if (!profile?.BirthDate) return null;
    const birthDate = new Date(profile.BirthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const age = getAgeInYears();
  const isMale = profile?.Gender === 'Male';
  const isFemale = profile?.Gender === 'Female';

  // Group Labs by Date for multi-line charts
  const groupedLabs = labs.reduce((acc: any, curr: any) => {
    if (!acc[curr.Date]) acc[curr.Date] = { date: curr.Date };
    const name = curr.TestName?.toLowerCase() || '';
    const val = parseFloat(curr.Value);
    if (isNaN(val)) return acc;

    if (name.includes('creatinine') || name === 'cr') acc[curr.Date].cr = val;
    if (name === 'fasting blood sugar' || name === 'fbs' || name === 'glucose') acc[curr.Date].fbs = val;
    if (name === 'hba1c' || name.includes('hemoglobin a1c')) acc[curr.Date].hba1c = val;
    if (name === 'ast' || name.includes('sgot')) acc[curr.Date].ast = val;
    if (name === 'alt' || name.includes('sgpt')) acc[curr.Date].alt = val;
    if (name === 'ldl' || name.includes('low density')) acc[curr.Date].ldl = val;
    if (name === 'hdl' || name.includes('high density')) acc[curr.Date].hdl = val;
    if (name.includes('triglyceride') || name === 'tg') acc[curr.Date].tg = val;
    if (name === 'total cholesterol' || name === 'cholesterol') acc[curr.Date].tc = val;

    return acc;
  }, {});

  const labTrendData = Object.values(groupedLabs).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  labTrendData.forEach((d: any) => {
    if (d.cr && age !== null && (isMale || isFemale)) {
      let egfr = 0;
      if (isFemale) {
        if (d.cr <= 0.7) egfr = 142 * Math.pow(d.cr / 0.7, -0.241) * Math.pow(0.9938, age) * 1.012;
        else egfr = 142 * Math.pow(d.cr / 0.7, -1.200) * Math.pow(0.9938, age) * 1.012;
      } else {
        if (d.cr <= 0.9) egfr = 142 * Math.pow(d.cr / 0.9, -0.302) * Math.pow(0.9938, age);
        else egfr = 142 * Math.pow(d.cr / 0.9, -1.200) * Math.pow(0.9938, age);
      }
      d.egfr = parseFloat(egfr.toFixed(1));
    }
  });

  const egfrData = labTrendData.filter((d: any) => d.egfr !== undefined);
  const sugarData = labTrendData.filter((d: any) => d.fbs !== undefined || d.hba1c !== undefined);
  const liverData = labTrendData.filter((d: any) => d.ast !== undefined || d.alt !== undefined);
  const lipidData = labTrendData.filter((d: any) => d.ldl !== undefined || d.hdl !== undefined || d.tg !== undefined || d.tc !== undefined);

  const ChartCard = ({ title, data, lines, interpretation, dualAxis }: { title: string, data: any[], lines: any[], interpretation: string, dualAxis?: boolean }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
      <div className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
        <span className="font-semibold text-indigo-700 mr-1">💡 แปลผล:</span>
        {interpretation}
      </div>
      <div className="h-64 w-full mt-auto">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              {dualAxis && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />}
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {lines.map((line, i) => (
                <Line key={i} yAxisId={line.yAxisId || 'left'} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} dot={{ r: 4 }} name={line.name} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
            ยังไม่มีข้อมูลสำหรับกราฟนี้
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2">Overview of your health metrics and API usage.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
          <img 
            src={user?.picture} 
            alt={user?.name} 
            className="w-10 h-10 rounded-full border-2 border-indigo-50"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="font-semibold text-slate-900 text-sm">{profile?.Name || user?.name}</p>
            {profile?.BirthDate ? (
              <p className="text-xs text-indigo-600 font-medium">อายุ: {calculateAge(profile.BirthDate)}</p>
            ) : (
              <p className="text-xs text-slate-500">Welcome back</p>
            )}
          </div>
        </div>
      </header>

      {/* Quota Alert */}
      {usage > MAX_QUOTA * 0.8 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">API Quota Warning</h3>
            <p className="text-sm text-amber-700 mt-1">You have used {usage} out of {MAX_QUOTA} requests today. Approaching the free tier limit.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Latest BP</p>
              <p className="text-2xl font-bold text-slate-900">
                {bpData.length > 0 ? `${bpData[bpData.length - 1].systolic}/${bpData[bpData.length - 1].diastolic}` : '--/--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Latest FBS</p>
              <p className="text-2xl font-bold text-slate-900">
                {sugarData.length > 0 && sugarData[sugarData.length - 1].fbs ? `${sugarData[sugarData.length - 1].fbs} mg/dL` : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Gemini AI API Quota (Today)</p>
              <div className="flex items-end justify-between mt-1">
                <p className="text-2xl font-bold text-slate-900">{usage}</p>
                <p className="text-sm text-slate-500 mb-1">/ {MAX_QUOTA}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${quotaPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="ความดันโลหิต (Blood Pressure)" 
          data={bpData} 
          lines={[
            { key: 'systolic', color: '#e11d48', name: 'ตัวบน (Systolic)' },
            { key: 'diastolic', color: '#3b82f6', name: 'ตัวล่าง (Diastolic)' }
          ]}
          interpretation="ตัวบนควร < 120 และตัวล่างควร < 80 mmHg หากเกิน 140/90 ถือว่ามีความดันโลหิตสูง ควรควบคุมอาหารเค็มและออกกำลังกาย"
        />

        <ChartCard 
          title="น้ำตาลในเลือด (FBS & HbA1c)" 
          data={sugarData} 
          dualAxis={true}
          lines={[
            { key: 'fbs', color: '#059669', name: 'FBS (mg/dL)', yAxisId: 'left' },
            { key: 'hba1c', color: '#e11d48', name: 'HbA1c (%)', yAxisId: 'right' }
          ]}
          interpretation="FBS ควร < 100 mg/dL และ HbA1c ควร < 5.7% (HbA1c คือน้ำตาลสะสมเฉลี่ย 3 เดือน ซึ่งบอกพฤติกรรมการกินได้แม่นยำกว่า FBS ที่อาจอดอาหารมาแค่ก่อนเจาะเลือด)"
        />

        <ChartCard 
          title="การทำงานของไต (eGFR)" 
          data={egfrData} 
          lines={[
            { key: 'egfr', color: '#8b5cf6', name: 'eGFR (mL/min/1.73m²)' }
          ]}
          interpretation="ค่าปกติ ≥ 90 (ยิ่งมากยิ่งดี) หากต่ำกว่า 60 ติดต่อกัน 3 เดือน ถือว่ามีภาวะไตเสื่อมเรื้อรัง ควรดื่มน้ำให้เพียงพอและเลี่ยงยาแก้ปวด"
        />

        <ChartCard 
          title="การทำงานของตับ (AST / ALT)" 
          data={liverData} 
          lines={[
            { key: 'ast', color: '#f59e0b', name: 'AST (SGOT)' },
            { key: 'alt', color: '#d946ef', name: 'ALT (SGPT)' }
          ]}
          interpretation="ค่าปกติมักจะไม่เกิน 40 U/L (ยิ่งน้อยยิ่งดี) หากสูงกว่าปกติอาจเกิดจากภาวะไขมันพอกตับ การดื่มแอลกอฮอล์ หรือตับอักเสบ"
        />

        <ChartCard 
          title="ไขมันในเลือด (Lipid Profile)" 
          data={lipidData} 
          lines={[
            { key: 'ldl', color: '#e11d48', name: 'ไขมันเลว (LDL)' },
            { key: 'hdl', color: '#059669', name: 'ไขมันดี (HDL)' },
            { key: 'tg', color: '#f59e0b', name: 'ไตรกลีเซอไรด์ (TG)' },
            { key: 'tc', color: '#64748b', name: 'คอเลสเตอรอลรวม' }
          ]}
          interpretation="LDL ควร < 100 (ยิ่งน้อยยิ่งดี), HDL ควร > 40-50 (ยิ่งมากยิ่งดี), ไตรกลีเซอไรด์ ควร < 150 และคอเลสเตอรอลรวม ควร < 200 mg/dL"
        />
      </div>

      {/* Health Analysis Section */}
      <HealthAnalysis vitals={vitals} labs={labs} profile={profile} />
    </div>
  );
}
