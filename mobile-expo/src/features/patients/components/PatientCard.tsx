import type { Patient } from '@xiehe/api-contracts';
import { getPatientSearchDisplay } from '@xiehe/patient-core';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Icon, Tag } from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';

export function PatientCard({ patient }: { patient: Patient }) {
  const display = getPatientSearchDisplay(patient);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看患者 ${patient.name}`}
      onPress={() =>
        router.push({ pathname: '/patients/[id]', params: { id: patient.id } })
      }
    >
      <Card>
        <View style={layout.row}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: patient.gender === '女' ? '#FDF0F6' : '#EEF4FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name="person-outline"
              color={patient.gender === '女' ? '#DB6CA0' : '#5985DD'}
              size={23}
            />
          </View>
          <View style={[layout.flex, { gap: 6 }]}>
            <View style={layout.row}>
              <Text style={layout.heading}>{display.primary}</Text>
              <Tag text={display.meta.join(' · ')} tone="muted" />
            </View>
            <Text style={layout.muted}>{patient.patient_id}</Text>
          </View>
          <Icon name="chevron-forward" color={colors.faint} size={17} />
        </View>
        <View style={layout.divider} />
        <View style={layout.between}>
          <Text style={layout.muted}>{display.secondary}</Text>
          <Tag text="查看档案" />
        </View>
      </Card>
    </Pressable>
  );
}
