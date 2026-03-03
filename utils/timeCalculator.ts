export type EntryType = 'ENTRADA' | 'SALIDA' | 'ENTRADA_2' | 'SALIDA_2' | 'DESCANSO';

export interface ClockEntry {
    id: string;
    entry_type: EntryType;
    clock_time: string;
    // other fields ignored
}

export interface CalculatedMetrics {
    workedMinutes: number;
    breakMinutes: number;
}

/**
 * Parses clock entries for a single day and calculates the total worked minutes and break minutes.
 * Applies the automatic break deduction rule:
 * - 60 minutes for split shifts (e.g. Has ENTRADA_2 and SALIDA_2).
 * - 30 minutes for single consecutive shifts.
 * Returns the final calculated metrics.
 */
export function calculateDailyMetrics(dayEntries: ClockEntry[]): CalculatedMetrics {
    if (!dayEntries || dayEntries.length === 0) {
        return { workedMinutes: 0, breakMinutes: 0 };
    }

    // Sort entries chronologically
    const sortedEntries = [...dayEntries].sort(
        (a, b) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
    );

    let grossWorkedMinutes = 0;
    let explicitBreakMinutes = 0;

    const entradas = sortedEntries.filter(e => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2');
    const salidas = sortedEntries.filter(e => e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2');
    const descansos = sortedEntries.filter(e => e.entry_type === 'DESCANSO');

    // 1. Calculate Gross Worked Time (Differences between entrances and exits)
    const pairs = Math.min(entradas.length, salidas.length);
    for (let i = 0; i < pairs; i++) {
        const entradaTime = new Date(entradas[i].clock_time).getTime();
        const salidaTime = new Date(salidas[i].clock_time).getTime();
        grossWorkedMinutes += (salidaTime - entradaTime) / (1000 * 60);
    }

    // If there is an ongoing shift (ENTRADA without a SALIDA), we don't count it towards total worked time until it's closed,
    // or we could calculate up to "now". In this app's logic across dashboard/calendar, it pairs them up.

    // 2. Calculate Explicit Break Time (Differences between DESCANSO pairs)
    for (let i = 0; i < descansos.length - 1; i += 2) {
        const start = new Date(descansos[i].clock_time).getTime();
        const end = new Date(descansos[i + 1].clock_time).getTime();
        explicitBreakMinutes += (end - start) / (1000 * 60);
    }

    // 3. Determine if it's a split shift
    // A shift is split if there's an ENTRADA_2 (meaning a second entrance in the day)
    // Or if there are > 1 pairs of ENTRADA/SALIDA.
    const isSplitShift = entradas.some(e => e.entry_type === 'ENTRADA_2') || entradas.length >= 2;

    // 4. Calculate Automatic Break Time
    // We only apply automatic deduction if they have actually completed a shift (grossWorkedMinutes > 0)
    let automaticBreakMinutes = 0;

    // Only apply the deduction if there is some worked time
    if (grossWorkedMinutes > 0) {
        // If they worked less than 4 hours total, maybe we shouldn't deduct the 30m break?
        // Let's assume the rule applies broadly if they have a completed shift.
        // Or strictly if gross time is > break time
        automaticBreakMinutes = isSplitShift ? 60 : 30;
    }

    // 5. Final Break Time is the maximum between explicit breaks vs automatic deduction
    // If a user explicitly paused for 45 mins on a single shift, they get 45 deducted.
    // If they paused for 15 mins, they get 30 deducted.
    const finalBreakMinutes = Math.max(explicitBreakMinutes, automaticBreakMinutes);

    // 6. Net Worked Time
    const netWorkedMinutes = Math.max(0, grossWorkedMinutes - finalBreakMinutes);

    return {
        workedMinutes: Math.floor(netWorkedMinutes),
        breakMinutes: Math.floor(finalBreakMinutes),
    };
}
