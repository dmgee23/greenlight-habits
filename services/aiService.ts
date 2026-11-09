// services/aiService.ts

export async function generateDailyReflectionInsight(
  date: string,
  morning: { gratitude: string; nonNegotiable: string; identity: string },
  evening: { win: string; greenlight: string; honesty: string },
  score: number
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  let strength = '';
  let friction = '';
  let directive = '';

  if (score >= 75) {
    strength = 'Excellent execution today. You completed your primary habit targets and maintained strong alignment with your core identity.';
  } else if (score >= 50) {
    strength = 'Solid progress today. You built momentum through your core habit completions.';
  } else {
    strength = 'You maintained accountability by completing the evening reflection despite a challenging day.';
  }

  if (evening.honesty && evening.honesty.trim().length > 10) {
    const summary = evening.honesty.trim().slice(0, 50);
    friction = `You called out a key friction point: "${summary}${evening.honesty.length > 50 ? '...' : ''}". Use this awareness to balance tomorrow.`;
  } else {
    friction = 'Dig deeper into your evening friction analysis. Pinpointing exact bottlenecks is essential to optimizing your daily system.';
  }

  if (morning.nonNegotiable && morning.nonNegotiable.trim().length > 0) {
    directive = `Prioritize locking in your primary objective early tomorrow: "${morning.nonNegotiable.trim()}".`;
  } else {
    directive = 'Define a single, non-negotiable priority first thing tomorrow morning before opening any reactive communications.';
  }

  return `• **Strength:** ${strength}\n\n• **Friction Point:** ${friction}\n\n• **Tomorrow's Directive:** ${directive}`;
}