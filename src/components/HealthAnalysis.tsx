import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Info, Droplets, Heart, Scale, FileText } from 'lucide-react';
import clsx from 'clsx';

interface HealthAnalysisProps {
  vitals: any[];
  labs: any[];
  profile: any;
}

export default function HealthAnalysis({ vitals, labs, profile }: HealthAnalysisProps) {
  const analysis = useMemo(() => {
    const results: any[] = [];

    // Helper to calculate precise age in years
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

    // 1. BMI Analysis
    const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : null;
    if (latestVitals && latestVitals.Weight && latestVitals.Height) {
      const weight = parseFloat(latestVitals.Weight);
      const height = parseFloat(latestVitals.Height) / 100; // convert cm to m
      const bmi = weight / (height * height);
      
      let status = '';
      let color = '';
      let icon = Scale;
      let advice = '';

      if (bmi < 18.5) {
        status = 'น้ำหนักน้อยเกินไป (Underweight)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ควรรับประทานอาหารที่มีประโยชน์เพิ่มขึ้น เพื่อเพิ่มน้ำหนักให้อยู่ในเกณฑ์มาตรฐาน';
      } else if (bmi >= 18.5 && bmi <= 22.9) {
        status = 'น้ำหนักปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'น้ำหนักอยู่ในเกณฑ์ดีเยี่ยม ควรรักษาสุขภาพและออกกำลังกายสม่ำเสมอ';
      } else if (bmi >= 23.0 && bmi <= 24.9) {
        status = 'น้ำหนักเกิน (Overweight)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรควบคุมอาหารและออกกำลังกายเพิ่มขึ้น เพื่อลดความเสี่ยงโรคอ้วน';
      } else if (bmi >= 25.0 && bmi <= 29.9) {
        status = 'อ้วนระดับ 1 (Obese Class I)';
        color = 'text-orange-600 bg-orange-50 border-orange-200';
        advice = 'มีความเสี่ยงต่อโรคเบาหวานและความดันโลหิตสูง ควรลดน้ำหนักอย่างจริงจัง';
      } else {
        status = 'อ้วนระดับ 2 (Obese Class II)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงสูงมากต่อโรคแทรกซ้อน ควรปรึกษาแพทย์เพื่อวางแผนลดน้ำหนัก';
      }

      results.push({
        category: 'ดัชนีมวลกาย (BMI)',
        value: bmi.toFixed(1),
        unit: 'kg/m²',
        status,
        color,
        icon,
        advice
      });
    }

    // Helper to get latest lab value
    const getLatestLab = (testNames: string[]) => {
      const matchedLabs = labs.filter(l => 
        testNames.some(name => l.TestName?.toLowerCase().includes(name.toLowerCase()))
      );
      if (matchedLabs.length === 0) return null;
      // Sort by date descending
      matchedLabs.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
      return matchedLabs[0];
    };

    // 2. Blood Sugar (FBS & HbA1c)
    const fbs = getLatestLab(['Fasting Blood Sugar', 'FBS', 'Glucose']);
    if (fbs && fbs.Value) {
      const val = parseFloat(fbs.Value);
      let status = '';
      let color = '';
      let advice = '';

      if (val < 100) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับน้ำตาลในเลือดปกติ รักษาสุขภาพต่อไป';
      } else if (val >= 100 && val <= 125) {
        status = 'เสี่ยงเบาหวาน (Prediabetes)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดของหวาน แป้งขัดขาว และออกกำลังกายสม่ำเสมอ';
      } else {
        status = 'เบาหวาน (Diabetes)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ระดับน้ำตาลสูง ควรพบแพทย์เพื่อรับการรักษาและควบคุมอาหารเคร่งครัด';
      }

      results.push({
        category: 'น้ำตาลในเลือด (FBS)',
        value: val,
        unit: fbs.Unit || 'mg/dL',
        status,
        color,
        icon: Droplets,
        advice
      });
    }

    const hba1c = getLatestLab(['HbA1c', 'Hemoglobin A1c']);
    if (hba1c && hba1c.Value) {
      const val = parseFloat(hba1c.Value);
      let status = '';
      let color = '';
      let advice = '';

      if (val < 5.7) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'การควบคุมน้ำตาลสะสมอยู่ในเกณฑ์ดี';
      } else if (val >= 5.7 && val <= 6.4) {
        status = 'เสี่ยงเบาหวาน (Prediabetes)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'มีความเสี่ยงเบาหวาน ควรปรับเปลี่ยนพฤติกรรมการกิน';
      } else {
        status = 'เบาหวาน (Diabetes)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ควรพบแพทย์เพื่อปรับยาและควบคุมอาหาร';
      }

      results.push({
        category: 'น้ำตาลสะสม (HbA1c)',
        value: val,
        unit: hba1c.Unit || '%',
        status,
        color,
        icon: Droplets,
        advice
      });
    }

    // 3. Lipid Profile
    const ldl = getLatestLab(['LDL', 'Low Density Lipoprotein']);
    if (ldl && ldl.Value) {
      const val = parseFloat(ldl.Value);
      let status = '';
      let color = '';
      let advice = '';

      if (val < 100) {
        status = 'ดีมาก (Optimal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ไขมันเลวอยู่ในระดับดีมาก';
      } else if (val >= 100 && val <= 129) {
        status = 'ดี (Near Optimal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ไขมันเลวอยู่ในระดับที่ยอมรับได้';
      } else if (val >= 130 && val <= 159) {
        status = 'ค่อนข้างสูง (Borderline High)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดอาหารมัน ของทอด และเนื้อสัตว์ติดมัน';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงโรคหลอดเลือดหัวใจ ควรพบแพทย์และควบคุมอาหาร';
      }

      results.push({
        category: 'ไขมันเลว (LDL)',
        value: val,
        unit: ldl.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    const hdl = getLatestLab(['HDL', 'High Density Lipoprotein']);
    if (hdl && hdl.Value) {
      const val = parseFloat(hdl.Value);
      // Default to male threshold if gender not specified, but adjust if female
      const threshold = isFemale ? 50 : 40;
      
      let status = '';
      let color = '';
      let advice = '';

      if (val < threshold) {
        status = 'ต่ำ (Low - Risk)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ไขมันดีต่ำ ควรออกกำลังกายแบบคาร์ดิโอเพิ่มขึ้น และทานไขมันดี (เช่น ปลาทะเล ถั่ว)';
      } else if (val >= 60) {
        status = 'สูง (High - Protective)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ไขมันดีอยู่ในระดับที่ช่วยป้องกันโรคหัวใจได้ดีมาก';
      } else {
        status = 'ปกติ (Normal)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'ไขมันดีอยู่ในระดับปกติ';
      }

      results.push({
        category: 'ไขมันดี (HDL)',
        value: val,
        unit: hdl.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    const tg = getLatestLab(['Triglyceride', 'TG']);
    if (tg && tg.Value) {
      const val = parseFloat(tg.Value);
      let status = '';
      let color = '';
      let advice = '';

      if (val < 150) {
        status = 'ปกติ (Normal)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ระดับไตรกลีเซอไรด์ปกติ';
      } else if (val >= 150 && val <= 199) {
        status = 'ค่อนข้างสูง (Borderline High)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรลดแป้ง น้ำตาล และแอลกอฮอล์';
      } else {
        status = 'สูง (High)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'มีความเสี่ยงตับอ่อนอักเสบและโรคหัวใจ ควรลดแป้ง น้ำตาล แอลกอฮอล์อย่างจริงจัง';
      }

      results.push({
        category: 'ไตรกลีเซอไรด์ (Triglyceride)',
        value: val,
        unit: tg.Unit || 'mg/dL',
        status,
        color,
        icon: Heart,
        advice
      });
    }

    // 4. Hydration & Protein (BUN/Creatinine)
    const bun = getLatestLab(['BUN', 'Blood Urea Nitrogen']);
    const cr = getLatestLab(['Creatinine', 'Cr']);
    
    if (bun && bun.Value && cr && cr.Value) {
      const bunVal = parseFloat(bun.Value);
      const crVal = parseFloat(cr.Value);
      const ratio = bunVal / crVal;
      
      let status = '';
      let color = '';
      let advice = '';

      if (ratio > 20) {
        status = 'ภาวะขาดน้ำ (Dehydration) / โปรตีนสูง';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'สัดส่วน BUN/Cr สูง บ่งชี้ว่าคุณอาจดื่มน้ำน้อยเกินไป หรือทานโปรตีนมากเกินไป ควรดื่มน้ำให้เพียงพอ (8-10 แก้ว/วัน)';
      } else if (ratio >= 10 && ratio <= 20) {
        status = 'ปกติ (Normal Hydration)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'ภาวะน้ำในร่างกายและการทำงานของไตอยู่ในเกณฑ์ดี';
      } else {
        status = 'ต่ำกว่าเกณฑ์ (Low Ratio)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'อาจเกิดจากการทานโปรตีนน้อยเกินไป หรือมวลกล้ามเนื้อน้อย';
      }

      results.push({
        category: 'ภาวะขาดน้ำ/โปรตีน (BUN/Cr Ratio)',
        value: ratio.toFixed(1),
        unit: '',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    // 5. Kidney Function (eGFR - CKD-EPI 2021)
    if (cr && cr.Value && age !== null && (isMale || isFemale)) {
      const crVal = parseFloat(cr.Value);
      let egfr = 0;
      
      if (isFemale) {
        if (crVal <= 0.7) {
          egfr = 142 * Math.pow(crVal / 0.7, -0.241) * Math.pow(0.9938, age) * 1.012;
        } else {
          egfr = 142 * Math.pow(crVal / 0.7, -1.200) * Math.pow(0.9938, age) * 1.012;
        }
      } else {
        if (crVal <= 0.9) {
          egfr = 142 * Math.pow(crVal / 0.9, -0.302) * Math.pow(0.9938, age);
        } else {
          egfr = 142 * Math.pow(crVal / 0.9, -1.200) * Math.pow(0.9938, age);
        }
      }

      let status = '';
      let color = '';
      let advice = '';

      if (egfr >= 90) {
        status = 'ปกติ (Stage 1)';
        color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
        advice = 'การทำงานของไตปกติ (อ้างอิงตามอายุและเพศของคุณ)';
      } else if (egfr >= 60) {
        status = 'ไตเสื่อมระยะเริ่มต้น (Stage 2)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
        advice = 'การทำงานของไตลดลงเล็กน้อย ควรดื่มน้ำให้เพียงพอและหลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs';
      } else if (egfr >= 45) {
        status = 'ไตเสื่อมระยะปานกลาง (Stage 3a)';
        color = 'text-amber-600 bg-amber-50 border-amber-200';
        advice = 'ควรปรึกษาแพทย์เพื่อชะลอความเสื่อมของไต ควบคุมความดันและน้ำตาลให้ดี';
      } else if (egfr >= 30) {
        status = 'ไตเสื่อมระยะปานกลางถึงมาก (Stage 3b)';
        color = 'text-orange-600 bg-orange-50 border-orange-200';
        advice = 'ควรพบแพทย์เฉพาะทางโรคไต และควบคุมอาหารอย่างเคร่งครัด';
      } else if (egfr >= 15) {
        status = 'ไตเสื่อมระยะรุนแรง (Stage 4)';
        color = 'text-rose-600 bg-rose-50 border-rose-200';
        advice = 'ไตทำงานได้น้อยมาก ต้องอยู่ในการดูแลของแพทย์อย่างใกล้ชิด';
      } else {
        status = 'ไตวายระยะสุดท้าย (Stage 5)';
        color = 'text-red-700 bg-red-50 border-red-200';
        advice = 'จำเป็นต้องได้รับการบำบัดทดแทนไต (ฟอกเลือด/ล้างไต)';
      }

      results.push({
        category: 'การทำงานของไต (eGFR)',
        value: egfr.toFixed(1),
        unit: 'mL/min/1.73m²',
        status,
        color,
        icon: Activity,
        advice
      });
    }

    return results;
  }, [vitals, labs, profile]);

  if (analysis.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-900">Health Analysis & Insights</h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className={clsx("p-5 rounded-2xl border", item.color)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/60 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.category}</h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                  {item.unit && <span className="text-sm font-medium ml-1 opacity-70">{item.unit}</span>}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-white/60 shadow-sm">
                  {item.status}
                </div>
                <p className="text-sm font-medium opacity-90 leading-relaxed">
                  {item.advice}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
