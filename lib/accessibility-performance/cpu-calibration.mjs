const MINIMUM_RELIABLE_BENCHMARK_INDEX = 150

export function resolveCpuExecutionMode(value) {
  if (value === undefined || value === 'calibrated') return 'calibrated'
  if (value === 'provided') return 'provided'
  throw new TypeError('LIGHTHOUSE_CPU_MODE must be either calibrated or provided')
}

function roundToOneDecimal(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

/**
 * Reproduces the published Lighthouse CPU Throttling Calculator policy for a
 * mid-tier mobile target. The result is rounded exactly as the calculator's
 * command-line recommendation is displayed.
 *
 * @see https://lighthouse-cpu-throttling-calculator.vercel.app/
 * @see https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md#calibrating-the-cpu-slowdown
 */
export function calculateCpuSlowdownMultiplier(benchmarkIndex) {
  if (!Number.isFinite(benchmarkIndex)) {
    throw new TypeError('Lighthouse benchmarkIndex must be a finite number')
  }
  if (benchmarkIndex < MINIMUM_RELIABLE_BENCHMARK_INDEX) {
    throw new RangeError('This runner is too slow to accurately emulate the Lighthouse target device')
  }

  let multiplier
  if (benchmarkIndex >= 1300) multiplier = 3 + ((benchmarkIndex - 1300) / 233)
  else if (benchmarkIndex >= 800) multiplier = 2 + ((benchmarkIndex - 800) / 500)
  else multiplier = 1 + ((benchmarkIndex - 150) / 650)

  return roundToOneDecimal(multiplier)
}

export function selectMedianBenchmarkIndex(samples) {
  if (!Array.isArray(samples) || samples.length === 0 || samples.length % 2 === 0) {
    throw new TypeError('CPU calibration requires a non-empty odd number of benchmarkIndex samples')
  }
  if (samples.some((sample) => !Number.isFinite(sample))) {
    throw new TypeError('Every CPU calibration benchmarkIndex sample must be finite')
  }

  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}
