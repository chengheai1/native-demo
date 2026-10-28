const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

export function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${WEEKDAYS[date.getDay()]}`;
}

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '朋友';
  const [first] = trimmed.split(/\s+/);
  return first && first.length <= 12 ? first : trimmed.slice(0, 12);
}

export function formatTaskTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTask = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (startOfTask === startOfToday) return `今天 ${hours}:${minutes}`;
  if (startOfTask === startOfToday - 86_400_000) return `昨天 ${hours}:${minutes}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function shortTitle(title: string, max = 14): string {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}
