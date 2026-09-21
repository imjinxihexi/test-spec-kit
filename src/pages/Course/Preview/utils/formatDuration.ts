export function formatDuration(seconds: number): string {
  if (seconds === 0) {
    return '0 minutes';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  const hourText = hours === 1 ? '1 hour' : `${hours} hours`;
  const minuteText = minutes === 1 ? '1 minute' : `${minutes} minutes`;

  return `${hourText} ${minuteText}`;
}
