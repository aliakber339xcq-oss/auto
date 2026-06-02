import { useState, useEffect } from 'react';

const LAUNCH_DATE = new Date('2024-03-27T00:00:00Z');

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
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
      
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm tracking-wide">PLATFORM AGE</h3>
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center relative z-10">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/5">
          <div className="text-xl font-black text-white">{age.months}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Months</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/5">
          <div className="text-xl font-black text-white">{age.days}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Days</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/5">
          <div className="text-xl font-black text-white">{age.hours}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Hrs</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/5">
          <div className="text-xl font-black text-white">{age.minutes}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Min</div>
        </div>
        <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-2 border border-emerald-500/30">
          <div className="text-xl font-black text-emerald-400">{age.seconds}</div>
          <div className="text-[9px] uppercase tracking-wider text-emerald-200 mt-1 font-semibold">Sec</div>
        </div>
      </div>
    </div>
  );
}
