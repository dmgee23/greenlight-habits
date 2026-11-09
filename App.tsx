import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal, Platform } from 'react-native';
import { initDatabase, Habit } from './db/schema';
import { getHabits, addHabit, updateHabit, completeHabit, resetToBaseline, calculateDailyScore, getWeeklyCompletionStats } from './services/habitEngine';
import JournalScreen from './screens/JournalScreen';
import { registerForPushNotificationsAsync, scheduleMorningReminder, scheduleEveningReminder } from './services/notificationService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'habits' | 'journal'>('habits');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{ dayLabel: string; count: number; date: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Modal form states & editing tracker
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUnit, setNewUnit] = useState('pages');
  const [newTargetInteger, setNewTargetInteger] = useState('2'); 
  const [newMaxGoalInteger, setNewMaxGoalInteger] = useState('25');
  const [newReminderTime, setNewReminderTime] = useState('18:30');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      initDatabase();
      loadData();
      registerForPushNotificationsAsync(Platform.OS).then(() => {
        scheduleMorningReminder();
        scheduleEveningReminder();
      });
    } catch (e) {
      console.error('Initialization error:', e);
    }
  }, []);

  const loadData = () => {
    let currentHabits = getHabits();
    if (currentHabits.length === 0) {
      addHabit({
        title: 'Read Books',
        category: 'Intellectual',
        current_target: 2,
        unit: 'pages',
        increment_rate: 0.01,
        base_target: 2,
        max_goal_integer: 25,
        reminder_time: "07:30",
      });
      currentHabits = getHabits();
    }
    setHabits(currentHabits);
    setWeeklyStats(getWeeklyCompletionStats());
  };

  const openAddModal = () => {
    setEditingHabitId(null);
    setNewTitle('');
    setNewUnit('pages');
    setNewTargetInteger('2');
    setNewMaxGoalInteger('25');
    setNewReminderTime('18:30');
    setModalVisible(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabitId(habit.id!);
    setNewTitle(habit.title);
    setNewUnit(habit.unit);
    setNewTargetInteger(habit.base_target.toString());
    setNewMaxGoalInteger(habit.max_goal_integer.toString());
    setNewReminderTime(habit.reminder_time || '18:30');
    setModalVisible(true);
  };

  const handleSaveHabit = () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a habit title.');
      return;
    }
    const baseNum = parseInt(newTargetInteger, 10) || 2;
    const maxGoalNum = parseInt(newMaxGoalInteger, 10) || 25;

    if (editingHabitId !== null) {
      // Edit existing habit
      const existing = habits.find(h => h.id === editingHabitId);
      if (existing) {
        updateHabit({
          ...existing,
          title: newTitle,
          unit: newUnit,
          base_target: baseNum,
          max_goal_integer: maxGoalNum,
          reminder_time: newReminderTime,
        });
        Alert.alert('Success', 'Habit updated successfully!');
      }
    } else {
      // Create new habit
      addHabit({
        title: newTitle,
        category: 'General',
        current_target: baseNum,
        unit: newUnit,
        increment_rate: 0.01,
        base_target: baseNum,
        max_goal_integer: maxGoalNum,
        reminder_time: newReminderTime,
      });
      Alert.alert('Success', 'New micro-habit created!');
    }

    setModalVisible(false);
    loadData();
  };

  const handleComplete = (habit: Habit) => {
    completeHabit(habit, habit.current_target, 'Logged from main view');
    Alert.alert('Greenlight!', 'Target increased for tomorrow!');
    loadData();
  };

  const handleRedLightReset = (habit: Habit) => {
    resetToBaseline(habit);
    Alert.alert('Friction Reduced', 'Habit target reset to baseline.');
    loadData();
  };

  const score = calculateDailyScore(today);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Greenlight Habits</Text>
          <Text style={styles.subtitle}>Daily Score: <Text style={styles.scoreHighlight}>{score}%</Text></Text>
        </View>
        <TouchableOpacity style={styles.addBtnHeader} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Habit</Text>
        </TouchableOpacity>
      </View>

      {/* Heatmap Card */}
      <View style={styles.heatmapCard}>
        <Text style={styles.heatmapTitle}>📊 Past 7 Days Consistency</Text>
        <View style={styles.heatmapRow}>
          {weeklyStats.map((item, index) => (
            <View key={index} style={styles.dayColumn}>
              <View 
                style={[
                  styles.daySquare, 
                  { backgroundColor: item.count > 0 ? '#22c55e' : '#334155' }
                ]} 
              />
              <Text style={styles.dayLabel}>{item.dayLabel}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Navigation Switcher */}
      <View style={styles.navRow}>
        <TouchableOpacity 
          style={[styles.navBtn, currentTab === 'habits' && styles.activeNav]} 
          onPress={() => setCurrentTab('habits')}>
          <Text style={styles.navText}>🔥 Micro-Habits</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navBtn, currentTab === 'journal' && styles.activeNav]} 
          onPress={() => setCurrentTab('journal')}>
          <Text style={styles.navText}>📓 Journal & Export</Text>
        </TouchableOpacity>
      </View>

      {currentTab === 'habits' ? (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.habitTitle}>{item.title}</Text>
                  <Text style={styles.cueBadge}>🔔 Cue Time: {item.reminder_time || 'None'}</Text>
                </View>
                <TouchableOpacity style={styles.editCardBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.editCardText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.targetText}>
                Today's Target: <Text style={styles.highlight}>{item.current_target} {item.unit}</Text>
              </Text>
              
              <View style={styles.cardSubRow}>
                <Text style={styles.goalSub}>Max Goal Limit: {item.max_goal_integer} {item.unit}</Text>
                <Text style={styles.streakBadge}>🔥 {item.streak}d streak</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item)}>
                  <Text style={styles.btnText}>Complete</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetBtn} onPress={() => handleRedLightReset(item)}>
                  <Text style={styles.resetBtnText}>Reset Red Light</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <JournalScreen />
      )}

      {/* Add / Edit Habit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingHabitId !== null ? 'Edit Micro-Habit' : 'Add Micro-Habit'}</Text>
            
            <Text style={styles.label}>Habit Name</Text>
            <TextInput 
              style={styles.input} 
              value={newTitle} 
              onChangeText={setNewTitle} 
              placeholder="e.g., Read Books" 
              placeholderTextColor="#64748b" 
            />

            <Text style={styles.label}>Starting Target (Integer Baseline)</Text>
            <TextInput 
              style={styles.input} 
              value={newTargetInteger} 
              onChangeText={setNewTargetInteger} 
              keyboardType="numeric" 
              placeholder="e.g., 2" 
              placeholderTextColor="#64748b" 
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput 
              style={styles.input} 
              value={newUnit} 
              onChangeText={setNewUnit} 
              placeholder="e.g., pages, mins" 
              placeholderTextColor="#64748b" 
            />

            <Text style={styles.label}>Max Goal Ceiling</Text>
            <TextInput 
              style={styles.input} 
              value={newMaxGoalInteger} 
              onChangeText={setNewMaxGoalInteger} 
              keyboardType="numeric" 
              placeholder="e.g., 25" 
              placeholderTextColor="#64748b" 
            />

            <Text style={styles.label}>Daily Reminder Cue (HH:MM)</Text>
            <TextInput 
              style={styles.input} 
              value={newReminderTime} 
              onChangeText={setNewReminderTime} 
              placeholder="e.g., 18:30" 
              placeholderTextColor="#64748b" 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveHabit}>
                <Text style={styles.saveModalText}>{editingHabitId !== null ? 'Save Changes' : 'Create Habit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  scoreHighlight: { color: '#22c55e', fontWeight: 'bold' },
  addBtnHeader: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13 },
  heatmapCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  heatmapTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 8 },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayColumn: { alignItems: 'center', gap: 4 },
  daySquare: { width: 32, height: 32, borderRadius: 6 },
  dayLabel: { fontSize: 11, color: '#64748b' },
  navRow: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 4, marginBottom: 16 },
  navBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeNav: { backgroundColor: '#334155' },
  navText: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitTitle: { fontSize: 20, fontWeight: '600', color: '#f8fafc' },
  cueBadge: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  editCardBtn: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  editCardText: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  streakBadge: { fontSize: 14, color: '#f59e0b', fontWeight: '500' },
  targetText: { fontSize: 16, color: '#cbd5e1', marginTop: 12 },
  cardSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalSub: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  highlight: { fontWeight: 'bold', color: '#22c55e' },
  actionRow: { flexDirection: 'row', gap: 8 },
  completeBtn: { flex: 1, backgroundColor: '#22c55e', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  resetBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  resetBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#cbd5e1', fontWeight: 'bold' },
  saveModalBtn: { flex: 1, backgroundColor: '#22c55e', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveModalText: { color: '#0f172a', fontWeight: 'bold' },
});