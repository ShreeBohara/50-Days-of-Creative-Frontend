/* ── Data Generation Utilities ── */

/** Generate a random number between min and max */
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/** Generate a random integer between min and max (inclusive) */
export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** Generate sparkline data (array of small values) */
export function generateSparkline(length = 20, base = 50, variance = 20) {
  const data = [];
  let value = base;
  for (let i = 0; i < length; i++) {
    value += rand(-variance, variance);
    value = Math.max(base - variance * 2, Math.min(base + variance * 2, value));
    data.push({ v: Math.round(value) });
  }
  return data;
}

/** Generate stat cards data */
export function generateStatData() {
  return [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: randInt(42000, 55000),
      prefix: '$',
      suffix: '',
      change: +(rand(-5, 15)).toFixed(1),
      icon: '💰',
      sparkline: generateSparkline(20, 48000, 3000),
      color: '#00d4ff',
    },
    {
      id: 'users',
      label: 'Active Users',
      value: randInt(10000, 15000),
      prefix: '',
      suffix: '',
      change: +(rand(-3, 12)).toFixed(1),
      icon: '👥',
      sparkline: generateSparkline(20, 12000, 1500),
      color: '#7c3aed',
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: randInt(3000, 4500),
      prefix: '',
      suffix: '',
      change: +(rand(-8, 10)).toFixed(1),
      icon: '📦',
      sparkline: generateSparkline(20, 3600, 400),
      color: '#10b981',
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: +(rand(3.0, 6.0)).toFixed(2),
      prefix: '',
      suffix: '%',
      change: +(rand(-2, 5)).toFixed(1),
      icon: '📈',
      sparkline: generateSparkline(20, 4, 1),
      color: '#f59e0b',
    },
  ];
}

/** Generate time series data for line chart */
export function generateTimeSeriesData(count = 30) {
  const data = [];
  const now = Date.now();
  let value = randInt(2000, 4000);
  for (let i = 0; i < count; i++) {
    value += randInt(-300, 350);
    value = Math.max(1000, Math.min(6000, value));
    data.push({
      time: new Date(now - (count - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value,
      sessions: Math.round(value * rand(0.3, 0.6)),
    });
  }
  return data;
}

/** Add a new point to time series, drop oldest */
export function shiftTimeSeriesData(existing) {
  const last = existing[existing.length - 1];
  let newVal = last.value + randInt(-400, 450);
  newVal = Math.max(1000, Math.min(6000, newVal));
  const newPoint = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: newVal,
    sessions: Math.round(newVal * rand(0.3, 0.6)),
  };
  return [...existing.slice(1), newPoint];
}

/** Generate monthly comparison data for bar chart */
export function generateMonthlyData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month) => ({
    month,
    thisYear: randInt(3000, 8000),
    lastYear: randInt(2500, 7000),
  }));
}

/** Generate category breakdown for donut chart */
export function generateCategoryData() {
  const categories = [
    { name: 'Electronics', color: '#00d4ff' },
    { name: 'Clothing', color: '#7c3aed' },
    { name: 'Home & Garden', color: '#10b981' },
    { name: 'Sports', color: '#f59e0b' },
    { name: 'Books', color: '#ef4444' },
  ];
  return categories.map((cat) => ({
    ...cat,
    value: randInt(1000, 5000),
  }));
}

/** Generate stacked area chart data */
export function generateAreaData(count = 24) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      hour: `${String(i).padStart(2, '0')}:00`,
      organic: randInt(200, 800),
      paid: randInt(100, 500),
      referral: randInt(50, 300),
    });
  }
  return data;
}
