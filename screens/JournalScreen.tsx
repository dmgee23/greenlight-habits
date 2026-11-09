import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { db } from '../db/schema';
import { calculateDailyScore } from '../services/habitEngine';
import { generateDailyReflectionInsight } from '../services/aiService';

export default function JournalScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [morningGratitude, setMorningGratitude] = useState('');
  const [dailyNonNegotiable, setDailyNonNegotiable] = useState('');
  const [identityAffirmation, setIdentityAffirmation] = useState('');
  
  const [eveningWin, setEveningWin] = useState('');
  const [greenlightMoment, setGreenlightMoment] = useState('');
  const [unforgivingHonesty, setUnforgivingHonesty] = useState('');

  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadJournal(selectedDate);
  }, [selectedDate]);

  const loadJournal = (dateStr: string) => {
    const entry = db.getFirstSync<any>(
      `SELECT * FROM journal_entries WHERE date = ?`,
      [dateStr]
    );
    if (entry) {
      setMorningGratitude(entry.morning_gratitude || '');
      setDailyNonNegotiable(entry.daily_non_negotiable || '');
      setIdentityAffirmation(entry.identity_affirmation || '');
      setEveningWin(entry.evening_win || '');
      setGreenlightMoment(entry.greenlight_moment || '');
      setUnforgivingHonesty(entry.unforgiving_honesty_reflection || '');
    } else {
      setMorningGratitude('');
      setDailyNonNegotiable('');
      setIdentityAffirmation('');
      setEveningWin('');
      setGreenlightMoment('');
      setUnforgivingHonesty('');
    }
    setAiInsight('');
  };

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSaveJournal = () => {
    db.runSync(
      `INSERT INTO journal_entries (date, morning_gratitude, daily_non_negotiable, identity_affirmation, evening_win, greenlight_moment, unforgiving_honesty_reflection)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         morning_gratitude = excluded.morning_gratitude,
         daily_non_negotiable = excluded.daily_non_negotiable,
         identity_affirmation = excluded.identity_affirmation,
         evening_win = excluded.evening_win,
         greenlight_moment = excluded.greenlight_moment,
         unforgiving_honesty_reflection = excluded.unforgiving_honesty_reflection`,
      [selectedDate, morningGratitude, dailyNonNegotiable, identityAffirmation, eveningWin, greenlightMoment, unforgivingHonesty]
    );
    Alert.alert('Saved', `Journal entry saved for ${selectedDate}`);
  };

  const handleGenerateAI = async () => {
    setLoadingAi(true);
    const score = calculateDailyScore(selectedDate);

    const insight = await generateDailyReflectionInsight(
      selectedDate,
      { gratitude: morningGratitude, nonNegotiable: dailyNonNegotiable, identity: identityAffirmation },
      { win: eveningWin, greenlight: greenlightMoment, honesty: unforgivingHonesty },
      score
    );

    setAiInsight(insight);
    setLoadingAi(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Date Navigation Bar */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDateByDays(-1)}>
          <Text style={styles.dateBtnText}>◀ Prev Day</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDateByDays(1)}>
          <Text style={styles.dateBtnText}>Next Day ▶</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>☀️ Morning Intentions</Text>
      <Text style={styles.label}>Morning Gratitude</Text>
      <TextInput style={styles.input} value={morningGratitude} onChangeText={setMorningGratitude} placeholder="What are you grateful for today?" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Daily Non-Negotiable</Text>
      <TextInput style={styles.input} value={dailyNonNegotiable} onChangeText={setDailyNonNegotiable} placeholder="What must get done today?" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Identity Affirmation</Text>
      <TextInput style={styles.input} value={identityAffirmation} onChangeText={setIdentityAffirmation} placeholder="Who are you choosing to be today?" placeholderTextColor="#64748b" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>🌙 Evening Audit & Greenlights</Text>
      <Text style={styles.label}>Evening Win</Text>
      <TextInput style={styles.input} value={eveningWin} onChangeText={setEveningWin} placeholder="What was your primary win today?" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Greenlight Moment</Text>
      <TextInput style={styles.input} value={greenlightMoment} onChangeText={setGreenlightMoment} placeholder="Where did life turn a yellow light green?" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Unforgiving Honesty / Reflection</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={unforgivingHonesty} onChangeText={setUnforgivingHonesty} placeholder="Where did you create friction or avoid truth?" placeholderTextColor="#64748b" />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveJournal}>
          <Text style={styles.saveBtnText}>Save Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.aiBtn} onPress={handleGenerateAI} disabled={loadingAi}>
          {loadingAi ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.aiBtnText}>🤖 AI Feedback</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* AI Feedback Output Card */}
      {aiInsight !== '' && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>🤖 AI Coach Analysis</Text>
          <Text style={styles.aiText}>{aiInsight}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#1e293b', padding: 12, borderRadius: 8 },
  dateBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  dateBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },
  dateText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#334155', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
  aiBtn: { flex: 1, backgroundColor: '#38bdf8', padding: 14, borderRadius: 8, alignItems: 'center' },
  aiBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  aiCard: { backgroundColor: '#1e293b', borderColor: '#38bdf8', borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 20 },
  aiTitle: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  aiText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
});