export function formatMetric(value: number, type: 'currency' | 'number' | 'percent'): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

export function getStatusColor(
  status: string
): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
    case 'in_progress':
      return 'warning';
    case 'disputed':
    case 'refunded':
      return 'danger';
    default:
      return 'default';
  }
}

export function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString();
}
