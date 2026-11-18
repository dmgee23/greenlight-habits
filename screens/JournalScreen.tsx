import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { db } from '../db/schema';

export default function JournalScreen() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  // Morning Intentions & Engineering Priorities
  const [gratitude, setGratitude] = useState('');
  const [nonNegotiable, setNonNegotiable] = useState('');
  const [affirmation, setAffirmation] = useState('');
  const [priority1, setPriority1] = useState('');
  const [priority2, setPriority2] = useState('');
  const [priority3, setPriority3] = useState('');

  // Evening Audit & Engineering Reflections
  const [win, setWin] = useState('');
  const [greenlight, setGreenlight] = useState('');
  const [wentRight, setWentRight] = useState('');
  const [wentWrong, setWentWrong] = useState('');
  const [doDifferent, setDoDifferent] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [relatedLinks, setRelatedLinks] = useState('');

  // Dynamic height state for text inputs to auto-expand
  const [inputHeights, setInputHeights] = useState<{ [key: string]: number }>({});

  const handleContentSizeChange = (key: string, height: number) => {
    setInputHeights(prev => ({ ...prev, [key]: Math.max(44, height) }));
  };

  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Load existing data on mount
  useEffect(() => {
    try {
      const result: any = db.getAllSync('SELECT * FROM journal_entries WHERE date = ?;', [today]);
      if (result && result.length > 0) {
        const row = result[0];
        setGratitude(row.morning_gratitude || '');
        setNonNegotiable(row.daily_non_negotiable || '');
        setAffirmation(row.identity_affirmation || '');
        setWin(row.evening_win || '');
        setGreenlight(row.greenlight_moment || '');
        
        try {
          if (row.unforgiving_honesty_reflection) {
            const extra = JSON.parse(row.unforgiving_honesty_reflection);
            setPriority1(extra.priority1 || '');
            setPriority2(extra.priority2 || '');
            setPriority3(extra.priority3 || '');
            setWentRight(extra.wentRight || '');
            setWentWrong(extra.wentWrong || '');
            setDoDifferent(extra.doDifferent || '');
            setNextActions(extra.nextActions || '');
            setRelatedLinks(extra.relatedLinks || '');
          }
        } catch (_) {}
      }
    } catch (e) {
      console.error('Error loading journal entry:', e);
    }
    setIsLoaded(true);
  }, [today]);

  // 2. Auto-save to SQLite on debounce as you type
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const extraFieldsJson = JSON.stringify({
          priority1,
          priority2,
          priority3,
          wentRight,
          wentWrong,
          doDifferent,
          nextActions,
          relatedLinks,
        });

        db.runSync(
          `INSERT INTO journal_entries 
            (date, morning_gratitude, daily_non_negotiable, identity_affirmation, evening_win, greenlight_moment, unforgiving_honesty_reflection)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
            morning_gratitude = EXCLUDED.morning_gratitude,
            daily_non_negotiable = EXCLUDED.daily_non_negotiable,
            identity_affirmation = EXCLUDED.identity_affirmation,
            evening_win = EXCLUDED.evening_win,
            greenlight_moment = EXCLUDED.greenlight_moment,
            unforgiving_honesty_reflection = EXCLUDED.unforgiving_honesty_reflection;`,
          [today, gratitude, nonNegotiable, affirmation, win, greenlight, extraFieldsJson]
        );
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 500);
  }, [gratitude, nonNegotiable, affirmation, priority1, priority2, priority3, win, greenlight, wentRight, wentWrong, doDifferent, nextActions, relatedLinks, isLoaded, today]);

  // Generate Obsidian-ready Markdown template
  const generateMarkdownExport = () => {
    return `---
date: ${today}
tags: [daily-notes, greenlight, engineering]
---

### Data: ${today}

## 🌅 Greenlight Morning Intentions
- **Gratidão:** ${gratitude || '-'}
- **#1 Inegociável:** ${nonNegotiable || '-'}
- **Afirmação de Identidade:** ${affirmation || '-'}

## 🎯 Top 3 Prioridades & Tarefas
- [ ] ${priority1 || '(Prioridade 1)'}
- [ ] ${priority2 || '(Prioridade 2)'}
- [ ] ${priority3 || '(Prioridade 3)'}

## 🔄 Reflexão & Engenharia
### O que deu certo?
${wentRight || win || '- '}

### O que deu errado?
${wentWrong || '- '}

### O que posso fazer diferente?
${doDifferent || '- '}

## 🌇 Greenlight Evening Audit
- **Momento Greenlight:** ${greenlight || '-'}

## 📋 Próximas Ações & Manutenção
${nextActions || '- '}

## 🔗 Links Relacionados
${relatedLinks || '- '}
`;
  };

  const handleCopyExport = async () => {
    const markdown = generateMarkdownExport();
    await Clipboard.setStringAsync(markdown);
    Alert.alert('Copiado!', 'O resumo do diário foi copiado para a área de transferência.');
  };

  const handleExportMdFile = async () => {
    try {
      const markdownContent = generateMarkdownExport();
      const fileName = `${today}.md`;

      const mdFile = new File(Paths.cache, fileName);
      mdFile.write(markdownContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(mdFile.uri, {
          mimeType: 'text/markdown',
          dialogTitle: `Salvar ou Compartilhar ${fileName}`,
          UTI: 'public.plain-text',
        });
      } else {
        Alert.alert('Salvo!', `Arquivo gerado em: ${mdFile.uri}`);
      }
    } catch (error: any) {
      console.error('Erro ao gerar arquivo .md:', error);
      Alert.alert('Erro', `Não foi possível gerar o arquivo: ${error?.message || error}`);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0f172a' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>📓 Diário Integrado</Text>
        <Text style={styles.dateSubtitle}>Data: {today} (Auto-salvando no SQLite)</Text>

        {/* Morning Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>☀️ Morning Intentions</Text>

          <Text style={styles.label}>1. What am I grateful for today?</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['gratitude'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('gratitude', e.nativeEvent.contentSize.height)}
            value={gratitude} 
            onChangeText={setGratitude} 
            placeholder="3 quick wins or things..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>2. The #1 Non-Negotiable Goal</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['nonNegotiable'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('nonNegotiable', e.nativeEvent.contentSize.height)}
            value={nonNegotiable} 
            onChangeText={setNonNegotiable} 
            placeholder="If only 1 thing gets done today..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>3. Identity Affirmation</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['affirmation'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('affirmation', e.nativeEvent.contentSize.height)}
            value={affirmation} 
            onChangeText={setAffirmation} 
            placeholder="I am the type of person who..." 
            placeholderTextColor="#64748b" 
          />
        </View>

        {/* Engineering Top 3 Priorities */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🎯 Top 3 Prioridades & Tarefas</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['p1'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('p1', e.nativeEvent.contentSize.height)}
            value={priority1} 
            onChangeText={setPriority1} 
            placeholder="1. Prioridade principal..." 
            placeholderTextColor="#64748b" 
          />
          <TextInput 
            style={[styles.input, { height: inputHeights['p2'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('p2', e.nativeEvent.contentSize.height)}
            value={priority2} 
            onChangeText={setPriority2} 
            placeholder="2. Segunda prioridade..." 
            placeholderTextColor="#64748b" 
          />
          <TextInput 
            style={[styles.input, { height: inputHeights['p3'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('p3', e.nativeEvent.contentSize.height)}
            value={priority3} 
            onChangeText={setPriority3} 
            placeholder="3. Terceira prioridade..." 
            placeholderTextColor="#64748b" 
          />
        </View>

        {/* Engineering & Evening Audit Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌙 Evening Audit & Reflexão</Text>

          <Text style={styles.label}>Today's Big Win / O que deu certo?</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['wentRight'] || 80 }]} 
            multiline 
            onContentSizeChange={(e) => handleContentSizeChange('wentRight', e.nativeEvent.contentSize.height)}
            value={wentRight} 
            onChangeText={setWentRight} 
            placeholder="What went well / Descreva o que funcionou..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>O que deu errado?</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['wentWrong'] || 80 }]} 
            multiline 
            onContentSizeChange={(e) => handleContentSizeChange('wentWrong', e.nativeEvent.contentSize.height)}
            value={wentWrong} 
            onChangeText={setWentWrong} 
            placeholder="Imprevistos ou falhas..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>O que posso fazer diferente?</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['doDifferent'] || 80 }]} 
            multiline 
            onContentSizeChange={(e) => handleContentSizeChange('doDifferent', e.nativeEvent.contentSize.height)}
            value={doDifferent} 
            onChangeText={setDoDifferent} 
            placeholder="Ajustes e melhorias para amanhã..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>McConaughey Greenlight Moment</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['greenlight'] || 44 }]} 
            multiline
            onContentSizeChange={(e) => handleContentSizeChange('greenlight', e.nativeEvent.contentSize.height)}
            value={greenlight} 
            onChangeText={setGreenlight} 
            placeholder="Where did I turn an obstacle into progress?" 
            placeholderTextColor="#64748b" 
          />
        </View>

        {/* Next Actions & Links */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Próximas Ações & Links</Text>
          
          <Text style={styles.label}>Próximas Ações</Text>
          <TextInput 
            style={[styles.input, { height: inputHeights['nextActions'] || 80 }]} 
            multiline 
            onContentSizeChange={(e) => handleContentSizeChange('nextActions', e.nativeEvent.contentSize.height)}
            value={nextActions} 
            onChangeText={setNextActions} 
            placeholder="- Próximo passo..." 
            placeholderTextColor="#64748b" 
          />

          <Text style={styles.label}>Links Relacionados</Text>
          <TextInput 
            style={[styles.input, styles.textArea, { height: inputHeights['relatedLinks'] || 80 }]} 
            multiline 
            onContentSizeChange={(e) => handleContentSizeChange('relatedLinks', e.nativeEvent.contentSize.height)}
            value={relatedLinks} 
            onChangeText={setRelatedLinks} 
            placeholder="[[Nota do Obsidian]] ou URLs..." 
            placeholderTextColor="#64748b" 
          />
        </View>

        {/* Export Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.saveFileBtn} onPress={handleExportMdFile}>
            <Text style={styles.btnText}>💾 Exportar .md</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyExport}>
            <Text style={styles.btnText}>📋 Copiar Texto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 2 },
  dateSubtitle: { fontSize: 12, color: '#38bdf8', marginBottom: 16 },
  sectionCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155', textAlignVertical: 'top' },
  textArea: { height: 80, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 20 },
  saveFileBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 16, borderRadius: 10, alignItems: 'center' },
  copyBtn: { flex: 1, backgroundColor: '#22c55e', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
});