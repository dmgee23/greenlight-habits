import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { db } from '../db/schema';
import { exportToObsidianViaURI } from '../services/obsidianExport';
import { calculateDailyScore } from '../services/habitEngine';

export default function JournalScreen() {
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>('morning');
  const [dailyScore, setDailyScore] = useState(0);

  // Morning Fields
  const [gratitude, setGratitude] = useState('');
  const [nonNegotiable, setNonNegotiable] = useState('');
  const [affirmation, setAffirmation] = useState('');

  // Evening Fields
  const [win, setWin] = useState('');
  const [greenlight, setGreenlight] = useState('');
  const [honestyReflection, setHonestyReflection] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadExistingJournal();
  }, []);

  const loadExistingJournal = () => {
    const existing = db.getFirstSync<any>(
      `SELECT * FROM journal_entries WHERE date = ?`,
      [today]
    );
    if (existing) {
      setGratitude(existing.morning_gratitude || '');
      setNonNegotiable(existing.daily_non_negotiable || '');
      setAffirmation(existing.identity_affirmation || '');
      setWin(existing.evening_win || '');
      setGreenlight(existing.greenlight_moment || '');
      setHonestyReflection(existing.unforgiving_honesty_reflection || '');
    }
    setDailyScore(calculateDailyScore(today));
  };

  const saveJournal = () => {
    db.runSync(
      `INSERT INTO journal_entries 
        (date, morning_gratitude, daily_non_negotiable, identity_affirmation, evening_win, greenlight_moment, unforgiving_honesty_reflection)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
        morning_gratitude=COALESCE(EXCLUDED.morning_gratitude, morning_gratitude),
        daily_non_negotiable=COALESCE(EXCLUDED.daily_non_negotiable, daily_non_negotiable),
        identity_affirmation=COALESCE(EXCLUDED.identity_affirmation, identity_affirmation),
        evening_win=COALESCE(EXCLUDED.evening_win, evening_win),
        greenlight_moment=COALESCE(EXCLUDED.greenlight_moment, greenlight_moment),
        unforgiving_honesty_reflection=COALESCE(EXCLUDED.unforgiving_honesty_reflection, unforgiving_honesty_reflection);`,
      [today, gratitude, nonNegotiable, affirmation, win, greenlight, honestyReflection]
    );

    setDailyScore(calculateDailyScore(today));
    Alert.alert('Journal Saved', 'Your entries and daily score have been updated.');
  };

  // Gated Check: Requires both morning & evening complete
  const handleObsidianExport = async () => {
    const isMorningComplete = gratitude.trim() !== '' && nonNegotiable.trim() !== '';
    const isEveningComplete = win.trim() !== '' && greenlight.trim() !== '';

    if (!isMorningComplete || !isEveningComplete) {
      Alert.alert(
        'Export Locked 🔒',
        'To export to Obsidian, you must complete both your Morning Intentions and Evening Audit.'
      );
      return;
    }

    const content = `---
date: ${today}
score: ${dailyScore}%
tags: [greenlight, successful-man]
---
# ☀️ Morning Intentions
- **Gratitude:** ${gratitude}
- **Non-Negotiable:** ${nonNegotiable}
- **Identity:** ${affirmation}

# 🌙 Evening Audit & Greenlight Ledger
- **Daily Win:** ${win}
- **Greenlight Moment:** ${greenlight}
- **Unforgiving Honesty Audit:** 
> ${honestyReflection}
`;

    await exportToObsidianViaURI('YourVaultName', today, content);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Score Dashboard Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreTitle}>🏆 Successful Man Score</Text>
        <Text style={styles.scoreNumber}>{dailyScore}%</Text>
        <Text style={styles.scoreSub}>
          {dailyScore === 100 ? 'Mastery Unlocked. Ready for Obsidian!' : 'Complete habits & both journal tabs to reach 100%'}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'morning' && styles.activeTab]} 
          onPress={() => setActiveTab('morning')}>
          <Text style={styles.tabText}>☀️ Morning Intentions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'evening' && styles.activeTab]} 
          onPress={() => setActiveTab('evening')}>
          <Text style={styles.tabText}>🌙 Evening Audit</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'morning' ? (
        <View style={styles.formSection}>
          <Text style={styles.label}>1. What am I grateful for?</Text>
          <TextInput style={styles.input} value={gratitude} onChangeText={setGratitude} placeholder="3 quick things..." placeholderTextColor="#64748b" />

          <Text style={styles.label}>2. The #1 Non-Negotiable Goal</Text>
          <TextInput style={styles.input} value={nonNegotiable} onChangeText={setNonNegotiable} placeholder="Must get done today..." placeholderTextColor="#64748b" />

          <Text style={styles.label}>3. Identity Affirmation</Text>
          <TextInput style={styles.input} value={affirmation} onChangeText={setAffirmation} placeholder="I am the type of person who..." placeholderTextColor="#64748b" />
        </View>
      ) : (
        <View style={styles.formSection}>
          <Text style={styles.label}>1. Today's Big Win</Text>
          <TextInput style={styles.input} value={win} onChangeText={setWin} placeholder="What went well?" placeholderTextColor="#64748b" />

          <Text style={styles.label}>2. Greenlight Moment</Text>
          <TextInput style={styles.input} value={greenlight} onChangeText={setGreenlight} placeholder="Turned an obstacle into progress..." placeholderTextColor="#64748b" />

          <Text style={styles.label}>3. Unforgiving Honesty Audit</Text>
          <TextInput style={[styles.input, styles.textArea]} value={honestyReflection} onChangeText={setHonestyReflection} multiline placeholder="Where did friction catch me?" placeholderTextColor="#64748b" />
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={saveJournal}>
        <Text style={styles.saveButtonText}>Save Entry & Update Score</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exportButton} onPress={handleObsidianExport}>
        <Text style={styles.exportButtonText}>Export to Obsidian 📦 (Gated)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  scoreCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  scoreTitle: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  scoreNumber: { fontSize: 36, fontWeight: 'bold', color: '#22c55e', marginVertical: 4 },
  scoreSub: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#1e293b', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#334155' },
  tabText: { color: '#f8fafc', fontWeight: '600' },
  formSection: { gap: 16 },
  label: { color: '#cbd5e1', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#22c55e', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  exportButton: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  exportButtonText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
});