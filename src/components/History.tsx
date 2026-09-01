import React from 'react';
import { useStore } from '../store/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function History() {
  const { state } = useStore();

  const data = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = state.days?.[dateKey];
    
    let calories = 0;
    const dayOfWeek = date.getDay();
    const profileId = state.dayProfiles?.[dayOfWeek];
    const target = state.profiles?.find(p => p.id === profileId)?.macros.calories || 2100;

    if (dayData && dayData.entries) {
      calories = dayData.entries.reduce((sum, e) => sum + (e.calories || 0), 0);
    }

    return {
      name: format(date, 'EEE'),
      calories: Math.round(calories),
      target
    };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">Weekly Overview</h2>
      
      <div className="md-card p-6">
        <h3 className="text-sm font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-6">Calories vs Target</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--color-on-surface-variant)" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'var(--color-surface-variant)' }}
                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline)', borderRadius: '16px', color: 'var(--color-on-surface)', fontWeight: 'bold' }}
              />
              <Bar dataKey="calories" fill="var(--color-accent-kcal)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
