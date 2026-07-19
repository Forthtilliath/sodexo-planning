import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import CornerPicker from '@/components/CornerPicker';
import GridEditor from '@/components/GridEditor';
import { saveScan } from '@/lib/db';
import { assignBlocksToGrid, recognizeWords, type Point } from '@/lib/ocr';
import type { ScanRecord } from '@/types';

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDays(year: number, month: number, startDay: number, count: number): string[] {
  const days: string[] = [];
  const date = new Date(Date.UTC(year, month - 1, startDay));
  for (let i = 0; i < count; i++) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

type Step = 'photo' | 'setup' | 'corners' | 'review';

export default function ScannerScreen() {
  const [step, setStep] = useState<Step>('photo');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [startDay, setStartDay] = useState('1');
  const [dayCount, setDayCount] = useState('31');
  const [employeesText, setEmployeesText] = useState('');

  const [corners, setCorners] = useState<{ topLeft: Point; bottomRight: Point } | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);

  const employeesPreview = useMemo(
    () =>
      employeesText
        .split('\n')
        .map((e) => e.trim())
        .filter(Boolean),
    [employeesText]
  );

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorise l'accès aux photos pour scanner le tableau.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStep('setup');
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorise l'accès à l'appareil photo pour scanner le tableau.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStep('setup');
    }
  }

  function confirmSetup() {
    if (employeesPreview.length === 0) {
      Alert.alert('Employés manquants', "Ajoute au moins un nom d'employé (un par ligne).");
      return;
    }
    const count = Number(dayCount);
    if (!count || count <= 0) {
      Alert.alert('Nombre de jours invalide', 'Indique un nombre de jours (colonnes) supérieur à 0.');
      return;
    }
    setEmployees(employeesPreview);
    setDays(buildDays(Number(year), Number(month), Number(startDay), count));
    setGrid(employeesPreview.map(() => Array(count).fill('')));
    setCorners(null);
    setStep('corners');
  }

  async function runOcr() {
    if (!imageUri || !corners) return;
    setOcrRunning(true);
    setOcrError(null);
    try {
      const words = await recognizeWords(imageUri);
      const prefilled = assignBlocksToGrid(words, corners.topLeft, corners.bottomRight, employees.length, days.length);
      setGrid(prefilled);
    } catch {
      setOcrError(
        "OCR indisponible sur ce build (Expo Go ne supporte pas ML Kit). Remplis la grille manuellement ci-dessous, ou utilise un build avec dev client."
      );
    } finally {
      setOcrRunning(false);
      setStep('review');
    }
  }

  function updateEmployee(rowIndex: number, value: string) {
    setEmployees((prev) => prev.map((e, i) => (i === rowIndex ? value : e)));
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setGrid((prev) =>
      prev.map((row, r) => (r === rowIndex ? row.map((c, cI) => (cI === colIndex ? value : c)) : row))
    );
  }

  async function handleSave() {
    const scan: ScanRecord = {
      id: randomId(),
      year: Number(year),
      month: Number(month),
      createdAt: Date.now(),
      days,
      employees,
      grid: grid.map((row) => row.map((cell) => cell.trim().toUpperCase())),
    };
    await saveScan(scan);
    Alert.alert('Scan enregistré', 'Tu peux le consulter dans "Mon planning".', [
      {
        text: 'OK',
        onPress: () => {
          reset();
          router.push('/planning');
        },
      },
    ]);
  }

  function reset() {
    setStep('photo');
    setImageUri(null);
    setCorners(null);
    setEmployeesText('');
    setEmployees([]);
    setDays([]);
    setGrid([]);
    setOcrError(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scanner un planning</Text>

      {step === 'photo' && (
        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>📷 Prendre une photo</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>🖼️ Choisir dans la galerie</Text>
          </Pressable>
        </View>
      )}

      {imageUri && step !== 'photo' && (
        <>
          <Text style={styles.sectionTitle}>1. Informations du mois</Text>
          <View style={styles.row}>
            <LabeledInput label="Année" value={year} onChangeText={setYear} />
            <LabeledInput label="Mois" value={month} onChangeText={setMonth} />
          </View>
          <View style={styles.row}>
            <LabeledInput label="Jour de départ" value={startDay} onChangeText={setStartDay} />
            <LabeledInput label="Nb de jours" value={dayCount} onChangeText={setDayCount} />
          </View>

          <Text style={styles.sectionTitle}>
            2. Employés (un nom par ligne, dans l'ordre des lignes de la photo)
          </Text>
          <TextInput
            style={styles.employeesInput}
            value={employeesText}
            onChangeText={setEmployeesText}
            multiline
            placeholder={'PETIT HUGO\nLEROY PAUL\n...'}
          />
          <Text style={styles.hint}>{employeesPreview.length} employé(s) détecté(s)</Text>

          {step === 'setup' && (
            <Pressable style={styles.primaryButton} onPress={confirmSetup}>
              <Text style={styles.primaryButtonText}>Valider et caler la grille</Text>
            </Pressable>
          )}

          {(step === 'corners' || step === 'review') && (
            <>
              <Text style={styles.sectionTitle}>3. Calage de la grille sur la photo</Text>
              <CornerPicker
                imageUri={imageUri}
                onConfirm={(topLeft, bottomRight) => setCorners({ topLeft, bottomRight })}
              />

              {step === 'corners' && (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.primaryButton, !corners && styles.buttonDisabled]}
                    disabled={!corners || ocrRunning}
                    onPress={runOcr}>
                    {ocrRunning ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Lancer l'OCR</Text>
                    )}
                  </Pressable>
                  <Pressable style={styles.button} onPress={() => setStep('review')}>
                    <Text style={styles.buttonText}>Remplir à la main</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {step === 'review' && (
            <>
              {ocrError && <Text style={styles.errorText}>{ocrError}</Text>}
              <Text style={styles.sectionTitle}>4. Vérifie / corrige la grille</Text>
              <GridEditor
                days={days}
                employees={employees}
                grid={grid}
                onChangeEmployee={updateEmployee}
                onChangeCell={updateCell}
              />
              <Pressable style={styles.primaryButton} onPress={handleSave}>
                <Text style={styles.primaryButtonText}>Enregistrer ce scan</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Recommencer</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.labeledInput}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType="number-pad" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  labeledInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 8,
  },
  employeesInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  errorText: {
    color: '#a33',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#a33',
  },
});
