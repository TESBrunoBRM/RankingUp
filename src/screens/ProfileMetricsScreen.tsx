import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ProfilePage, createProfileStyles } from '../components/ProfilePage';
import { Button } from '../components/Button';
import { SafetyNotice } from '../components/SafetyNotice';
import { rankingUpApiClient } from '../services/rankingUpApiClient';
import { useEnabledFeatures } from '../store/experienceStore';
import { useThemedStyles } from '../theme';
import { getErrorMessage } from '../utils/errors';
import type { GenderType, GoalType } from '../types';

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'bajar', label: 'Bajar' },
  { value: 'mantener', label: 'Mantener' },
  { value: 'subir', label: 'Subir' },
];

export default function ProfileMetricsScreen() {
  const styles = useThemedStyles(createProfileStyles);
  const { nutrition } = useEnabledFeatures();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderType>('hombre');
  const [goal, setGoal] = useState<GoalType>('mantener');
  const [target, setTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { profile } = await rankingUpApiClient.getOwnProfile();
      setWeight(profile.weight?.toString() ?? '');
      setHeight(profile.height?.toString() ?? '');
      setAge(profile.age?.toString() ?? '');
      setGender(profile.gender ?? 'hombre');
      setGoal(profile.goal ?? 'mantener');
      setTarget(profile.targetCalories ?? null);
      setLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar tus datos.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const changed = () => {
    setSaved(false);
    setTarget(null);
  };
  const save = async () => {
    const weightValue = Number(weight.replace(',', '.'));
    const heightValue = Number(height.replace(',', '.'));
    const ageValue = Number(age);
    if (
      !Number.isFinite(weightValue) ||
      weightValue < 30 ||
      weightValue > 300 ||
      !Number.isFinite(heightValue) ||
      heightValue < 100 ||
      heightValue > 250
    ) {
      setError('Introduce un peso entre 30 y 300 kg y una altura entre 100 y 250 cm.');
      return;
    }
    if (nutrition && (!Number.isInteger(ageValue) || ageValue < 18 || ageValue > 100)) {
      setError('Las estimaciones nutricionales están disponibles para adultos de 18 a 100 años.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await rankingUpApiClient.updateProfileMetrics({
        weight: weightValue,
        height: heightValue,
        ...(nutrition ? { age: ageValue, gender, goal } : {}),
      });
      setTarget(response.targetCalories);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron guardar tus datos.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <ProfilePage
      title="Datos físicos y objetivos"
      loading={loading}
      error={error}
      onRetry={!loaded ? () => void load() : undefined}
    >
      {loaded ? (
        <>
          <Text style={styles.description}>
            Estos datos son opcionales. Ayudan a calcular tus referencias personales y no aparecen
            en tu perfil público.
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Peso (kg)</Text>
              <TextInput
                accessibilityLabel="Peso en kilogramos"
                style={styles.input}
                value={weight}
                onChangeText={(value) => {
                  setWeight(value);
                  changed();
                }}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Altura (cm)</Text>
              <TextInput
                accessibilityLabel="Altura en centímetros"
                style={styles.input}
                value={height}
                onChangeText={(value) => {
                  setHeight(value);
                  changed();
                }}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
          </View>
          {nutrition ? (
            <>
              <View>
                <Text style={styles.label}>Edad</Text>
                <TextInput
                  accessibilityLabel="Edad"
                  style={styles.input}
                  value={age}
                  onChangeText={(value) => {
                    setAge(value);
                    changed();
                  }}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
              <View>
                <Text style={styles.label}>Sexo de referencia para la fórmula</Text>
                <View style={styles.row}>
                  {(['hombre', 'mujer'] as const).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: gender === value, disabled: saving }}
                      disabled={saving}
                      style={[styles.option, gender === value && styles.optionActive]}
                      onPress={() => {
                        setGender(value);
                        changed();
                      }}
                    >
                      <Text
                        style={[styles.optionText, gender === value && styles.optionTextActive]}
                      >
                        {value === 'hombre' ? 'Hombre' : 'Mujer'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={styles.label}>Objetivo orientativo</Text>
                <View style={styles.row}>
                  {GOALS.map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: goal === item.value, disabled: saving }}
                      disabled={saving}
                      style={[styles.option, goal === item.value && styles.optionActive]}
                      onPress={() => {
                        setGoal(item.value);
                        changed();
                      }}
                    >
                      <Text
                        style={[styles.optionText, goal === item.value && styles.optionTextActive]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {target !== null ? (
                <View style={styles.estimate}>
                  <Text style={styles.description}>Referencia diaria guardada</Text>
                  <Text style={styles.estimateValue}>{target} kcal</Text>
                  <Text style={styles.description}>
                    Es una estimación. Prioriza las indicaciones de tu profesional.
                  </Text>
                </View>
              ) : (
                <Text style={styles.description}>
                  Al guardar se calculará una referencia diaria con estos datos.
                </Text>
              )}
              <SafetyNotice kind="nutrition" />
            </>
          ) : null}
          {saved ? (
            <Text accessibilityRole="alert" style={styles.link}>
              Datos guardados
            </Text>
          ) : null}
          <Button title="Guardar datos" loading={saving} onPress={() => void save()} />
        </>
      ) : null}
    </ProfilePage>
  );
}
