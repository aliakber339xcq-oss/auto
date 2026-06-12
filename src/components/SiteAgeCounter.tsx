import { useState, useEffect } from 'react';

const LAUNCH_DATE = new Date('2026-02-02T00:00:00Z');

export function SiteAgeCounter() {
  const [age, setAge] = useState({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateAge = () => {
      const now = new Date();
      
      let months = (now.getFullYear() - LAUNCH_DATE.getFullYear()) * 12 + now.getMonth() - LAUNCH_DATE.getMonth();
      let days = now.getDate() - LAUNCH_DATE.getDate();
      
      if (days < 0) {
        months--;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
      }

      const diffTime = Math.abs(now.getTime() - LAUNCH_DATE.getTime());
      const hours = Math.floor((diffTime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffTime / 1000 / 60) % 60);
      const seconds = Math.floor((diffTime / 1000) % 60);

      setAge({ months, days, hours, minutes, seconds });
    };

    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-3 shadow-lg border border-slate-700 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
      
      <div className="relative z-10 flex items-center justify-between mb-2.5">
        <h3 className="text-white font-bold text-[11px] tracking-wide">PLATFORM AGE</h3>
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 text-center relative z-10">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/5">
          <div className="text-base font-black text-white leading-none mb-1">{age.months}</div>
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Mon</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/5">
          <div className="text-base font-black text-white leading-none mb-1">{age.days}</div>
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Days</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/5">
          <div className="text-base font-black text-white leading-none mb-1">{age.hours}</div>
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Hrs</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/5">
          <div className="text-base font-black text-white leading-none mb-1">{age.minutes}</div>
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Min</div>
        </div>
        <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-1.5 border border-emerald-500/30">
          <div className="text-base font-black text-emerald-400 leading-none mb-1">{age.seconds}</div>
          <div className="text-[8px] uppercase tracking-wider text-emerald-200 font-semibold leading-none">Sec</div>
        </div>
      </div>
    </div>
  );
}
