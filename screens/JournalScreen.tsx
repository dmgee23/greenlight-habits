import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../db/schema';
import { calculateDailyScore } from '../services/habitEngine';

export default function JournalScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [morningGratitude, setMorningGratitude] = useState('');
  const [dailyNonNegotiable, setDailyNonNegotiable] = useState('');
  const [identityAffirmation, setIdentityAffirmation] = useState('');
  
  const [eveningWin, setEveningWin] = useState('');
  const [greenlightMoment, setGreenlightMoment] = useState('');
  const [unforgivingHonesty, setUnforgivingHonesty] = useState('');

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

  const handleSaveMarkdownFile = async () => {
    handleSaveJournal();
    const score = calculateDailyScore(selectedDate);

    const markdownContent = `# Daily Journal: ${selectedDate}

## 📊 Daily Success Score: ${score}%

### ☀️ Morning Intentions
- **Gratitude:** ${morningGratitude || 'N/A'}
- **Daily Non-Negotiable:** ${dailyNonNegotiable || 'N/A'}
- **Identity Affirmation:** ${identityAffirmation || 'N/A'}

### 🌙 Evening Audit & Greenlights
- **Evening Win:** ${eveningWin || 'N/A'}
- **Greenlight Moment:** ${greenlightMoment || 'N/A'}
- **Unforgiving Honesty / Reflection:** ${unforgivingHonesty || 'N/A'}

---
*Generated via Greenlight Habits App*
`;

    try {
      const fileName = `Journal_${selectedDate}.md`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, markdownContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/markdown',
          dialogTitle: 'Save Journal Markdown File',
          UTI: 'public.plain-text',
        });
      } else {
        Alert.alert('Saved Locally', `File saved to local storage: ${fileName}`);
      }
    } catch (error) {
      console.error('Error saving markdown file:', error);
      Alert.alert('Error', 'Failed to generate markdown file.');
    }
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
      </View>

      <TouchableOpacity style={styles.mdBtn} onPress={handleSaveMarkdownFile}>
        <Text style={styles.mdBtnText}>📄 Save .MD File</Text>
      </TouchableOpacity>

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
  mdBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  mdBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});