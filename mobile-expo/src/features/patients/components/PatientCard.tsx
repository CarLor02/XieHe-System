import type { Patient } from '@xiehe/api-contracts';
import { getPatientSearchDisplay } from '@xiehe/patient-core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Icon, Tag } from '../../../shared/ui';
import { GradientIcon } from '../../../shared/ui/gradient-icon';
import { colors, layout } from '../../../shared/theme';

export function PatientCard({ patient }: { patient: Patient }) {
  const display = getPatientSearchDisplay(patient);
  const open = () =>
    router.push({ pathname: '/patients/[id]', params: { id: patient.id } });
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看患者 ${patient.name}`}
        onPress={open}
        style={styles.information}
      >
        <View style={[layout.row, { gap: 6 }]}>
          <Text style={styles.name} numberOfLines={1}>
            {display.primary}
          </Text>
          <Tag
            text={display.meta[0]}
            tone={patient.gender === '女' ? 'pink' : 'primary'}
          />
        </View>
        <View style={[layout.row, { gap: 6 }]}>
          <Text style={styles.age}>{display.meta[1]}</Text>
          <Text style={styles.dot}>·</Text>
          <Icon name="call-outline" color={colors.faint} size={11} />
          <Text style={styles.phone} numberOfLines={1}>
            {patient.phone?.trim() || '未提供手机号'}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`编辑患者 ${patient.name}`}
          onPress={() =>
            router.push({
              pathname: '/patients/edit',
              params: { id: patient.id },
            })
          }
          style={styles.actionTarget}
        >
          <View style={styles.edit}>
            <Icon name="create-outline" color={colors.success} size={17} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`打开患者档案 ${patient.name}`}
          onPress={open}
          style={styles.actionTarget}
        >
          <GradientIcon
            name="eye-outline"
            colors={['#8B5CF6', '#A855F7']}
            size={32}
            iconSize={16}
            radius={8}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  information: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 2 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
  age: { fontSize: 12, fontWeight: '500', color: colors.muted },
  dot: { color: '#CBD5E1', fontSize: 12 },
  phone: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 0 },
  actionTarget: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
