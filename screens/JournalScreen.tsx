import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { db } from '../db/schema';
import { calculateDailyScore } from '../services/habitEngine';

export default function JournalScreen() {
  const today = new Date().toISOString().split('T')[0];

  const [morningGratitude, setMorningGratitude] = useState('');
  const [dailyNonNegotiable, setDailyNonNegotiable] = useState('');
  const [identityAffirmation, setIdentityAffirmation] = useState('');
  
  const [eveningWin, setEveningWin] = useState('');
  const [greenlightMoment, setGreenlightMoment] = useState('');
  const [unforgivingHonesty, setUnforgivingHonesty] = useState('');

  useEffect(() => {
    loadJournal();
  }, []);

  const loadJournal = () => {
    const entry = db.getFirstSync<any>(
      `SELECT * FROM journal_entries WHERE date = ?`,
      [today]
    );
    if (entry) {
      setMorningGratitude(entry.morning_gratitude || '');
      setDailyNonNegotiable(entry.daily_non_negotiable || '');
      setIdentityAffirmation(entry.identity_affirmation || '');
      setEveningWin(entry.evening_win || '');
      setGreenlightMoment(entry.greenlight_moment || '');
      setUnforgivingHonesty(entry.unforgiving_honesty_reflection || '');
    }
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
      [today, morningGratitude, dailyNonNegotiable, identityAffirmation, eveningWin, greenlightMoment, unforgivingHonesty]
    );
    Alert.alert('Saved', 'Journal entries saved for today!');
  };

  const handleExportToObsidian = async () => {
    // Enforce the design rule: Gated export requiring both morning & evening logs
    if (!morningGratitude || !dailyNonNegotiable || !eveningWin || !greenlightMoment) {
      Alert.alert('Incomplete Journal', 'Please fill out both your Morning Intentions and Evening Audit before exporting to Obsidian.');
      return;
    }

    handleSaveJournal();
    const score = calculateDailyScore(today);

    // Construct clean Markdown formatting combining Greenlights & Bartlett frameworks
    const markdownContent = `# Daily Journal: ${today}

## 📊 Daily Success Score: ${score}%

### ☀️ Morning Intentions
- **Gratitude:** ${morningGratitude}
- **Daily Non-Negotiable:** ${dailyNonNegotiable}
- **Identity Affirmation:** ${identityAffirmation}

### 🌙 Evening Audit & Greenlights
- **Evening Win:** ${eveningWin}
- **Greenlight Moment:** ${greenlightMoment}
- **Unforgiving Honesty / Friction Review:** ${unforgivingHonesty}

---
*Generated via Greenlight Habits App*
`;

    // Format deep link for Obsidian Advanced URI
    const vaultName = 'Default'; // Change to your exact Obsidian vault name if needed
    const fileName = `Journal_${today}`;
    const encodedContent = encodeURIComponent(markdownContent);
    const obsidianUrl = `obsidian://advanced-uri?vault=${vaultName}&filepath=Journal%2F${fileName}&data=${encodedContent}&mode=overwrite`;

    try {
      const supported = await Linking.canOpenURL(obsidianUrl);
      if (supported) {
        await Linking.openURL(obsidianUrl);
        Alert.alert('Exported!', 'Successfully sent to your Obsidian vault.');
      } else {
        Alert.alert('Obsidian Error', 'Could not reach Obsidian via deep link. Ensure Obsidian is installed on your S24+.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to trigger Obsidian export.');
    }
  };

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.saveBtnText}>Save Journal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExportToObsidian}>
          <Text style={styles.exportBtnText}>Export to Obsidian 🚀</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#334155', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
  exportBtn: { flex: 1, backgroundColor: '#22c55e', padding: 14, borderRadius: 8, alignItems: 'center' },
  exportBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});